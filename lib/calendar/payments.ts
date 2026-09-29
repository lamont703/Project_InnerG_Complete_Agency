import "server-only";
import type Stripe from "stripe";
import { createAdminClient } from "@/lib/supabase/admin";
import { stripe } from "@/lib/billing/stripe";
import { getMemberPlan } from "@/lib/member-plan";
import { planAllows } from "@/lib/plans";
import { formatLocal } from "@/lib/calendar/time";
import { getAppointment, type Provider, type Appointment } from "@/lib/calendar/store";
import {
  policyFrom, effectiveMode, bookingRefundCents, money, HOLD_MINUTES, MAX_TIP_CENTS, MIN_CHARGE_CENTS,
  type BookingPolicy, type PaymentMode, type CancelledBy,
} from "@/lib/calendar/policy";

/**
 * CLIENTS PAY THE PRO, THROUGH THE PRO'S OWN STRIPE ACCOUNT.
 *
 * Decided with the product owner on 2026-09-29 (option A): every barber or
 * salon connects their own Stripe account, and a client's deposit, payment or
 * tip is a DIRECT CHARGE on it — the pro is the seller, the money lands in
 * their Stripe balance, and refunds and disputes are theirs, handled in their
 * own full Stripe Dashboard. ShearQuery takes no fee per booking, so no
 * application fee is set.
 *
 * Connect configuration, from Stripe's docs
 * (docs.stripe.com/connect/accounts-v2/connected-account-configuration and
 * /connect/direct-charges, read 2026-09-29):
 *  - Accounts v2 with configuration.merchant and the card_payments capability
 *    (the account is the merchant of record).
 *  - dashboard "full": the pro's own Stripe Dashboard.
 *  - fees_collector "stripe": Stripe takes its processing fee from the pro.
 *  - losses_collector "stripe": negative balances are Stripe's to recover
 *    from the pro, not ShearQuery's.
 *  - Checkout Sessions created with the Stripe-Account header (stripeAccount).
 *  This is a different shape from agency payouts (lib/billing/connect.ts),
 *  which are recipients of ShearQuery's transfers.
 *
 * A booking that must be paid is inserted as 'pending_payment', which holds
 * the time (the database's overlap guard counts it), and becomes 'booked' only
 * when Stripe says the Checkout is paid — from the return page or from the
 * Connect webhook, whichever comes first (syncCheckoutSession is safe to run
 * twice). An unpaid hold is released after HOLD_MINUTES.
 */

const db = () => createAdminClient() as any;

export const HOLD_RELEASED_REASON = "Payment wasn't completed in time";

// ── what a pro's clients pay ────────────────────────────────────────────────

export interface PaymentTerms {
  policy: BookingPolicy;
  /** The mode that actually applies now (none without the plan or a ready Stripe). */
  mode: PaymentMode;
  tipsAvailable: boolean;
  /** Why the pro's chosen mode isn't in effect, for the PRO to read. Null when it is. */
  notInEffect: string | null;
}

export async function paymentTerms(provider: Provider): Promise<PaymentTerms> {
  const policy = policyFrom(provider as any);
  const ready = !!provider.payments_ready && !!provider.stripe_account_id && !provider.is_demo;
  const plan = provider.community_member_id ? await getMemberPlan(provider.community_member_id) : null;
  const planOk = !!plan && planAllows(plan.plan, "booking_payments");
  const mode = effectiveMode(policy, { planAllowsPayments: planOk, paymentsReady: ready });
  let notInEffect: string | null = null;
  if (policy.payment_mode !== "none" && mode === "none") {
    notInEffect = !planOk
      ? "Deposits and full payment are on the Manage plan, so clients aren't being asked to pay."
      : "Stripe isn't ready to take card payments yet, so clients aren't being asked to pay. Finish Stripe setup.";
  }
  return { policy, mode, tipsAvailable: ready && policy.tips_enabled, notInEffect };
}

