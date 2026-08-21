import { visitGaps, median, type VisitHistory } from "./cadence";

/**
 * What happens when NOBODY reaches out — the comparison every impact claim
 * needs and the reason most rebooking dashboards are fiction.
 *
 * This shop ran for four years with no rebooking outreach of any kind, which
 * makes its own history a clean natural experiment. Measured over 1,481 overdue
 * events: 85.1% of clients came back within 14 days of passing their cadence,
 * and 93.9% within 30. So a report that counts "we messaged them and they came
 * back" as impact is claiming credit for something that was 85% certain
 * already, and would overstate the agent's value by roughly an order of
 * magnitude.
 *
 * The lift the agent can actually produce is the gap between what happens with
 * a message and what this curve says happens without one. That gap is only
 * worth chasing where the curve is low, which is why lib/rebooking/cadence.ts
 * does not surface anyone under 14 days late.
 *
 * WHAT THIS IS NOT. It is a historical baseline, not a concurrent control
 * group. Seasonality, price changes, a client's life, and the barber's own
 * behaviour all drift over four years, and none of that is held constant. It
 * supports "the return rate is higher than history suggests" and does NOT
 * support "the agent caused it". Anything built on top of this must say so —
 * see attribution.ts, which labels every derived figure observational.
 */

export interface BaselineBucket {
  /** Inclusive lower bound of days-late. */
  minDaysLate: number;
  /** Exclusive upper bound, or null for open-ended. */
  maxDaysLate: number | null;
  label: string;
  /** Historical events that reached this level of lateness. */
  reached: number;
  /** Of those, how many ever came back. */
  returned: number;
  /** returned / reached, 0–1. Null when there is not enough history to say. */
  returnRate: number | null;
}

export const BUCKETS: { min: number; max: number | null; label: string }[] = [
  { min: 0, max: 7, label: "0–6 days late" },
  { min: 7, max: 14, label: "7–13 days late" },
  { min: 14, max: 30, label: "14–29 days late" },
  { min: 30, max: 60, label: "30–59 days late" },
  { min: 60, max: 120, label: "60–119 days late" },
  { min: 120, max: null, label: "120+ days late" },
];

/** Below this a bucket's rate is noise and is reported as unknown rather than a number. */
const MIN_EVENTS_FOR_RATE = 20;

const DAY_MS = 86_400_000;
const RECENT_GAPS_WINDOW = 5;

export function bucketFor(daysLate: number): string {
  const b = BUCKETS.find((x) => daysLate >= x.min && (x.max === null || daysLate < x.max));
  return b ? b.label : BUCKETS[BUCKETS.length - 1].label;
}

/**
 * Build the curve from raw visit histories.
 *
 * Walks every client's timeline and, at each visit, asks: given the rhythm they
 * had at that moment, how late were they when they next turned up? Every
 * lateness threshold they passed through counts as an event that "reached" that
 * bucket and, because they did eventually return, also "returned".
 *
 * THE OPEN INTERVAL AT THE END IS THE IMPORTANT HALF. A client's current gap —
 * the one that has not ended in a visit — is the only source of NON-returns in
 * the whole dataset. Counting only completed gaps would find that 100% of
 * overdue clients come back, because a client who left forever never produces a
 * closing visit to count. That bug makes the baseline useless and looks
 * perfectly reasonable in the code.
 */
export function computeBaseline(histories: VisitHistory[], now: Date): BaselineBucket[] {
  const tally = new Map<string, { reached: number; returned: number }>();
  for (const b of BUCKETS) tally.set(b.label, { reached: 0, returned: 0 });

  const bump = (daysLate: number, returned: boolean) => {
    for (const b of BUCKETS) {
      if (daysLate < b.min) continue;
      const t = tally.get(b.label)!;
      t.reached++;
      if (returned) t.returned++;
    }
  };

  for (const h of histories) {
    const { dayKeys } = visitGaps(h.orderDates);
    if (dayKeys.length < 6) continue;

    // Completed gaps: they were late by this much, and they did come back.
    for (let i = RECENT_GAPS_WINDOW; i < dayKeys.length; i++) {
      const gaps: number[] = [];
      for (let k = i - RECENT_GAPS_WINDOW; k < i; k++) {
        const g = (Date.parse(dayKeys[k + 1]) - Date.parse(dayKeys[k])) / DAY_MS;
        if (g > 0 && g <= 120) gaps.push(g);
      }
      if (gaps.length < 3) continue;
      const cadence = median(gaps);
      if (cadence <= 0) continue;

      const dueAt = Date.parse(dayKeys[i - 1]) + cadence * DAY_MS;
      const cameBack = Date.parse(dayKeys[i]);
      if (cameBack < dueAt) continue; // came early; not an overdue event
      bump((cameBack - dueAt) / DAY_MS, true);
    }

    // The open interval — the only place a non-return can come from.
    const tailGaps: number[] = [];
    for (let k = Math.max(0, dayKeys.length - 1 - RECENT_GAPS_WINDOW); k < dayKeys.length - 1; k++) {
      const g = (Date.parse(dayKeys[k + 1]) - Date.parse(dayKeys[k])) / DAY_MS;
      if (g > 0 && g <= 120) tailGaps.push(g);
    }
    if (tailGaps.length >= 3) {
      const cadence = median(tailGaps);
      const dueAt = Date.parse(dayKeys[dayKeys.length - 1]) + cadence * DAY_MS;
      const lateNow = (now.getTime() - dueAt) / DAY_MS;
      if (lateNow > 0) bump(lateNow, false);
    }
  }

  return BUCKETS.map((b) => {
    const t = tally.get(b.label)!;
    return {
      minDaysLate: b.min,
      maxDaysLate: b.max,
      label: b.label,
      reached: t.reached,
      returned: t.returned,
      returnRate: t.reached >= MIN_EVENTS_FOR_RATE ? t.returned / t.reached : null,
    };
  });
}

/** The historical return rate for a client this many days late, or null if unknown. */
export function baselineRateFor(baseline: BaselineBucket[], daysLate: number): number | null {
  const label = bucketFor(daysLate);
  return baseline.find((b) => b.label === label)?.returnRate ?? null;
}
