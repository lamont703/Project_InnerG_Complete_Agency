import { COMMISSION_HOLD_DAYS, COMMISSION_RATE, MIN_PAYOUT_CENTS } from "@/lib/plans";

/**
 * The pure half of agency commission. Tested in commission-rules.test.ts.
 * lib/commissions.ts reads and writes the ledger with these.
 */

/** Commission on one payment: the rate on what was kept, rounded to the cent. */
export function commissionFor(paidCents: number, refundedCents: number, rate: number): number {
  return Math.round(Math.max(0, paidCents - refundedCents) * rate);
}

export const payableAt = (earnedAt: Date) => new Date(earnedAt.getTime() + COMMISSION_HOLD_DAYS * 86400_000);

export interface LedgerRow {
  commission_cents: number;
  paid_out_cents: number;
  payable_at: string;
}

export interface Earnings {
  /** Still inside the refund window. */
  pendingCents: number;
  /** Past the window and not yet paid — including anything taken back by a late refund. */
  readyCents: number;
  /** Handed over so far, net of anything taken back. */
  paidCents: number;
  /** Everything earned, net of refunds. */
  earnedCents: number;
  /** Whether a payout can be made now. */
  canPayOut: boolean;
}

export function summarize(rows: LedgerRow[], now = new Date()): Earnings {
  let pending = 0, ready = 0, paid = 0, earned = 0;
  for (const r of rows) {
    earned += r.commission_cents;
    paid += r.paid_out_cents;
    const owed = r.commission_cents - r.paid_out_cents;
    if (new Date(r.payable_at) <= now) ready += owed;
    else pending += owed;
  }
  return { pendingCents: pending, readyCents: ready, paidCents: paid, earnedCents: earned, canPayOut: ready >= MIN_PAYOUT_CENTS };
}

export const dollars = (cents: number) =>
  `${cents < 0 ? "-" : ""}$${(Math.abs(cents) / 100).toLocaleString("en-US", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;

/**
 * The terms, in one sentence everyone repeats — the signup page, the agency
 * page and Claude — so they can't drift apart when a number changes.
 */
export const COMMISSION_TERMS =
  `You earn ${Math.round(COMMISSION_RATE * 100)}% of what each business you brought pays for its plan, every month it stays on a paid plan. ` +
  `Each payment's commission becomes payable ${COMMISSION_HOLD_DAYS} days after it (a refund in that time lowers it), and payouts go out once at least $${MIN_PAYOUT_CENTS / 100} is ready. The rate is subject to change.`;