export function clampTip(raw: unknown): number {
  const n = Math.round(Number(raw) || 0);
  if (n < MIN_CHARGE_CENTS) return 0;
  return Math.min(n, MAX_TIP_CENTS);
}

// ── the pro's Stripe account ────────────────────────────────────────────────

type LinkResult = { ok: true; url: string } | { ok: false; error: string };

/** Start or resume Stripe onboarding for a pro's calendar. Returns Stripe's page to send them to. */
export async function startPaymentsSetup(provider: Provider, email: string | null, origin: string): Promise<LinkResult> {
  if (provider.is_demo) return { ok: false, error: "A demo calendar can't take real payments." };
  let accountId = provider.stripe_account_id ?? null;
  if (!accountId) {
    const account = await stripe().v2.core.accounts.create({
      display_name: provider.display_name,
      contact_email: email || undefined,
      dashboard: "full",
      identity: { country: "us" },
      defaults: { responsibilities: { fees_collector: "stripe", losses_collector: "stripe" } },
      configuration: { merchant: { capabilities: { card_payments: { requested: true } } } },
      metadata: { calendar_provider_id: provider.id },
    });
    // Conditional, so two clicks can't give one calendar two accounts on our side.
    const { data } = await db()
      .from("calendar_providers")
      .update({ stripe_account_id: account.id })
      .eq("id", provider.id)
      .is("stripe_account_id", null)
      .select("stripe_account_id");
    if (data?.length) accountId = account.id;
    else {
      const { data: row } = await db().from("calendar_providers").select("stripe_account_id").eq("id", provider.id).single();
      accountId = row.stripe_account_id;
    }
  }
  const link = await stripe().v2.core.accountLinks.create({
    account: accountId!,
    use_case: {
      type: "account_onboarding",
      account_onboarding: {
        configurations: ["merchant"],
        refresh_url: `${origin}/api/calendar/payments/setup?resume=1`,
        return_url: `${origin}/account/calendar?payments=returned`,
      },
    },
  });
  return { ok: true, url: link.url };
}

/**
 * What Stripe still needs, in words a barber recognizes. Stripe names each
 * requirement by field path (identity.individual.documents.primary_verification);
 * a pro told only "setup isn't finished" has no idea it's a photo ID.
 */
function requirementLabel(path: string): string {
  if (/documents\.(primary_verification|secondary_verification)/.test(path)) return "a photo ID";
  if (/company_verification|documents\.(proof_of_registration|company)/.test(path)) return "a business document";
  if (/(id_number|ssn_last_4)/.test(path)) return "your Social Security number";
  if (/(bank_account|payout|external_account)/.test(path)) return "a bank account for payouts";
  if (/(address)/.test(path)) return "an address";
  if (/(dob|date_of_birth)/.test(path)) return "your date of birth";
  if (/(phone)/.test(path)) return "a phone number";
  if (/(url|product_description|business_profile|mcc)/.test(path)) return "details about your business";
  if (/(tos|terms_of_service|attestation)/.test(path)) return "accepting Stripe's terms";
  return "more details";
}

/** Re-read whether the pro's Stripe account can take cards, and save it. `needs` lists what Stripe is still waiting for. */
export async function refreshPaymentsStatus(provider: Provider): Promise<{ connected: boolean; ready: boolean; needs: string[] }> {
  if (!provider.stripe_account_id) return { connected: false, ready: false, needs: [] };
  const account: any = await stripe().v2.core.accounts.retrieve(provider.stripe_account_id, { include: ["configuration.merchant", "requirements"] });
  const ready = account?.configuration?.merchant?.capabilities?.card_payments?.status === "active";
  const needs = ready
    ? []
    : [...new Set<string>((account?.requirements?.entries || []).filter((e: any) => e.awaiting_action_from !== "stripe").map((e: any) => requirementLabel(String(e.description || ""))))];
  await db().from("calendar_providers").update({ payments_ready: ready, payments_checked_at: new Date().toISOString() }).eq("id", provider.id);
  provider.payments_ready = ready;
  return { connected: true, ready, needs };
}

