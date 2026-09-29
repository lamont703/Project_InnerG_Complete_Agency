/**
 * THE PRO'S RULES for payment and cancellation, as pure functions: what a
 * client owes at booking, whether they may cancel or move online, and what
 * is refunded when. No database, no Stripe — lib/calendar/payments.ts does
 * the money, lib/calendar/client-booking.ts enforces these.
 *
 * Decided with the product owner on 2026-09-29: the pro chooses no payment,
 * a deposit or full payment; every cancellation rule is theirs to set; tips
 * are allowed; ShearQuery takes no fee.
 *
 * A booking keeps the rules it was made under (calendar_appointments.policy),
 * so a pro tightening their policy can't take back a refund a client was
 * promised when they booked.
 */

export type PaymentMode = "none" | "deposit" | "full";
export type DepositKind = "percent" | "fixed";

export interface BookingPolicy {
  payment_mode: PaymentMode;
  deposit_kind: DepositKind;
  /** A percent (1–100) or a whole number of cents, by deposit_kind. */
  deposit_value: number;
  tips_enabled: boolean;
  client_can_cancel: boolean;
  client_can_reschedule: boolean;
  change_cutoff_minutes: number;
  full_refund_minutes: number;
  late_cancel_refund_percent: number;
  no_show_refund_percent: number;
  max_reschedules: number | null;
  policy_note: string | null;
}

export const DEFAULT_POLICY: BookingPolicy = {
  payment_mode: "none",
  deposit_kind: "percent",
  deposit_value: 25,
  tips_enabled: true,
  client_can_cancel: true,
  client_can_reschedule: true,
  change_cutoff_minutes: 120,
  full_refund_minutes: 1440,
  late_cancel_refund_percent: 0,
  no_show_refund_percent: 0,
  max_reschedules: null,
  policy_note: null,
};

/** Stripe's smallest US card charge. Below it, nothing is collected. */
export const MIN_CHARGE_CENTS = 50;
/** How long a time is held while the client pays. Stripe's Checkout can't expire sooner than 30 minutes. */
export const HOLD_MINUTES = 30;
export const MAX_TIP_CENTS = 50_000;

const POLICY_KEYS = Object.keys(DEFAULT_POLICY) as (keyof BookingPolicy)[];

/** The policy fields off a provider row or a stored snapshot, defaults filling any gap. */
export function policyFrom(row: Partial<Record<keyof BookingPolicy, unknown>> | null | undefined): BookingPolicy {
  const out = { ...DEFAULT_POLICY } as Record<string, unknown>;
  for (const k of POLICY_KEYS) if (row && row[k] !== undefined && row[k] !== null) out[k] = row[k];
  if (row && row.max_reschedules === null) out.max_reschedules = null;
  if (row && row.policy_note === null) out.policy_note = null;
  return out as unknown as BookingPolicy;
}

/**
 * The payment mode that actually applies. Deposits and full payment need the
 * Manage plan and a Stripe account that can take cards; without either the
 * booking takes no payment — and the pro is told why, never the client charged
 * through a half-set-up account.
 */
export function effectiveMode(policy: BookingPolicy, opts: { planAllowsPayments: boolean; paymentsReady: boolean }): PaymentMode {
  if (policy.payment_mode === "none") return "none";
  return opts.planAllowsPayments && opts.paymentsReady ? policy.payment_mode : "none";
}

/** What the client pays at booking for a service at this price. 0 = nothing to pay now. */
export function amountDueCents(policy: BookingPolicy, mode: PaymentMode, priceCents: number | null): number {
  if (mode === "none") return 0;
  let due = 0;
  if (mode === "full") due = priceCents ?? 0;
  else if (policy.deposit_kind === "fixed") due = priceCents != null ? Math.min(policy.deposit_value, priceCents) : policy.deposit_value;
  else due = priceCents != null ? Math.round((priceCents * policy.deposit_value) / 100) : 0;
  return due >= MIN_CHARGE_CENTS ? due : 0;
}

export type ChangeKind = "cancel" | "reschedule";

