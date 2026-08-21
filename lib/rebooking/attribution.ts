import { bucketFor, baselineRateFor, type BaselineBucket } from "./baseline";

/**
 * What the agent has actually been worth — stated so it can be argued with.
 *
 * THE CLAIM THIS FILE IS CAREFUL NOT TO MAKE. "We messaged 20 people and 15
 * came back, so the agent produced 15 visits" is the natural report and it is
 * wrong. This shop's own history says 85.1% of overdue clients return within a
 * fortnight with no message at all. Counting every return as impact credits the
 * agent with work the client was always going to do.
 *
 * So every figure here is a DIFFERENCE against lib/rebooking/baseline.ts: the
 * observed return rate for contacted clients, minus the rate this shop's four
 * years of un-nudged history recorded for people that late. Only the gap is
 * claimed.
 *
 * AND IT IS STILL OBSERVATIONAL, WHICH THE UI MUST KEEP SAYING. There is no
 * holdout group — every due client gets contacted — so the comparison is
 * against a historical period, not a concurrent control. Seasonality, prices,
 * the barber's own behaviour and who happens to be overdue this month all
 * differ between then and now, and none of it is held constant. This supports
 * "the return rate is running above what history predicts" and does not support
 * "the agent caused it". If a number here ever needs to survive a sceptic, the
 * answer is a holdout, not a better sentence.
 */

export interface OutreachRecord {
  id: string;
  shopifyCustomerId: string;
  clientName: string | null;
  sentAt: string;
  channel: "sms" | "email" | "manual";
  daysOverdue: number | null;
  latenessBucket: string | null;
  annualValue: number | null;
  averageTicket: number | null;
  costCents: number;
}

export type OutreachOutcome = "returned" | "no_return" | "pending";

export interface AttributedOutreach extends OutreachRecord {
  outcome: OutreachOutcome;
  /** First visit after the message, if any. */
  returnedOn: string | null;
  daysToReturn: number | null;
  /** What history says someone this late does unprompted, 0–1. */
  baselineRate: number | null;
}

/**
 * How long after a message we stop counting a visit as possibly related.
 *
 * Beyond this the connection is not credible — someone who turns up 90 days
 * after a text was not responding to the text. Sends newer than this are
 * "pending" rather than failures, which matters: counting a message sent
 * yesterday as a non-return drags the rate down for no reason.
 */
export const ATTRIBUTION_WINDOW_DAYS = 30;

const DAY_MS = 86_400_000;

/**
 * Join sends to the visits that followed them.
 *
 * `visitDaysByCustomer` is every distinct day each client paid for something,
 * straight from Shopify — the same source the cadence model uses.
 */
export function attribute(
  outreach: OutreachRecord[],
  visitDaysByCustomer: Map<string, string[]>,
  baseline: BaselineBucket[],
  now: Date,
): AttributedOutreach[] {
  return outreach.map((o) => {
    const sentMs = Date.parse(o.sentAt);
    const visits = visitDaysByCustomer.get(o.shopifyCustomerId) ?? [];

    // First visit strictly after the send. Same-day is deliberately counted:
    // a text at 9am and a cut at 2pm is exactly the outcome being measured.
    const after = visits
      .filter((d) => Date.parse(`${d}T23:59:59Z`) >= sentMs)
      .sort();
    const first = after[0] ?? null;

    const daysToReturn = first ? Math.max(0, Math.round((Date.parse(first) - sentMs) / DAY_MS)) : null;
    const withinWindow = daysToReturn !== null && daysToReturn <= ATTRIBUTION_WINDOW_DAYS;
    const windowClosed = (now.getTime() - sentMs) / DAY_MS >= ATTRIBUTION_WINDOW_DAYS;

    const outcome: OutreachOutcome = withinWindow ? "returned" : windowClosed ? "no_return" : "pending";

    const bucket = o.latenessBucket ?? (o.daysOverdue != null ? bucketFor(o.daysOverdue) : null);
    const baselineRate = o.daysOverdue != null ? baselineRateFor(baseline, o.daysOverdue) : null;

    return {
      ...o,
      latenessBucket: bucket,
      outcome,
      returnedOn: withinWindow ? first : null,
      daysToReturn: withinWindow ? daysToReturn : null,
      baselineRate,
    };
  });
}

export interface AttributionSummary {
  /** Sends whose window has closed — the only ones that can be scored. */
  settled: number;
  pending: number;
  returned: number;
  observedRate: number | null;
  /** Weighted by how late each contacted client was. */
  expectedRate: number | null;
  /** observedRate − expectedRate, in percentage points. Null if not computable. */
  liftPoints: number | null;
  /** Visits above what history predicts. Can be negative. */
  attributableVisits: number | null;
  /** attributableVisits × average ticket of the contacted group. */
  attributableRevenue: number | null;
  costDollars: number;
  /** Null when there is no lift figure, or when cost is zero. */
  returnOnCost: number | null;
  /**
   * True when there are too few settled sends for the number to mean anything.
   * The UI must lead with this rather than printing a confident figure.
   */
  underpowered: boolean;
  minimumUseful: number;
}

/**
 * Below this many settled sends, the summary is noise wearing a number.
 *
 * Detecting a lift against a baseline in the 40–75% range needs samples in the
 * high dozens before the confidence interval stops spanning zero. This shop
 * produces roughly 100–120 qualifying overdue events a year, so a meaningful
 * figure is months away, not weeks. Saying so is the difference between a
 * useful tool and a flattering one.
 */
const MINIMUM_USEFUL_SENDS = 30;

export function summarize(attributed: AttributedOutreach[]): AttributionSummary {
  const settled = attributed.filter((a) => a.outcome !== "pending");
  const pending = attributed.length - settled.length;
  const returned = settled.filter((a) => a.outcome === "returned").length;

  const observedRate = settled.length > 0 ? returned / settled.length : null;

  // Expected rate is weighted per client by how late THEY were — averaging the
  // bucket rates instead would treat a 15-day-late client and a 200-day-late
  // one as the same prediction.
  const withBaseline = settled.filter((a) => a.baselineRate !== null);
  const expectedRate =
    withBaseline.length > 0
      ? withBaseline.reduce((s, a) => s + (a.baselineRate ?? 0), 0) / withBaseline.length
      : null;

  const liftPoints =
    observedRate !== null && expectedRate !== null ? (observedRate - expectedRate) * 100 : null;

  const attributableVisits = liftPoints !== null ? (liftPoints / 100) * settled.length : null;

  const tickets = settled.map((a) => a.averageTicket ?? 0).filter((t) => t > 0);
  const avgTicket = tickets.length > 0 ? tickets.reduce((s, t) => s + t, 0) / tickets.length : 0;
  const attributableRevenue = attributableVisits !== null ? attributableVisits * avgTicket : null;

  const costDollars = attributed.reduce((s, a) => s + a.costCents, 0) / 100;
  const returnOnCost =
    attributableRevenue !== null && costDollars > 0 ? attributableRevenue / costDollars : null;

  return {
    settled: settled.length,
    pending,
    returned,
    observedRate,
    expectedRate,
    liftPoints,
    attributableVisits: attributableVisits === null ? null : Number(attributableVisits.toFixed(1)),
    attributableRevenue: attributableRevenue === null ? null : Number(attributableRevenue.toFixed(2)),
    costDollars: Number(costDollars.toFixed(2)),
    returnOnCost: returnOnCost === null ? null : Number(returnOnCost.toFixed(1)),
    underpowered: settled.length < MINIMUM_USEFUL_SENDS,
    minimumUseful: MINIMUM_USEFUL_SENDS,
  };
}