// ── taking payment ──────────────────────────────────────────────────────────

type CheckoutResult = { ok: true; url: string; expiresAt: Date } | { ok: false; error: string };

function when(a: Appointment, tz: string) {
  return formatLocal(new Date(a.starts_at), tz);
}

/**
 * The Checkout for a booking's deposit or full payment (plus any tip), on the
 * pro's own account. Expires with the hold, so a client can't pay for a time
 * that has already been released.
 */
export async function createBookingCheckout(args: {
  provider: Provider;
  appointment: Appointment;
  mode: PaymentMode;
  dueCents: number;
  tipCents: number;
  token: string;
  origin: string;
}): Promise<CheckoutResult> {
  const { provider: p, appointment: a } = args;
  if (!p.stripe_account_id) return { ok: false, error: "This pro hasn't connected Stripe." };
  // Stripe's floor is 30 minutes after creation; a minute over it so clock drift can't trip it.
  const expiresAt = new Date(Date.now() + (HOLD_MINUTES + 1) * 60_000);
  const metadata = { kind: "calendar_booking", appointment_id: a.id, provider_id: p.id };
  const line_items: Stripe.Checkout.SessionCreateParams.LineItem[] = [
    {
      quantity: 1,
      price_data: {
        currency: "usd",
        unit_amount: args.dueCents,
        product_data: { name: `${args.mode === "full" ? "" : "Deposit: "}${a.service_name} with ${p.display_name}`, description: when(a, p.timezone) },
      },
    },
  ];
  if (args.tipCents > 0) line_items.push({ quantity: 1, price_data: { currency: "usd", unit_amount: args.tipCents, product_data: { name: `Tip for ${p.display_name}` } } });

  let session: Stripe.Checkout.Session;
  try {
    session = await stripe().checkout.sessions.create(
      {
        mode: "payment",
        line_items,
        expires_at: Math.floor(expiresAt.getTime() / 1000),
        success_url: `${args.origin}/appointments/${args.token}?paid={CHECKOUT_SESSION_ID}`,
        cancel_url: `${args.origin}/appointments/${args.token}`,
        metadata,
        payment_intent_data: { metadata, description: `${a.service_name}, ${when(a, p.timezone)} (ShearQuery booking)` },
      },
      { stripeAccount: p.stripe_account_id, idempotencyKey: `sq-booking-${a.id}` }
    );
  } catch (e: any) {
    console.error("[calendar payments] checkout create failed:", e?.message);
    return { ok: false, error: "Online payment isn't working for this pro right now. Contact them directly to book." };
  }
  const { error } = await db().from("calendar_payments").insert({
    appointment_id: a.id,
    provider_id: p.id,
    kind: "booking",
    stripe_account_id: p.stripe_account_id,
    checkout_session_id: session.id,
    service_cents: args.dueCents,
    tip_cents: args.tipCents,
    amount_cents: args.dueCents + args.tipCents,
  });
  if (error && error.code !== "23505") throw new Error(error.message);
  await db().from("calendar_appointments").update({ hold_expires_at: expiresAt.toISOString() }).eq("id", a.id);
  return { ok: true, url: session.url!, expiresAt };
}

/** The open Checkout for a booking still waiting on payment, so "Pay now" returns to it. */
export async function openBookingCheckoutUrl(appointmentId: string): Promise<string | null> {
  const { data: row } = await db()
    .from("calendar_payments")
    .select("checkout_session_id, stripe_account_id")
    .eq("appointment_id", appointmentId)
    .eq("kind", "booking")
    .eq("status", "open")
    .maybeSingle();
  if (!row) return null;
  const s = await stripe().checkout.sessions.retrieve(row.checkout_session_id, {}, { stripeAccount: row.stripe_account_id });
  return s.status === "open" ? s.url : null;
}

