/**
 * California's apprenticeship route to a barber, cosmetology or electrology
 * licence — the requirements, and how apprentices actually do on the exam.
 *
 * WHY THE EXAM DATA IS HERE AND NOT JUST THE RULES. Everyone who writes about
 * apprenticeship writes about the rules: earn while you learn, no tuition,
 * 3,200 hours. Nobody publishes the outcome. The board does — quarterly, per
 * program, in a separate PDF from the school results — and pooled across
 * eleven or twelve quarters it says apprentices pass the written exam at
 * roughly 40% where school candidates pass at 63-71%.
 *
 * That does not make the route bad. It makes it a route with a real cost that
 * is invisible in every existing description of it, and someone choosing
 * between a $20k programme and a paid apprenticeship deserves both halves.
 *
 * ============================================================================
 * TWO PARSING TRAPS IN THE SOURCE PDFs — both were fallen into before this
 * file existed, and both produce a wrong answer that looks reasonable.
 * ============================================================================
 *
 * 1. PRE-2022 FILES HAVE FOUR TABLES, NOT TWO. Until California abolished the
 *    practical on 1 January 2022, each quarterly PDF carried Barber Practical,
 *    Barber Written, Cosmetologist Practical and Cosmetology Written. Taking
 *    "the first two tables" pools barber PRACTICAL with barber WRITTEN.
 *    Practical pass rates run far higher, so the error inflates the
 *    apprentice figure and produced a first draft claiming barber apprentices
 *    were competitive with school candidates. They are not. Match on the
 *    caption "…Pass/Fail Rate for {X} Written Exam", never on position.
 *
 * 2. CAPTION POSITION IS NOT STABLE ACROSS YEARS. In the 2018-2022 files the
 *    caption extracts immediately BEFORE its table. In the 2026 file it
 *    extracts AFTER all the rows, so a parser that walks forward assigning
 *    rows to the last-seen caption silently assigns nothing. The 2026 quarter
 *    below was therefore read separately and its two tables confirmed as
 *    barber-then-cosmetology from the program names in each ("L.A. BARBER
 *    COLLEGE…" in the first, "SAN DIEGO COSMETOLOGY…" in the second).
 *
 * Source: Board of Barbering & Cosmetology quarterly "Apprentice Program
 * Pass/Fail Rate" reports, Q4 2018 - Q1 2026, and the school-side
 * "School Exam Pass/Fail Rates for Written for First Time Test Takers"
 * report for Q1 2026. Apprenticeship rules from the board's Apprenticeship
 * Information sheet and FAQ, and BPC 7332-7336. Read 2026-08-10.
 */

/** Every figure below is FIRST-TIME test takers on the WRITTEN exam. */
export const CA_APPRENTICE_EXAM = {
  barber: {
    /** Pooled across every quarter where a Barber Written table was published. */
    pooledPassPct: 40.3,
    passed: 495,
    candidates: 1229,
    quarters: 11,
    rangePct: [25.2, 50.6] as const,
    /** Most recent quarter, read separately — see trap 2 above. */
    latest: { period: "Q1 2026", passPct: 42.5, passed: 65, candidates: 153 },
  },
  cosmetology: {
    pooledPassPct: 38.3,
    passed: 654,
    candidates: 1707,
    quarters: 12,
    rangePct: [20.0, 50.0] as const,
    latest: { period: "Q1 2026", passPct: 28.8, passed: 30, candidates: 104 },
  },
} as const;

/**
 * The school-side comparison. ONE QUARTER ONLY — Q1 2026 — because that is
 * the school report on hand, against an apprentice series spanning 2018-2026.
 * The periods are therefore not matched, and any page using these must say so.
 *
 * What makes the comparison hold up anyway is the consistency: across all
 * eleven barber quarters and all twelve cosmetology quarters, not one reached
 * the school rate below. The gap is not a single bad quarter.
 */
export const CA_SCHOOL_EXAM_Q1_2026 = {
  period: "1 January – 31 March 2026",
  barber: { passPct: 62.9, passed: 444, candidates: 706, schools: 146 },
  cosmetology: { passPct: 70.6, passed: 1089, candidates: 1543, schools: 195 },
} as const;

export const CA_APPRENTICESHIP = {
  /** A year younger than the licence itself, which requires 17. */
  minimumAge: 16,
  grade: 10,
  /** On-the-job training hours, over a two-year period. */
  ojtHours: 3200,
  /** Related Training Hours — classroom, and IN ADDITION to the OJT hours. */
  rthHours: 220,
  weeklyHours: { min: 32, max: 42.5 },
  /** Board licensing fee. Program sponsors charge their own on top. */
  boardFee: 25,
  /**
   * Which licences have an apprenticeship route. The board's FAQ is explicit
   * that manicuring and esthetics do not — a common and expensive assumption,
   * since those are the two shortest school programmes and the ones someone
   * priced out of tuition is most likely to be aiming at.
   */
  availableFor: ["Barber", "Cosmetology", "Electrology"] as const,
  notAvailableFor: ["Manicurist", "Esthetician"] as const,
  /** Apprentice licence life — see BPC 7335, and note the two-strikes rule. */
  licenceExpiry: {
    years: 2,
    monthsAfterTrainingToApply: 3,
    failsBeforeExpiry: 2,
  },
} as const;

/**
 * WHAT DOES NOT TRANSFER, IN EITHER DIRECTION.
 *
 * The board's FAQ: clock-hours and operations accumulated in a board-approved
 * school "are non-transferable to the apprentice program." Someone who starts
 * cosmetology school, runs out of money and switches to an apprenticeship
 * starts the 3,200 hours from zero.
 *
 * Nothing in the sources reviewed states the reverse case — apprentice hours
 * toward a school programme — so do not publish a claim about it. The
 * asymmetry is genuinely unknown here, not merely unstated.
 */
export const CA_APPRENTICE_HOURS_TRANSFER = {
  schoolToApprenticeship: false,
  apprenticeshipToSchool: null, // unestablished — do not assert either way
} as const;
