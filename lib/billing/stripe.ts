import "server-only";
import Stripe from "stripe";
import { createAdminClient } from "@/lib/supabase/admin";
import { isAdminEmail } from "@/lib/admin-allowlist";
import { storedAudience, AUDIENCES, type AudienceId } from "@/lib/audiences";
import { PLAN_LABEL, PRICES, hasPaidPlans, isPlan, type Plan } from "@/lib/plans";
import { LIVE_STATUSES, lookupKey, planFromSubscriptions } from "@/lib/billing/rules";

/**
 * Billing with Stripe, used directly (the product owner's own Stripe account).
 *
 * STRIPE IS THE SOURCE OF TRUTH FOR MONEY. The site's copy —
 * billing_subscriptions, billing_payments and the member's plan — is written
 * only from what Stripe says, in syncSubscription and recordInvoicePaid, which
 * the webhook calls. Nothing here sets a plan because a checkout page was
 * visited; only a subscription Stripe reports as live does.
 *
 * Field names were read from the installed stripe package's types (API
 * 2026-08-26.dahlia), not recalled: the billing period is on each
 * subscription ITEM, and an invoice's subscription is under
 * parent.subscription_details. Both moved in 2025.
 */

const db = () => createAdminClient() as any;

let client: Stripe | null = null;
export function stripe(): Stripe {
  const key = process.env.STRIPE_SECRET_KEY;
  if (!key) throw new Error("STRIPE_SECRET_KEY is not set.");
  return (client ??= new Stripe(key));
}

export const billingConfigured = () => !!process.env.STRIPE_SECRET_KEY;
export const isTestMode = () => /^(sk|rk)_test_/.test(process.env.STRIPE_SECRET_KEY || "");

/**
 * Whether this person may start a checkout. Admins always can, so it can be
 * tested; everyone else once BILLING_OPEN=true. Until then the site says
 * checkout isn't open, which stays true.
 */
export const checkoutOpenFor = (email?: string | null) =>
  billingConfigured() && (process.env.BILLING_OPEN === "true" || isAdminEmail(email));

// ── prices ──────────────────────────────────────────────────────────────────

/** The Stripe price for a plan and account type, created the first time it's needed (lookup key: rules.ts). */
export async function ensurePrice(type: AudienceId, plan: Exclude<Plan, "free">): Promise<string> {
  const dollars = PRICES[type]?.[plan];
  if (!dollars) throw new Error(`No ${plan} price for ${type}.`);
  const key = lookupKey(type, plan, dollars);
  const s = stripe();
  const found = await s.prices.list({ lookup_keys: [key], active: true, limit: 1 });
  if (found.data[0]) return found.data[0].id;

  const product = await s.products.create({
    name: `ShearQuery ${PLAN_LABEL[plan]} — ${AUDIENCES[type].label}`,
    metadata: { account_type: type, plan },
  });
  try {
    const price = await s.prices.create({
      product: product.id,
      currency: "usd",
      unit_amount: dollars * 100,
      recurring: { interval: "month" },
      lookup_key: key,
      metadata: { account_type: type, plan },
    });
    return price.id;
  } catch (e) {
    // Another request made it first; use theirs.
    const again = await s.prices.list({ lookup_keys: [key], active: true, limit: 1 });
    if (again.data[0]) return again.data[0].id;
    throw e;
  }
}

// ── customers and checkout ──────────────────────────────────────────────────

async function memberRow(memberId: string) {
  const { data } = await db()
    .from("community_members")
    .select("id, email, first_name, last_name, audience, plan, plan_source, stripe_customer_id, is_demo")
    .eq("id", memberId)
    .maybeSingle();
  return data;
}

async function customerFor(member: any): Promise<string> {
  if (member.stripe_customer_id) return member.stripe_customer_id;
  const customer = await stripe().customers.create({
    email: member.email,
    name: [member.first_name, member.last_name].filter(Boolean).join(" ") || undefined,
    metadata: { member_id: member.id },
  });
  // Conditional, so two tabs can't give one member two customers on our side.
  const { data } = await db()
    .from("community_members")
    .update({ stripe_customer_id: customer.id })
    .eq("id", member.id)
    .is("stripe_customer_id", null)
    .select("stripe_customer_id");
  if (data?.length) return customer.id;
  return (await memberRow(member.id)).stripe_customer_id;
}