/** A tip after the visit (or any time), paid straight to the pro. */
export async function createTipCheckout(args: {
  provider: Provider; appointment: Appointment; tipCents: number; origin: string;
  /** The appointment link's token, to come back to it. From a client's AI there is none; they return to the pro's booking page. */
  token?: string | null;
}): Promise<CheckoutResult> {
  const { provider: p, appointment: a } = args;
  if (!p.stripe_account_id || !p.payments_ready || p.is_demo) return { ok: false, error: "This pro doesn't take tips online." };
  if (!policyFrom(p as any).tips_enabled) return { ok: false, error: "This pro doesn't take tips online." };
  const tip = clampTip(args.tipCents);
  if (!tip) return { ok: false, error: `A tip must be at least ${money(MIN_CHARGE_CENTS)}.` };
  const metadata = { kind: "calendar_tip", appointment_id: a.id, provider_id: p.id };
  let session: Stripe.Checkout.Session;
  try {
    session = await stripe().checkout.sessions.create(
      {
        mode: "payment",
        line_items: [{ quantity: 1, price_data: { currency: "usd", unit_amount: tip, product_data: { name: `Tip for ${p.display_name}`, description: `${a.service_name}, ${when(a, p.timezone)}` } } }],
        success_url: args.token ? `${args.origin}/appointments/${args.token}?tipped={CHECKOUT_SESSION_ID}` : `${args.origin}/book/${await handleFor(p.id)}`,
        cancel_url: args.token ? `${args.origin}/appointments/${args.token}` : `${args.origin}/book/${await handleFor(p.id)}`,
        metadata,
        payment_intent_data: { metadata, description: `Tip — ${a.service_name}, ${when(a, p.timezone)} (ShearQuery)` },
      },
      { stripeAccount: p.stripe_account_id }
    );
  } catch (e: any) {
    console.error("[calendar payments] tip checkout failed:", e?.message);
    return { ok: false, error: "Tips aren't working for this pro right now." };
  }
  await db().from("calendar_payments").insert({
    appointment_id: a.id, provider_id: p.id, kind: "tip", stripe_account_id: p.stripe_account_id,
    checkout_session_id: session.id, service_cents: 0, tip_cents: tip, amount_cents: tip,
  });
  return { ok: true, url: session.url!, expiresAt: new Date((session.expires_at ?? 0) * 1000) };
}

async function handleFor(providerId: string) {
  const { ensureBookingHandle } = await import("@/lib/calendar/booking-handle");
  return (await ensureBookingHandle(providerId)) ?? "";
}

// ── what Stripe says happened ───────────────────────────────────────────────

async function providerById(id: string): Promise<Provider | null> {
  const { data } = await db().from("calendar_providers").select("*").eq("id", id).maybeSingle();
  return data ?? null;
}

/** The manage-link token, read back from the session's own return URL. */
const tokenFromSession = (s: Stripe.Checkout.Session) => /\/appointments\/([A-Za-z0-9_-]{32})/.exec(s.success_url || "")?.[1] ?? null;

/**
 * Bring one Checkout's result into our records. Called from the return page
 * and the Connect webhook; the paid transition is claimed in the database, so
 * whichever arrives second does nothing.
 */
export async function syncCheckoutSession(sessionId: string, accountId: string): Promise<"paid" | "expired" | "open" | "unknown"> {
  const { data: row } = await db().from("calendar_payments").select("*").eq("checkout_session_id", sessionId).maybeSingle();
  if (!row || row.stripe_account_id !== accountId) return "unknown";
  if (row.status === "paid") return "paid";
  const s = await stripe().checkout.sessions.retrieve(sessionId, {}, { stripeAccount: accountId });

  if (s.payment_status === "paid") {
    const pi = typeof s.payment_intent === "string" ? s.payment_intent : s.payment_intent?.id ?? null;
    const { data: claimed } = await db()
      .from("calendar_payments")
      .update({ status: "paid", paid_at: new Date().toISOString(), payment_intent_id: pi, updated_at: new Date().toISOString() })
      .eq("id", row.id)
      .neq("status", "paid")
      .select("id");
    if (!claimed?.length) return "paid";
    if (row.kind === "booking") await confirmPaidBooking(row, tokenFromSession(s));
    else await tipReceived(row);
    return "paid";
  }
  if (s.status === "expired") {
    if (row.status === "open") await db().from("calendar_payments").update({ status: "expired", updated_at: new Date().toISOString() }).eq("id", row.id);
    if (row.kind === "booking") await releaseHold(row.provider_id, row.appointment_id);
    return "expired";
  }
  return "open";
}

