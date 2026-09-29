import { NextResponse } from "next/server";
import type Stripe from "stripe";
import { createAdminClient } from "@/lib/supabase/admin";
import { stripe, syncSubscription, recordInvoicePaid, recordRefund } from "@/lib/billing/stripe";
import { accrueForInvoice } from "@/lib/commissions";

/**
 * Stripe's notifications. The ONLY place a payment changes anything here.
 *
 * Every request is signature-checked against STRIPE_WEBHOOK_SECRET before it's
 * read. An event is recorded as handled only after it succeeds, so a failure
 * returns 500 and Stripe retries; a redelivery of a handled event is a no-op.
 */
export const dynamic = "force-dynamic";

export async function POST(req: Request) {
  const secret = process.env.STRIPE_WEBHOOK_SECRET;
  const signature = req.headers.get("stripe-signature");
  if (!secret || !signature) return NextResponse.json({ error: "not configured" }, { status: 400 });

  let event: Stripe.Event;
  try {
    // The raw body, exactly as sent: the signature is over these bytes.
    event = stripe().webhooks.constructEvent(await req.text(), signature, secret);
  } catch {
    return NextResponse.json({ error: "bad signature" }, { status: 400 });
  }

  const db = createAdminClient() as any;
  const { data: seen } = await db.from("billing_events").select("stripe_event_id").eq("stripe_event_id", event.id).maybeSingle();
  if (seen) return NextResponse.json({ received: true, duplicate: true });

  try {
    switch (event.type) {
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
