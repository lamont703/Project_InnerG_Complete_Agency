/**
 * The ShearQuery booth-rent score. PROTOTYPE — no real data feeds this yet.
 *
 * MEASURED IN WEEKS, because that is how booth rent is actually paid. The first
 * version used monthly tradelines, which is what a credit report looks like and
 * not what this industry does. Four things change with the unit, and none of
 * them are cosmetic:
 *
 *   1. FOUR TIMES THE EVIDENCE, FOUR TIMES FASTER. Twelve weeks is twelve
 *      observations, not three. A barber earns a meaningful record in a season
 *      rather than a year, which is the difference between this being useful to
 *      somebody starting out and being useless to them.
 *
 *   2. LATE MEANS SOMETHING TIGHTER. Six days late on a monthly bill is a
 *      slip; six days late on a weekly one means the next payment is already
 *      due. The thresholds below are set against the cycle, not against a
 *      generic idea of lateness.
 *
 *   3. CATCHING UP IS A REAL PATTERN, NOT A FAILURE. Missing a week and paying
 *      double the next is ordinary in this trade — it happens after a slow
 *      week, not because somebody is unreliable. Scoring it as a miss would
 *      mark down the most common recovery behaviour there is.
 *
 *   4. WEEKS OFF ARE NOT MISSED PAYMENTS. Barbers take holidays, get sick, and
 *      many shops do not charge for a week you are not in the chair. Recording
 *      that as non-payment would be false and would punish people for being ill.
 *      Excused weeks leave the denominator entirely.
 *
 * SCORED 0-100, NOT 300-850, deliberately: borrowing FICO's range would imply a
 * comparability that does not exist.
 *
 * EVERY FACTOR IS DISCLOSED, and CONFIDENCE IS REPORTED SEPARATELY FROM SCORE,
 * because "how good is this record" and "how much record is there" are
 * different questions and collapsing them is how thin files get read as proven.
 */

export type PaymentStatus = "on_time" | "late" | "caught_up" | "excused" | "missed" | "no_record";

export interface PaymentWeek {
  /** Monday of the rent week, "2026-03-02". */
  weekStart: string;
  status: PaymentStatus;
  /** Days past the shop's due day. Null unless late or caught up. */
  daysLate: number | null;
  amount: number | null;
  /** Why a week was excused — shown so it never reads as a gap. */
  note: string | null;
}

export interface Tradeline {
  shopName: string;
  shopSlug: string | null;
  city: string;
  rentPerWeek: number;
  /** The day rent is due, e.g. "Monday". Lateness is measured from this. */
  dueDay: string;
  startedAt: string;
  endedAt: string | null;
  weeks: PaymentWeek[];
}

export interface ScoreFactor {
  key: string;
  label: string;
  weight: number;
  earned: number;
  detail: string;
}

export type Confidence = "thin" | "moderate" | "strong";

export interface CreditReport {
  score: number | null;
  band: ScoreBand;
  confidence: Confidence;
  factors: ScoreFactor[];
  /** Weeks that counted. Excused weeks are NOT in here. */
  weeksCounted: number;
  weeksExcused: number;
  shopCount: number;
  onTimeCount: number;
  lateCount: number;
  caughtUpCount: number;
  missedCount: number;
  /** Consecutive most-recent weeks paid on time. The number barbers quote. */
  currentStreak: number;
  longestStreak: number;
  tradelines: Tradeline[];
}

export interface ScoreBand {
  key: string;
  label: string;
  range: string;
  meaning: string;
  guidance: string;
  tone: "emerald" | "sky" | "amber" | "rose" | "slate";
}

export const BANDS: ScoreBand[] = [
  {
    key: "established", label: "Established", range: "85–100", tone: "emerald",
    meaning: "A long run of weeks paid on time.",
    guidance: "Read this the way you would a strong reference. At this many weeks, a single good stretch cannot explain it.",
  },
  {
    key: "solid", label: "Solid", range: "70–84", tone: "sky",
    meaning: "Pays week to week, with a shorter run or the odd late week.",
    guidance: "A normal, good tenant. If there are late weeks, look at where they sit — clustered ones usually mark a shop change or a slow season.",
  },
  {
    key: "building", label: "Building", range: "50–69", tone: "amber",
    meaning: "Some weeks on file, mixed or too few to be conclusive.",
    guidance: "Not a warning. Most people here are new to renting a chair, not bad at it. Ask what the gaps are.",
  },
  {
    key: "limited", label: "Limited", range: "Below 50", tone: "rose",
    meaning: "Repeated late or unpaid weeks in the recorded history.",
    guidance: "Worth a conversation, not an automatic no. Ask about the period directly — this score has no idea what was happening in someone's life.",
  },
  {
    key: "none", label: "No score yet", range: "—", tone: "slate",
    meaning: "Fewer than eight weeks on file.",
    guidance: "This means we know nothing, NOT that there is anything to worry about. Everyone starts here.",
  },
];