async function confirmPaidBooking(row: any, token: string | null) {
  const provider = await providerById(row.provider_id);
  if (!provider) return;
  const { data: a } = await db().from("calendar_appointments").select("status, cancel_reason").eq("id", row.appointment_id).single();

  let live = false;
  if (a.status === "pending_payment") {
    const { data } = await db()
      .from("calendar_appointments")
      .update({ status: "booked", payment_status: "paid", hold_expires_at: null, updated_at: new Date().toISOString() })
      .eq("id", row.appointment_id)
      .eq("status", "pending_payment")
      .select("id");
    live = !!data?.length;
  } else if (a.status === "cancelled" && a.cancel_reason === HOLD_RELEASED_REASON) {
    // Paid just after the hold ran out. Take the time back if it's still free.
    const { error } = await db()
      .from("calendar_appointments")
      .update({ status: "booked", payment_status: "paid", hold_expires_at: null, cancel_reason: null, cancelled_at: null, updated_at: new Date().toISOString() })
      .eq("id", row.appointment_id);
    live = !error;
  } else if (["booked", "confirmed"].includes(a.status)) {
    await db().from("calendar_appointments").update({ payment_status: "paid" }).eq("id", row.appointment_id);
    return;
  }

  const appt = await getAppointment(row.provider_id, row.appointment_id);
  if (!appt) return;
  const { bookableProvider } = await import("@/lib/calendar/client-booking");
  const pro = (await bookableProvider(row.provider_id)) ?? { provider, listing: null, services: [] };
  const { notifyBooked, sendText } = await import("@/lib/calendar/notify");
  if (live) {
    if (appt.client?.phone) {
      const { SITE_URL } = await import("@/lib/site");
      await notifyBooked({ pro, appointment: appt, clientPhone: appt.client.phone, manageUrl: token ? `${SITE_URL}/appointments/${token}` : SITE_URL });
    }
    return;
  }
  // The time went to someone else, or the client cancelled while paying: give it all back.
  await refundPayments(row.appointment_id, { bookingShare: () => Number.MAX_SAFE_INTEGER, reason: "time no longer available" });
  if (appt.client?.phone) {
    await sendText(appt.client.phone, `Your payment for ${appt.service_name} with ${provider.display_name} came through after that time was released, so it has been refunded in full. Book again for another time.`);
  }
}

async function tipReceived(row: any) {
  const appt = await getAppointment(row.provider_id, row.appointment_id);
  const { data } = await db().from("calendar_providers").select("member:community_members(phone)").eq("id", row.provider_id).maybeSingle();
  const phone = data?.member?.phone;
  if (phone && appt) {
    const { sendText } = await import("@/lib/calendar/notify");
    await sendText(phone, `Tip on ShearQuery: ${money(row.tip_cents)} from ${appt.client?.name || "a client"} for ${appt.service_name}. It's in your Stripe balance.`);
  }
}

/** Let a held, unpaid time go: close the Checkout and free the slot. */
export async function releaseHold(providerId: string, appointmentId: string) {
  const { data: open } = await db()
    .from("calendar_payments")
    .select("id, checkout_session_id, stripe_account_id")
    .eq("appointment_id", appointmentId)
    .eq("status", "open");
  for (const r of open || []) {
    try {
      await stripe().checkout.sessions.expire(r.checkout_session_id, {}, { stripeAccount: r.stripe_account_id });
    } catch {
      /* already expired or completed — the sync below settles which */
    }
    const state = await syncCheckoutSession(r.checkout_session_id, r.stripe_account_id).catch(() => "unknown");
    if (state === "paid") return; // it was paid after all; confirmPaidBooking handled it
  }
  await db()
    .from("calendar_appointments")
    .update({ status: "cancelled", cancel_reason: HOLD_RELEASED_REASON, cancelled_at: new Date().toISOString(), payment_status: "none", hold_expires_at: null, updated_at: new Date().toISOString() })
    .eq("id", appointmentId)
    .eq("provider_id", providerId)
    .eq("status", "pending_payment");
}

