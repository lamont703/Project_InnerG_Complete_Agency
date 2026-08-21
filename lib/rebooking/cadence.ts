/**
 * Works out each client's personal haircut rhythm, and who is overdue for one.
 *
 * The whole point of this file is that there is no such thing as a standard
 * rebooking interval. Across the 89 clients with enough history to model, the
 * cadences run from 8.8 days to over 60 — one client every week, another every
 * two months. A single "it's been 4 weeks" reminder is wrong for almost
 * everybody, which is why this models each person separately rather than
 * picking a global number.
 *
 * Pure functions with no I/O so the maths can be tested directly; the Shopify
 * fetch lives in lib/rebooking/queue.ts.
 */

/** A visit is a calendar day the client paid for something. */
export interface VisitHistory {
  customerId: string;
  name: string;
  email: string | null;
  phone: string | null;
  /** ISO timestamps, any order. Same-day entries are collapsed by the model. */
  orderDates: string[];
  /** Lifetime gross across those orders, used to value the relationship. */
  lifetimeRevenue: number;
  /**
   * A human's correction to the computed rhythm, in days.
   *
   * The model reads purchase gaps and nothing else, so it cannot know that
   * someone has changed jobs, had a baby or started stretching their cuts. When
   * the barber knows the real interval, it wins — and it is applied here rather
   * than to the finished result so that the due date, the lateness and the
   * ranking all agree with the number on screen.
   */
  cadenceOverrideDays?: number;
}

export type DueStatus = "upcoming" | "due" | "overdue" | "at_risk";

export interface CadenceResult {
  customerId: string;
  name: string;
  email: string | null;
  phone: string | null;
  /** Distinct days visited. */
  visits: number;
  /** Typical days between visits — the MEDIAN of recent gaps, not the mean. */
  cadenceDays: number;
  /**
   * How reliably they keep to it, 0–1. Higher is steadier.
   * Below ~0.5 the person has no real rhythm and the due date is a guess.
   */
  regularity: number;
  lastVisit: string;
  daysSinceLastVisit: number;
  /** Negative = not due yet. Positive = this many days past their own rhythm. */
  daysOverdue: number;
  status: DueStatus;
  averageTicket: number;
  /** What the relationship is worth per year at their normal rhythm. */
  annualValue: number;
}

/**
 * Gaps longer than this are treated as a break in the relationship rather than
 * part of the rhythm — including them would drag a fortnightly client's cadence
 * out to months because of one holiday.
 */
const MAX_RHYTHM_GAP_DAYS = 120;

/** Fewer gaps than this is a coincidence, not a pattern. */
const MIN_GAPS_FOR_RHYTHM = 3;

/**
 * Recent behaviour beats lifetime history — people's rhythms change.
 *
 * Kept deliberately short. A wider window sounds more stable but straddles
 * behaviour changes: a client who came weekly last year and monthly since has
 * an 8-gap median of 18 days, which is a rhythm they have never actually kept
 * and which would chase them twice as often as they visit. Five gaps is enough
 * to be more than noise and short enough to follow someone who has slowed down.
 * lib/rebooking/cadence.test.ts pins this behaviour.
 */
const RECENT_GAPS_WINDOW = 5;

/**
 * Past this, someone has stopped coming rather than run late. They belong in a
 * win-back conversation, not a "you're due" reminder, and mixing the two
 * produces a text that reads as oblivious.
 */
export const GONE_AFTER_DAYS = 365;

/**
 * How far past their own rhythm a client must be before the agent will chase
 * them — and the single most consequential number in this file.
 *
 * It used to be -3, meaning people were surfaced three days BEFORE they were
 * due. Four years of this shop's history says that is the worst possible
 * moment to spend a message. Measured natural return rate, with no outreach
 * ever sent, by how late a client already is:
 *
 *     0-6 days late    96.3% come back anyway  (1482/1539)
 *     7-13 days late   88.4%                    (418/473)
 *     14-29 days late  81.7%                    (232/284)
 *     30-59 days late  65.8%                    (96/146)
 *     60-119 days late 49.0%                    (47/96)
 *     120+ days late   37.5%                    (27/72)
 *
 * Those figures come from lib/rebooking/baseline.ts run against this shop's
 * live orders, and they drift as the shop trades — do not treat them as
 * constants. They are recomputed on every page load; this comment is the
 * reasoning, not the source.
 *
 * Below 14 days a message is mostly telling people something they were going
 * to do anyway; at 14 days one client in four is genuinely slipping, and past
 * 30 days it is closer to one in two. So the queue starts here.
 *
 * The clients this excludes are not lost — they are the ones who come back on
 * their own. fetchRebookingQueue reports how many were held back so the
 * omission is visible rather than silent.
 */