/**
 * Eight weeks — about two months of renting.
 *
 * Set against the WEEKLY cycle rather than carried over from the monthly
 * version, where three months meant three observations. Eight weeks is eight,
 * which is enough to see a pattern without making somebody wait a year to have
 * one.
 */
export const MIN_WEEKS_TO_SCORE = 8;

/** Recency window: one quarter of weekly payments. */
export const RECENT_WEEKS = 13;

/** Depth saturates here — a third year of the same behaviour is not new evidence. */
const DEPTH_SATURATION_WEEKS = 104;

const WEIGHTS = { onTime: 0.6, depth: 0.2, recency: 0.2 };

/** Weeks that count toward the record. Excused weeks are owed by nobody. */
function counted(weeks: PaymentWeek[]): PaymentWeek[] {
  return weeks.filter((w) => w.status !== "no_record" && w.status !== "excused");
}

/**
 * Credit for a week, 0-1.
 *
 * Catching up earns most of the credit rather than none: paying double the
 * following week is how this trade absorbs a slow one, and treating it as a
 * miss would mark down the ordinary recovery. It is not full credit either —
 * the shop was short for a week and that is real.
 */
function creditFor(w: PaymentWeek): number {
  if (w.status === "on_time") return 1;
  if (w.status === "caught_up") return 0.75;
  if (w.status === "late") return (w.daysLate ?? 0) <= 2 ? 0.6 : 0.3;
  return 0; // missed
}

export function buildReport(tradelines: Tradeline[]): CreditReport {
  const all = tradelines.flatMap((t) => t.weeks);
  const scored = counted(all);
  const weeksCounted = scored.length;
  const weeksExcused = all.filter((w) => w.status === "excused").length;
  const shopCount = tradelines.length;

  const onTimeCount = scored.filter((w) => w.status === "on_time").length;
  const lateCount = scored.filter((w) => w.status === "late").length;
  const caughtUpCount = scored.filter((w) => w.status === "caught_up").length;
  const missedCount = scored.filter((w) => w.status === "missed").length;

  const byRecency = [...scored].sort((a, b) => b.weekStart.localeCompare(a.weekStart));
  const currentStreak = (() => {
    let n = 0;
    for (const w of byRecency) {
      if (w.status === "on_time") n++;
      else break;
    }
    return n;
  })();
  const longestStreak = (() => {
    let best = 0, run = 0;
    for (const w of [...scored].sort((a, b) => a.weekStart.localeCompare(b.weekStart))) {
      run = w.status === "on_time" ? run + 1 : 0;
      if (run > best) best = run;
    }
    return best;
  })();

  const base = {
    weeksCounted, weeksExcused, shopCount, onTimeCount, lateCount, caughtUpCount,
    missedCount, currentStreak, longestStreak, tradelines,
  };

  if (weeksCounted < MIN_WEEKS_TO_SCORE) {
    return { score: null, band: BANDS.find((b) => b.key === "none")!, confidence: "thin", factors: [], ...base };
  }

  const payRate = scored.reduce((s, w) => s + creditFor(w), 0) / weeksCounted;
  const depth = Math.min(weeksCounted / DEPTH_SATURATION_WEEKS, 1);
  const recent = byRecency.slice(0, RECENT_WEEKS);
  const recency = recent.reduce((s, w) => s + creditFor(w), 0) / recent.length;

  const factors: ScoreFactor[] = [
    { key: "onTime", label: "Weeks paid on time", weight: WEIGHTS.onTime, earned: payRate,
      detail: `${onTimeCount} of ${weeksCounted} weeks clean` },
    { key: "depth", label: "Length of record", weight: WEIGHTS.depth, earned: depth,
      detail: `${weeksCounted} weeks on file` },
    { key: "recency", label: `Last ${RECENT_WEEKS} weeks`, weight: WEIGHTS.recency, earned: recency,
      detail: `${recent.filter((w) => w.status === "on_time").length} of ${recent.length} on time` },
  ];

  const score = Math.round(factors.reduce((s, f) => s + f.weight * f.earned, 0) * 100);
  const confidence: Confidence =
    weeksCounted >= 78 && shopCount >= 2 ? "strong" : weeksCounted >= 26 ? "moderate" : "thin";

  return { score, band: bandFor(score), confidence, factors, ...base };
}

export function bandFor(score: number | null): ScoreBand {
  if (score == null) return BANDS.find((b) => b.key === "none")!;
  if (score >= 85) return BANDS.find((b) => b.key === "established")!;
  if (score >= 70) return BANDS.find((b) => b.key === "solid")!;
  if (score >= 50) return BANDS.find((b) => b.key === "building")!;
  return BANDS.find((b) => b.key === "limited")!;
}