/** Release every hold past its time — for one pro before offering their times, or all of them from the cron. */
export async function releaseExpiredHolds(providerId?: string) {
  let q = db().from("calendar_appointments").select("id, provider_id").eq("status", "pending_payment").lt("hold_expires_at", new Date().toISOString()).limit(25);
  if (providerId) q = q.eq("provider_id", providerId);
  const { data } = await q;
  for (const a of data || []) {
    try {
      await releaseHold(a.provider_id, a.id);
    } catch (e: any) {
      console.error("[calendar payments] release failed:", a.id, e?.message);
    }
  }
}

// ── refunds ─────────────────────────────────────────────────────────────────

/**
 * Refund what the rules say. bookingShare gets the booking payment's service
 * part and returns how much of it goes back; tips are always returned in full,
 * because the visit they were for didn't happen.
 */
async function refundPayments(appointmentId: string, opts: { bookingShare: (serviceCents: number) => number; reason: string }): Promise<{ refundedCents: number; keptCents: number }> {
  const { data: rows } = await db().from("calendar_payments").select("*").eq("appointment_id", appointmentId).eq("status", "paid");
  let refundedCents = 0, keptCents = 0;
  for (const r of rows || []) {
    const remaining = r.amount_cents - r.refunded_cents;
    if (remaining <= 0 || !r.payment_intent_id) continue;
    const share = r.kind === "booking" ? Math.min(r.service_cents, Math.max(0, opts.bookingShare(r.service_cents))) + r.tip_cents : r.amount_cents;
    const amount = Math.min(remaining, share);
    keptCents += remaining - amount;
    if (amount <= 0) continue;
    await stripe().refunds.create(
      { payment_intent: r.payment_intent_id, amount, metadata: { appointment_id: appointmentId, reason: opts.reason } },
      { stripeAccount: r.stripe_account_id, idempotencyKey: `sq-refund-${r.id}-${r.refunded_cents}-${amount}` }
    );
    await db().from("calendar_payments").update({ refunded_cents: r.refunded_cents + amount, updated_at: new Date().toISOString() }).eq("id", r.id);
    refundedCents += amount;
  }
  await recomputePaymentStatus(appointmentId);
  return { refundedCents, keptCents };
}

async function recomputePaymentStatus(appointmentId: string) {
  const { data: rows } = await db().from("calendar_payments").select("amount_cents, refunded_cents").eq("appointment_id", appointmentId).eq("status", "paid");
  if (!rows?.length) return;
  const paid = rows.reduce((t: number, r: any) => t + r.amount_cents, 0);
  const back = rows.reduce((t: number, r: any) => t + r.refunded_cents, 0);
  const status = back <= 0 ? "paid" : back >= paid ? "refunded" : "partially_refunded";
  await db().from("calendar_appointments").update({ payment_status: status }).eq("id", appointmentId);
}

/**
 * Settle the money when a visit won't happen, under the rules the client
 * booked with. Returns a sentence for whoever cancelled, or null when nothing
 * was paid.
 */
