/**
 * Verified Texas licensure exam pass rates.
 *
 * One place, because the numbers were previously typed into two page files and
 * their layouts by hand — roughly twenty copies of a single figure — and one of
 * them was wrong in a way that took a recount to notice.
 *
 * WHAT WAS WRONG. The barber page led with "37.25% pass rate". That number is
 * not a pass rate. Recomputed from the raw 2026 TDLR roster
 * (public/Texas Pass Fail Scores/2026 Texas Barber Written Exam Pass-Fail
 * Scores Both First Time and Repeat.csv — 2,411 candidate records, Jan 2 to
 * May 16 2026), 36.55% of candidates NEVER pass. So 37.25% was approximately
 * the failure rate, printed as though it were the pass rate. The OpenGraph
 * copy called it a failure rate and the FAQ structured data called it a pass
 * rate, on the same page, from the same number.
 *
 * The argument the page makes survives the correction intact, which is why the
 * correction is worth making rather than burying: a 56.98% first-attempt
 * written pass rate against a 92.34% practical pass rate is still a stark gap,
 * and it is the real one.
 *
 * WHICH NUMBER MEANS WHAT. Three different true answers, and the page has to
 * say which it is using:
 *   firstAttempt  — one sitting, one candidate. What a student actually faces.
 *   allAttempts   — every sitting, including retakes. Lowest of the three.
 *   everPass      — unique candidates who pass eventually. What a school reports.
 *
 * Metro figures come from the school tables rather than the roster, because the
 * roster carries school codes and no city; they are weighted by test takers, so
 * a school with three candidates cannot count as much as one with three hundred.
 */

export interface ExamRate {
  /** Percentage, already multiplied out — 56.98 not 0.5698. */
  pct: number;
  /** Candidates or attempts behind the figure. */
  n: number;
}

export const TEXAS_EXAM_SOURCE = {
  barberRoster:
    "2026 Texas Barber Written Exam Pass-Fail Scores (TDLR/PSI roster, 2,411 records, Jan 2 – May 16 2026)",
  cosmetologySchools: "TDLR 2026 school-reported cosmetology exam outcomes",
  asOf: "2026-05-16",
} as const;

export const BARBER_WRITTEN = {
  firstAttempt: { pct: 56.98, n: 1153 } as ExamRate,
  allAttempts: { pct: 44.09, n: 2411 } as ExamRate,
  everPass: { pct: 63.45, n: 1584 } as ExamRate,
  /** The complement of everPass — candidates who never passed in the window. */
  neverPass: { pct: 36.55, n: 1584 } as ExamRate,
};

export const BARBER_PRACTICAL = {
  /** School-weighted, from agent_barber_school_leads. */
  pass: { pct: 92.34, n: 666 } as ExamRate,
};

export const COSMETOLOGY_WRITTEN = {
  firstAttempt: { pct: 58.87, n: 5889 } as ExamRate,
  everPass: { pct: 71.91, n: 5889 } as ExamRate,
};

export const COSMETOLOGY_PRACTICAL = {
  pass: { pct: 97.19, n: 4798 } as ExamRate,
};

export interface MetroRate {
  city: string;
  /** Written pass rate, school-weighted. */
  pct: number;
  takers: number;
  schools: number;
}

/** Barber written pass rate by metro, weighted by test takers. */
export const BARBER_METROS: MetroRate[] = [
  { city: "Dallas", pct: 78.43, takers: 153, schools: 11 },
  { city: "Fort Worth", pct: 77.91, takers: 86, schools: 8 },
  { city: "Houston", pct: 67.87, takers: 249, schools: 17 },
  { city: "Austin", pct: 58.82, takers: 34, schools: 5 },
  { city: "San Antonio", pct: 52.17, takers: 161, schools: 12 },
  { city: "El Paso", pct: 42.11, takers: 38, schools: 6 },
];

/** Cosmetology written pass rate by metro, weighted by test takers. */
export const COSMETOLOGY_METROS: MetroRate[] = [
  { city: "El Paso", pct: 80.0, takers: 140, schools: 9 },
  { city: "Austin", pct: 76.61, takers: 124, schools: 9 },
  { city: "Dallas", pct: 76.25, takers: 240, schools: 8 },
  { city: "Houston", pct: 71.37, takers: 1013, schools: 44 },
  { city: "San Antonio", pct: 65.44, takers: 272, schools: 17 },
  { city: "Fort Worth", pct: 41.82, takers: 55, schools: 7 },
];

/** NACCAS issues a Request for Monitoring below this written pass rate. */
export const NACCAS_THRESHOLD = 70;

/** "56.98%" — one formatting rule, so the pages can't disagree. */
export const fmt = (r: ExamRate | number): string =>
  `${(typeof r === "number" ? r : r.pct).toFixed(2)}%`;

/** Metros below the NACCAS threshold, worst first. */
export const belowThreshold = (metros: MetroRate[]): MetroRate[] =>
  metros.filter((m) => m.pct < NACCAS_THRESHOLD).sort((a, b) => a.pct - b.pct);
