import { NextResponse } from "next/server";
import type Stripe from "stripe";
import { createAdminClient } from "@/lib/supabase/admin";
import { stripe, syncSubscription, recordInvoicePaid, recordRefund } from "@/lib/billing/stripe";
import { accrueForInvoice } from "@/lib/commissions";

/**
 * Stripe's notifications. The ONLY place a payment changes anything here.
 *
 * Every request is signature-checked before it's read. An event is recorded as
 * handled only after it succeeds, so a failure returns 500 and Stripe retries;
 * a redelivery of a handled event is a no-op.
 *
 * TWO ENDPOINTS, ONE ROUTE. ShearQuery's own billing events are signed with
 * STRIPE_WEBHOOK_SECRET. Clients paying barbers happens on the barbers' own
 * Stripe accounts (lib/calendar/payments.ts), and those events only reach us
 * through a separate Connect endpoint ("events on connected accounts"), signed
 * with STRIPE_CONNECT_WEBHOOK_SECRET. A connected account's event carries
 * `account`, and is routed to the calendar — never to billing, which would
 * read a barber's haircut refund as a refund of a ShearQuery subscription.
 */
export const dynamic = "force-dynamic";

export async function POST(req: Request) {
  const secrets = [process.env.STRIPE_WEBHOOK_SECRET, process.env.STRIPE_CONNECT_WEBHOOK_SECRET].filter(Boolean) as string[];
  const signature = req.headers.get("stripe-signature");
  if (!secrets.length || !signature) return NextResponse.json({ error: "not configured" }, { status: 400 });

  // The raw body, exactly as sent: the signature is over these bytes.
  const body = await req.text();
  let event: Stripe.Event | null = null;
  for (const secret of secrets) {
    try {
      event = stripe().webhooks.constructEvent(body, signature, secret);
      break;
    } catch {
      /* try the other endpoint's secret */
    }
  }
  if (!event) return NextResponse.json({ error: "bad signature" }, { status: 400 });

  const db = createAdminClient() as any;
  const { data: seen } = await db.from("billing_events").select("stripe_event_id").eq("stripe_event_id", event.id).maybeSingle();
  if (seen) return NextResponse.json({ received: true, duplicate: true });

  try {
    if (event.account) await handleConnectedAccountEvent(event, event.account);
    else switch (event.type) {
      case "checkout.session.completed": {
        const s = event.data.object;
        const sub = typeof s.subscription === "string" ? s.subscription : s.subscription?.id;
        if (sub) await syncSubscription(sub);
        break;
      }
      case "customer.subscription.created":
      case "customer.subscription.updated":
      case "customer.subscription.deleted":
        await syncSubscription(event.data.object.id);
        break;
      case "invoice.paid":
        await recordInvoicePaid(event.data.object);
        // The agency's commission on it, if the client was credited to one.
        if (event.data.object.id) await accrueForInvoice(event.data.object.id);
        break;
      case "charge.refunded": {
        const invoiceId = await recordRefund(event.data.object);
        // A refund lowers the commission, or takes it back from the next payout.
        if (invoiceId) await accrueForInvoice(invoiceId);
        break;
      }
      default:
        break;
    }
  } catch (err) {
    console.error(`[stripe] ${event.type} ${event.id} failed:`, err);
    return NextResponse.json({ error: "handler failed" }, { status: 500 });
  }

  await db.from("billing_events").insert({ stripe_event_id: event.id, type: event.type });
  return NextResponse.json({ received: true });
}

/** A client paying a barber on the barber's own Stripe account (lib/calendar/payments.ts). */
async function handleConnectedAccountEvent(event: Stripe.Event, account: string) {
  const { syncCheckoutSession, syncRefundFromCharge } = await import("@/lib/calendar/payments");
  switch (event.type) {
    case "checkout.session.completed":
    case "checkout.session.async_payment_succeeded":
    case "checkout.session.expired":
      await syncCheckoutSession(event.data.object.id, account);
      break;
    case "charge.refunded":
      await syncRefundFromCharge(event.data.object, account);
      break;
    default:
      break;
  }
}