export async function settleCancellation(args: { providerId: string; appointment: Appointment; by: CancelledBy }): Promise<string | null> {
  const { data: rows } = await db().from("calendar_payments").select("id").eq("appointment_id", args.appointment.id).eq("status", "paid").limit(1);
  if (!rows?.length) return null;
  const provider = await providerById(args.providerId);
  const policy = policyFrom((args.appointment.policy as any) ?? (provider as any));
  const minutesBefore = (new Date(args.appointment.starts_at).getTime() - Date.now()) / 60_000;
  const res = await refundPayments(args.appointment.id, {
    bookingShare: (cents) => bookingRefundCents(policy, args.by, cents, minutesBefore),
    reason: args.by === "pro" ? "cancelled by pro" : args.by === "no_show" ? "no-show" : "cancelled by client",
  });
  if (res.refundedCents && res.keptCents) return `${money(res.refundedCents)} refunded; ${money(res.keptCents)} kept under the cancellation policy.`;
  if (res.refundedCents) return `${money(res.refundedCents)} refunded to the card it was paid with.`;
  if (res.keptCents) return `No refund under the cancellation policy (${money(res.keptCents)} kept).`;
  return null;
}

/** A refund the pro made in their own Stripe Dashboard: keep our record in step. */
export async function syncRefundFromCharge(charge: Stripe.Charge, accountId: string) {
  const pi = typeof charge.payment_intent === "string" ? charge.payment_intent : charge.payment_intent?.id;
  if (!pi) return;
  const { data: row } = await db().from("calendar_payments").select("id, appointment_id, stripe_account_id").eq("payment_intent_id", pi).maybeSingle();
  if (!row || row.stripe_account_id !== accountId) return;
  await db().from("calendar_payments").update({ refunded_cents: charge.amount_refunded, updated_at: new Date().toISOString() }).eq("id", row.id);
  await recomputePaymentStatus(row.appointment_id);
}

/** One line on what's been paid, for the pro's schedule and the client's page. */
export async function paymentSummary(appointmentId: string): Promise<{ paidCents: number; tipCents: number; refundedCents: number }> {
  const { data: rows } = await db().from("calendar_payments").select("kind, amount_cents, tip_cents, refunded_cents").eq("appointment_id", appointmentId).eq("status", "paid");
  let paidCents = 0, tipCents = 0, refundedCents = 0;
  for (const r of rows || []) {
    paidCents += r.amount_cents;
    tipCents += r.tip_cents;
    refundedCents += r.refunded_cents;
  }
  return { paidCents, tipCents, refundedCents };
}

// ── the pro changing their rules ────────────────────────────────────────────

/**
 * Save a pro's payment and cancellation rules, from Claude or the settings
 * page. Turning on a deposit or full payment needs the Manage plan and a
 * Stripe account that can take cards — refused with the reason rather than
 * saved and silently not applied.
 */
export async function savePaymentRules(provider: Provider, input: Record<string, unknown>): Promise<{ ok: true; saved: string[]; terms: PaymentTerms } | { ok: false; error: string }> {
  const { parsePolicyInput } = await import("@/lib/calendar/policy");
  const parsed = parsePolicyInput(input);
  if (!parsed.ok) return parsed;
  const patch = parsed.patch;
  if (!Object.keys(patch).length) return { ok: false, error: "Nothing to change." };

  if (patch.payment_mode && patch.payment_mode !== "none") {
    const plan = provider.community_member_id ? await getMemberPlan(provider.community_member_id) : null;
    if (!plan || !planAllows(plan.plan, "booking_payments")) return { ok: false, error: "Deposits and full payment at booking are on the Manage plan." };
    if (!provider.stripe_account_id) return { ok: false, error: "Connect Stripe first, so clients' payments go to your own account." };
    const status = await refreshPaymentsStatus(provider);
    if (!status.ready) return { ok: false, error: "Stripe hasn't finished setting up your account to take cards yet. Finish Stripe setup, then turn this on." };
  }
  const { error } = await db().from("calendar_providers").update({ ...patch, updated_at: new Date().toISOString() }).eq("id", provider.id);
  if (error) return { ok: false, error: error.message.includes("payment_rules") ? "One of those values is out of range." : error.message };
  const { data: fresh } = await db().from("calendar_providers").select("*").eq("id", provider.id).single();
  return { ok: true, saved: Object.keys(patch), terms: await paymentTerms(fresh) };
}