export async function liveSubscription(memberId: string) {
  const { data } = await db()
    .from("billing_subscriptions")
    .select("stripe_subscription_id, plan, status, current_period_end, cancel_at_period_end, amount_cents")
    .eq("community_member_id", memberId)
    .in("status", LIVE_STATUSES)
    .order("updated_at", { ascending: false })
    .limit(1)
    .maybeSingle();
  return data;
}

type Result = { ok: true; url: string } | { ok: false; error: string };

export async function startCheckout(memberId: string, plan: unknown, origin: string): Promise<Result> {
  if (plan !== "manage" && plan !== "autopilot") return { ok: false, error: "Pick Manage or Autopilot." };
  const member = await memberRow(memberId);
  if (!member || member.is_demo) return { ok: false, error: "No such account." };
  if (!checkoutOpenFor(member.email)) return { ok: false, error: "Paid plans aren't open for checkout yet." };
  const type = storedAudience(member.audience);
  if (!type || !hasPaidPlans(type)) return { ok: false, error: "This account type is always free." };
  if (await liveSubscription(memberId)) return { ok: false, error: "This account already has a plan. Change it instead of starting a new one." };

  const session = await stripe().checkout.sessions.create({
    mode: "subscription",
    customer: await customerFor(member),
    client_reference_id: memberId,
    line_items: [{ price: await ensurePrice(type, plan), quantity: 1 }],
    // Founding-member discounts are Stripe promotion codes.
    allow_promotion_codes: true,
    subscription_data: { metadata: { member_id: memberId, plan, account_type: type } },
    metadata: { member_id: memberId, plan, account_type: type },
    success_url: `${origin}/account/plan?checkout=done`,
    cancel_url: `${origin}/account/plan?checkout=cancelled`,
  });
  return session.url ? { ok: true, url: session.url } : { ok: false, error: "Stripe didn't return a checkout page." };
}

/** Move a live subscription between Manage and Autopilot, prorated. The webhook updates the plan. */
export async function changePlan(memberId: string, plan: unknown): Promise<{ ok: true } | { ok: false; error: string }> {
  if (plan !== "manage" && plan !== "autopilot") return { ok: false, error: "Pick Manage or Autopilot." };
  const member = await memberRow(memberId);
  const type = storedAudience(member?.audience);
  if (!member || !type || !hasPaidPlans(type)) return { ok: false, error: "This account type is always free." };
  const live = await liveSubscription(memberId);
  if (!live) return { ok: false, error: "There's no plan to change. Start one instead." };
  if (live.plan === plan) return { ok: false, error: `Already on ${PLAN_LABEL[plan]}.` };

  const s = stripe();
  const sub = await s.subscriptions.retrieve(live.stripe_subscription_id);
  const item = sub.items.data[0];
  await s.subscriptions.update(sub.id, {
    items: [{ id: item.id, price: await ensurePrice(type, plan) }],
    proration_behavior: "create_prorations",
    metadata: { ...sub.metadata, plan },
  });
  await syncSubscription(sub.id);
  return { ok: true };
}

/** Stripe's own page for card details, invoices and cancelling. */
export async function billingPortal(memberId: string, origin: string): Promise<Result> {
  const member = await memberRow(memberId);
  if (!member?.stripe_customer_id) return { ok: false, error: "No billing account yet." };
  const session = await stripe().billingPortal.sessions.create({ customer: member.stripe_customer_id, return_url: `${origin}/account/plan` });
  return { ok: true, url: session.url };
}

// ── what Stripe tells us (webhook) ──────────────────────────────────────────

async function memberForCustomer(customerId: string, metadataMemberId?: string | null): Promise<string | null> {
  if (metadataMemberId && /^[0-9a-f-]{36}$/i.test(metadataMemberId)) {
    const { data } = await db().from("community_members").select("id").eq("id", metadataMemberId).maybeSingle();
    if (data) return data.id;
  }
  const { data } = await db().from("community_members").select("id").eq("stripe_customer_id", customerId).maybeSingle();
  return data?.id ?? null;
}