/** Whether a client may cancel or move this booking online right now, and if not, why. */
export function clientMayChange(
  policy: BookingPolicy,
  kind: ChangeKind,
  minutesBefore: number,
  rescheduleCount = 0
): { ok: true } | { ok: false; reason: string } {
  const contact = "Contact them directly.";
  if (kind === "cancel" && !policy.client_can_cancel) return { ok: false, reason: `This pro doesn't take cancellations online. ${contact}` };
  if (kind === "reschedule" && !policy.client_can_reschedule) return { ok: false, reason: `This pro doesn't take changes online. ${contact}` };
  if (minutesBefore < policy.change_cutoff_minutes) {
    return { ok: false, reason: `It's less than ${duration(policy.change_cutoff_minutes)} away, so it can't be ${kind === "cancel" ? "cancelled" : "moved"} online. ${contact}` };
  }
  if (kind === "reschedule" && policy.max_reschedules != null && rescheduleCount >= policy.max_reschedules) {
    return { ok: false, reason: policy.max_reschedules === 0 ? `This pro doesn't allow moving a booking online. ${contact}` : `This booking has already been moved ${rescheduleCount} time${rescheduleCount === 1 ? "" : "s"}, the most this pro allows online. ${contact}` };
  }
  return { ok: true };
}

export type CancelledBy = "client" | "pro" | "no_show";

/**
 * How much of the BOOKING payment goes back. Tips are always returned in full
 * when the visit doesn't happen — they were for a service that wasn't given.
 * A pro cancelling always refunds everything: the client did nothing wrong.
 */
export function bookingRefundCents(policy: BookingPolicy, by: CancelledBy, paidServiceCents: number, minutesBefore: number): number {
  if (paidServiceCents <= 0) return 0;
  if (by === "pro") return paidServiceCents;
  const pct = by === "no_show" ? policy.no_show_refund_percent : minutesBefore >= policy.full_refund_minutes ? 100 : policy.late_cancel_refund_percent;
  return Math.round((paidServiceCents * pct) / 100);
}

export const money = (cents: number) => `$${(cents / 100).toFixed(cents % 100 ? 2 : 0)}`;

/** "2 hours", "1 day", "90 minutes" — how the rules are said to clients. */
export function duration(minutes: number): string {
  if (minutes === 0) return "the appointment time";
  if (minutes % 1440 === 0) return `${minutes / 1440} day${minutes === 1440 ? "" : "s"}`;
  if (minutes % 60 === 0) return `${minutes / 60} hour${minutes === 60 ? "" : "s"}`;
  return `${minutes} minutes`;
}

/**
 * The rules in plain words, for clients before they book and on their
 * appointment page. priceCents names the actual amount when a service is known.
 */
export function policyLines(policy: BookingPolicy, mode: PaymentMode, priceCents?: number | null): string[] {
  const lines: string[] = [];
  if (mode === "full") lines.push(`Paid in full when you book${priceCents != null && priceCents >= MIN_CHARGE_CENTS ? ` (${money(priceCents)})` : ""}.`);
  else if (mode === "deposit") {
    const due = priceCents !== undefined ? amountDueCents(policy, mode, priceCents) : 0;
    const what = policy.deposit_kind === "percent" ? `${policy.deposit_value}% of the price` : money(policy.deposit_value);
    lines.push(`A deposit is paid when you book${due ? ` (${money(due)})` : ` (${what})`}, and goes toward the service.`);
  } else lines.push("Nothing to pay when you book.");

  if (!policy.client_can_cancel && !policy.client_can_reschedule) lines.push("Changes and cancellations are made with the pro directly, not online.");
  else {
    const can = [policy.client_can_reschedule && "moved", policy.client_can_cancel && "cancelled"].filter(Boolean).join(" or ");
    lines.push(`Can be ${can} online up to ${duration(policy.change_cutoff_minutes)} before${policy.change_cutoff_minutes === 0 ? "" : " the appointment"}.`);
    if (policy.client_can_reschedule && policy.max_reschedules != null) {
      lines.push(policy.max_reschedules === 0 ? "Moving a booking isn't done online." : `A booking can be moved online up to ${policy.max_reschedules} time${policy.max_reschedules === 1 ? "" : "s"}.`);
    }
  }
  if (mode !== "none") {
    const late = policy.late_cancel_refund_percent;
    lines.push(
      policy.full_refund_minutes === 0
        ? `Cancel any time before and ${late === 100 ? "everything is refunded" : "you're refunded in full"}.`
        : `Cancel at least ${duration(policy.full_refund_minutes)} ahead for a full refund; later than that, ${late === 0 ? "the payment isn't refunded" : late === 100 ? "it's still refunded in full" : `${late}% is refunded`}.`
    );
    const ns = policy.no_show_refund_percent;
    lines.push(`If you don't show up, ${ns === 0 ? "the payment is kept" : ns === 100 ? "the payment is refunded" : `${ns}% is refunded`}.`);
  }
  if (policy.policy_note) lines.push(policy.policy_note);
  return lines;
}