export const CONTACT_THRESHOLD_DAYS = 14;

const DAY_MS = 86_400_000;

function toDayKey(iso: string): string {
  return iso.slice(0, 10);
}

function daysBetween(aKey: string, bKey: string): number {
  return Math.round((Date.parse(`${bKey}T00:00:00Z`) - Date.parse(`${aKey}T00:00:00Z`)) / DAY_MS);
}

export function median(values: number[]): number {
  if (values.length === 0) return 0;
  const s = [...values].sort((a, b) => a - b);
  const mid = Math.floor(s.length / 2);
  return s.length % 2 === 0 ? (s[mid - 1] + s[mid]) / 2 : s[mid];
}

/**
 * Median absolute deviation, scaled to 0–1 where 1 is perfectly regular.
 *
 * MAD rather than standard deviation because one unusual gap — a holiday, an
 * illness — should not make a reliable client look erratic. SD squares that
 * outlier; MAD barely notices it.
 */
export function regularityScore(gaps: number[]): number {
  if (gaps.length < 2) return 0;
  const m = median(gaps);
  if (m <= 0) return 0;
  const mad = median(gaps.map((g) => Math.abs(g - m)));
  return Math.max(0, Math.min(1, 1 - mad / m));
}

/**
 * Consecutive gaps between distinct visit days, with breaks excluded.
 * Exported because it is the step most worth inspecting when a cadence looks wrong.
 */
export function visitGaps(orderDates: string[]): { dayKeys: string[]; gaps: number[] } {
  const dayKeys = [...new Set(orderDates.map(toDayKey))].sort();
  const gaps: number[] = [];
  for (let i = 1; i < dayKeys.length; i++) {
    const g = daysBetween(dayKeys[i - 1], dayKeys[i]);
    if (g > 0 && g <= MAX_RHYTHM_GAP_DAYS) gaps.push(g);
  }
  return { dayKeys, gaps };
}

function classify(daysOverdue: number, cadenceDays: number): DueStatus {
  if (daysOverdue < 0) return "upcoming";
  if (daysOverdue < cadenceDays * 0.5) return "due";
  if (daysOverdue < cadenceDays * 1.5) return "overdue";
  return "at_risk";
}

/**
 * Model one client. Returns null when there is not enough history to say
 * anything honest about their rhythm.
 */
export function computeCadence(history: VisitHistory, now: Date): CadenceResult | null {
  const { dayKeys, gaps } = visitGaps(history.orderDates);
  if (dayKeys.length < 2 || gaps.length < MIN_GAPS_FOR_RHYTHM) return null;

  const recent = gaps.slice(-RECENT_GAPS_WINDOW);
  const override = history.cadenceOverrideDays;
  const cadenceDays = override && override > 0 ? override : median(recent);
  if (cadenceDays <= 0) return null;

  const lastVisit = dayKeys[dayKeys.length - 1];
  const nowKey = toDayKey(now.toISOString());
  const daysSinceLastVisit = daysBetween(lastVisit, nowKey);
  const daysOverdue = daysSinceLastVisit - cadenceDays;

  const averageTicket = dayKeys.length > 0 ? history.lifetimeRevenue / dayKeys.length : 0;

  return {
    customerId: history.customerId,
    name: history.name,
    email: history.email,
    phone: history.phone,
    visits: dayKeys.length,
    cadenceDays: Number(cadenceDays.toFixed(1)),
    regularity: Number(regularityScore(recent).toFixed(2)),
    lastVisit,
    daysSinceLastVisit,
    daysOverdue: Number(daysOverdue.toFixed(1)),
    status: classify(daysOverdue, cadenceDays),
    averageTicket: Number(averageTicket.toFixed(2)),
    annualValue: Number((averageTicket * (365 / cadenceDays)).toFixed(2)),
  };
}

/**
 * Everyone who is at, near, or past their own rhythm — most urgent first.
 *
 * "Most urgent" is deliberately weighted by money as well as lateness. A client
 * worth $2,400/yr who is two weeks late matters more than one worth $300 who is
 * two weeks late, and a list sorted purely by days-overdue buries the first
 * under the second.
 */
export function buildDueList(histories: VisitHistory[], now: Date): CadenceResult[] {
  return histories
    .map((h) => computeCadence(h, now))
    .filter((c): c is CadenceResult => c !== null)
    .filter((c) => c.daysSinceLastVisit <= GONE_AFTER_DAYS)
    .filter((c) => c.daysOverdue >= CONTACT_THRESHOLD_DAYS)
    .sort((a, b) => {
      const score = (c: CadenceResult) => (c.daysOverdue / Math.max(c.cadenceDays, 1)) * c.annualValue;
      return score(b) - score(a);
    });
}