/**
 * Copy a subscription from Stripe, then set the member's plan from ALL their
 * live subscriptions. Re-reads Stripe rather than trusting the event body, so
 * events arriving out of order still end at Stripe's current state.
 */
export async function syncSubscription(subscriptionId: string) {
  const sub = await stripe().subscriptions.retrieve(subscriptionId);
  const customerId = typeof sub.customer === "string" ? sub.customer : sub.customer.id;
  const memberId = await memberForCustomer(customerId, sub.metadata?.member_id);
  if (!memberId) {
    console.error(`[billing] subscription ${sub.id} has no matching member`);
    return;
  }
  const item = sub.items.data[0];
  const plan = isPlan(sub.metadata?.plan) && sub.metadata.plan !== "free" ? sub.metadata.plan : null;
  if (!plan) {
    console.error(`[billing] subscription ${sub.id} has no plan in its metadata`);
    return;
  }

  await db().from("billing_subscriptions").upsert(
    {
      stripe_subscription_id: sub.id,
      community_member_id: memberId,
      stripe_customer_id: customerId,
      plan,
      status: sub.status,
      stripe_price_id: item?.price?.id ?? null,
      amount_cents: item?.price?.unit_amount ?? null,
      current_period_end: item?.current_period_end ? new Date(item.current_period_end * 1000).toISOString() : null,
      cancel_at_period_end: sub.cancel_at_period_end,
      updated_at: new Date().toISOString(),
    },
    { onConflict: "stripe_subscription_id" }
  );
  await applyPlan(memberId);
}

/**
 * The member's plan is their best live subscription, or Free. A plan an admin
 * set by hand (plan_source 'admin') is never overwritten by billing.
 * past_due keeps the plan while Stripe retries the card; canceled, unpaid and
 * incomplete_expired drop to Free.
 */
async function applyPlan(memberId: string) {
  const { data: subs } = await db().from("billing_subscriptions").select("plan, status").eq("community_member_id", memberId);
  const plan: Plan = planFromSubscriptions(subs || []);
  await db()
    .from("community_members")
    .update({ plan, plan_source: "billing", plan_updated_at: new Date().toISOString() })
    .eq("id", memberId)
    .in("plan_source", ["default", "billing"]);
}

export async function recordInvoicePaid(invoice: Stripe.Invoice) {
  const details = invoice.parent?.subscription_details;
  const subscriptionId = details?.subscription ? (typeof details.subscription === "string" ? details.subscription : details.subscription.id) : null;
  const customerId = typeof invoice.customer === "string" ? invoice.customer : invoice.customer?.id;
  if (!customerId || !invoice.id) return;
  const memberId = await memberForCustomer(customerId, details?.metadata?.member_id);
  await db().from("billing_payments").upsert(
    {
      stripe_invoice_id: invoice.id,
      community_member_id: memberId,
      stripe_subscription_id: subscriptionId,
      amount_paid_cents: invoice.amount_paid,
      currency: invoice.currency,
      paid_at: new Date((invoice.status_transitions?.paid_at ?? invoice.created) * 1000).toISOString(),
    },
    { onConflict: "stripe_invoice_id", ignoreDuplicates: false }
  );
}

/** A refund: record it against the invoice it paid, so commission can be taken back. */
export async function recordRefund(charge: Stripe.Charge) {
  const pi = typeof charge.payment_intent === "string" ? charge.payment_intent : charge.payment_intent?.id;
  if (!pi) return;
  const payments = await stripe().invoicePayments.list({ payment: { type: "payment_intent", payment_intent: pi }, limit: 1 });
  const inv = payments.data[0]?.invoice;
  const invoiceId = typeof inv === "string" ? inv : inv?.id;
  if (!invoiceId) return;
  await db().from("billing_payments").update({ amount_refunded_cents: charge.amount_refunded }).eq("stripe_invoice_id", invoiceId);
}