export type PolicyPatch = Partial<BookingPolicy>;

/**
 * Check a pro's requested change, from Claude or the settings form, and turn
 * dollars and hours into the stored cents and minutes. Unknown keys are
 * ignored; a bad value refuses the whole change with a reason.
 */
export function parsePolicyInput(input: Record<string, unknown>): { ok: true; patch: PolicyPatch } | { ok: false; error: string } {
  const patch: PolicyPatch = {};
  const has = (k: string) => input[k] !== undefined && input[k] !== null && input[k] !== "";
  const int = (v: unknown) => (typeof v === "number" ? v : Number(String(v).trim()));
  const bool = (v: unknown) => v === true || v === "true" || v === "on" || v === "yes";

  if (has("payment_mode")) {
    const m = String(input.payment_mode);
    if (!["none", "deposit", "full"].includes(m)) return { ok: false, error: "Payment must be none, deposit or full." };
    patch.payment_mode = m as PaymentMode;
  }
  if (has("deposit_percent") && has("deposit_dollars")) return { ok: false, error: "Give the deposit as a percent or in dollars, not both." };
  if (has("deposit_percent")) {
    const n = int(input.deposit_percent);
    if (!Number.isInteger(n) || n < 1 || n > 100) return { ok: false, error: "A deposit percent must be a whole number from 1 to 100." };
    patch.deposit_kind = "percent";
    patch.deposit_value = n;
  }
  if (has("deposit_dollars")) {
    const cents = Math.round(Number(input.deposit_dollars) * 100);
    if (!Number.isFinite(cents) || cents < MIN_CHARGE_CENTS || cents > 100_000) return { ok: false, error: "A deposit must be between $0.50 and $1,000." };
    patch.deposit_kind = "fixed";
    patch.deposit_value = cents;
  }
  for (const k of ["tips_enabled", "client_can_cancel", "client_can_reschedule"] as const) if (input[k] !== undefined) patch[k] = bool(input[k]);

  const hoursField = (k: string, key: "change_cutoff_minutes" | "full_refund_minutes", label: string) => {
    if (!has(k)) return null;
    const h = Number(input[k]);
    if (!Number.isFinite(h) || h < 0 || h > 336) return `${label} must be from 0 to 336 hours.`;
    patch[key] = Math.round(h * 60);
    return null;
  };
  const e1 = hoursField("change_cutoff_hours", "change_cutoff_minutes", "How close to the time clients can change online");
  if (e1) return { ok: false, error: e1 };
  const e2 = hoursField("full_refund_hours", "full_refund_minutes", "The full-refund notice");
  if (e2) return { ok: false, error: e2 };

  for (const [k, label] of [["late_cancel_refund_percent", "The late-cancel refund"], ["no_show_refund_percent", "The no-show refund"]] as const) {
    if (!has(k)) continue;
    const n = int(input[k]);
    if (!Number.isInteger(n) || n < 0 || n > 100) return { ok: false, error: `${label} must be a whole percent from 0 to 100.` };
    patch[k] = n;
  }
  if (input.max_reschedules !== undefined) {
    if (input.max_reschedules === null || input.max_reschedules === "" || input.max_reschedules === "unlimited") patch.max_reschedules = null;
    else {
      const n = int(input.max_reschedules);
      if (!Number.isInteger(n) || n < 0 || n > 20) return { ok: false, error: "Moves allowed must be 0 to 20, or unlimited." };
      patch.max_reschedules = n;
    }
  }
  if (input.policy_note !== undefined) {
    const note = String(input.policy_note ?? "").trim();
    if (note.length > 500) return { ok: false, error: "Keep the policy note to 500 characters." };
    patch.policy_note = note || null;
  }
  return { ok: true, patch };
}
