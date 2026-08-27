/**
 * The ShearQuery booth-rent score. PROTOTYPE — no real data feeds this yet.
 *
 * SCORED 0-100, NOT 300-850, and that is a deliberate refusal rather than a
 * styling choice. A 300-850 range would borrow FICO's shape and imply a
 * comparability that does not exist: this measures one narrow behaviour over a
 * handful of months, not creditworthiness. Anyone reading 720 here would import
 * a lifetime of assumptions that do not apply.
 *
 * EVERY FACTOR IS SHOWN TO THE PERSON SCORED. A number that decides whether
 * somebody can rent a chair, arrived at by means they cannot inspect, is not
 * something this project should ship. The weights are public and the breakdown
 * renders on the page.
 *
 * CONFIDENCE IS SEPARATE FROM SCORE, because they answer different questions.
 * Twelve on-time payments across two shops and two on-time payments at one are
 * both "100% on time"; only one of them is evidence. Collapsing that into a
 * single number is how thin files get treated as proven records.
 */

export type PaymentStatus = "on_time" | "late" | "missed" | "no_record";

export interface PaymentMonth {
  /** "2026-03" */
  month: string;
  status: PaymentStatus;
  /** Days late, when late. Null for anything else. */
  daysLate: number | null;
  amount: number | null;
}

export interface Tradeline {
  shopName: string;
  shopSlug: string | null;
  city: string;
  rentPerWeek: number;
  startedAt: string;
  endedAt: string | null;
  months: PaymentMonth[];
}

export interface ScoreFactor {
  key: string;
  label: string;
  /** Share of the total score this factor can contribute. */
  weight: number;
  /** 0-1, how much of that weight was earned. */
  earned: number;
  detail: string;
}

export type Confidence = "thin" | "moderate" | "strong";

export interface CreditReport {
  score: number | null;
  band: ScoreBand;
  confidence: Confidence;
  factors: ScoreFactor[];
  monthsOnFile: number;
  shopCount: number;
  onTimeCount: number;
  latePayments: number;
  tradelines: Tradeline[];
}

export interface ScoreBand {
  key: string;
  label: string;
  range: string;
  meaning: string;
  /** Written for the shop owner, because that is who acts on it. */
  guidance: string;
  tone: "emerald" | "sky" | "amber" | "rose" | "slate";
}

export const BANDS: ScoreBand[] = [
  {
    key: "established", label: "Established", range: "85–100", tone: "emerald",
    meaning: "A long, clean record across more than one shop.",
    guidance: "Treat this the way you would a strong reference. The record is long enough that a single good stretch cannot explain it.",
  },
  {
    key: "solid", label: "Solid", range: "70–84", tone: "sky",
    meaning: "Consistently pays, with a shorter history or the odd late month.",
    guidance: "A normal, good tenant. If there are late months, look at when — clustered lates usually mark a shop change, not a habit.",
  },
  {
    key: "building", label: "Building", range: "50–69", tone: "amber",
    meaning: "Some history, mixed or too short to be conclusive.",
    guidance: "Not a warning. Ask what the gaps are. Most people here are new to renting a chair, not bad at it.",
  },
  {
    key: "limited", label: "Limited", range: "Below 50", tone: "rose",
    meaning: "Repeated late or missed payments in the recorded history.",
    guidance: "Worth a conversation, not an automatic no. Ask about the period directly — this score has no idea what happened in someone's life.",
  },
  {
    key: "none", label: "No score yet", range: "—", tone: "slate",
    meaning: "Fewer than three months on file.",
    guidance: "This means we know nothing, NOT that there is anything to worry about. Everyone starts here.",
  },
];

/** Below this there is not enough behaviour to score at all. */
export const MIN_MONTHS_TO_SCORE = 3;

/*
 * CORROBORATION IS NOT IN THE SCORE, and taking it out was a correction.
 *
 * It was worth 15% on the theory that a single shop vouching for a barber could
 * be a friendship rather than a record. The fraud concern is real. The fix was
 * not: it docked a barber who had stayed at one shop for three years and paid
 * every week — punishing loyalty, which is the opposite of what a good tenant
 * looks like.
 *
 * Corroboration belongs to CONFIDENCE, where it already lived. One shop with a
 * long clean record earns a high score and a caveat about the single source.
 * The shop owner gets both facts and can weigh them; the barber is not silently
 * marked down for something that is not a flaw.
 */
const WEIGHTS = { onTime: 0.6, depth: 0.2, recency: 0.2 };

export function buildReport(tradelines: Tradeline[]): CreditReport {
  const all = tradelines.flatMap((t) => t.months).filter((m) => m.status !== "no_record");
  const monthsOnFile = all.length;
  const shopCount = tradelines.length;
  const onTimeCount = all.filter((m) => m.status === "on_time").length;
  const latePayments = all.filter((m) => m.status === "late" || m.status === "missed").length;

  if (monthsOnFile < MIN_MONTHS_TO_SCORE) {
    return {
      score: null, band: BANDS.find((b) => b.key === "none")!, confidence: "thin",
      factors: [], monthsOnFile, shopCount, onTimeCount, latePayments, tradelines,
    };
  }

  const onTimeRate = onTimeCount / monthsOnFile;

  // Depth saturates at two years: a fourth year of the same behaviour is not
  // four times the evidence of the first.
  const depth = Math.min(monthsOnFile / 24, 1);

  // The last six months, weighted separately, because someone who paid late two
  // years ago and has been clean since is not the same risk as the reverse.
  const recent = [...all].sort((a, b) => b.month.localeCompare(a.month)).slice(0, 6);
  const recency = recent.length ? recent.filter((m) => m.status === "on_time").length / recent.length : 0;

  const factors: ScoreFactor[] = [
    { key: "onTime", label: "Paid on time", weight: WEIGHTS.onTime, earned: onTimeRate,
      detail: `${onTimeCount} of ${monthsOnFile} recorded months` },
    { key: "depth", label: "Length of record", weight: WEIGHTS.depth, earned: depth,
      detail: `${monthsOnFile} months on file` },
    { key: "recency", label: "Recent 6 months", weight: WEIGHTS.recency, earned: recency,
      detail: `${recent.filter((m) => m.status === "on_time").length} of ${recent.length} on time` },
  ];

  const score = Math.round(factors.reduce((s, f) => s + f.weight * f.earned, 0) * 100);
  const confidence: Confidence =
    monthsOnFile >= 18 && shopCount >= 2 ? "strong" : monthsOnFile >= 9 ? "moderate" : "thin";

  return { score, band: bandFor(score), confidence, factors, monthsOnFile, shopCount, onTimeCount, latePayments, tradelines };
}

export function bandFor(score: number | null): ScoreBand {
  if (score == null) return BANDS.find((b) => b.key === "none")!;
  if (score >= 85) return BANDS.find((b) => b.key === "established")!;
  if (score >= 70) return BANDS.find((b) => b.key === "solid")!;
  if (score >= 50) return BANDS.find((b) => b.key === "building")!;
  return BANDS.find((b) => b.key === "limited")!;
}
