/**
 * What California licensees actually work, from the board's own survey.
 *
 * WHY THIS EXISTS. "How much do estheticians make in California" has real
 * search volume, and every answer to it — Indeed, ZipRecruiter, salary.com —
 * is an ANNUAL figure. An annual figure is an hourly rate multiplied by a
 * full-time year, and the board's survey of its own licensees says a full-time
 * year describes 8.7% of them.
 *
 * So the honest page is not a better salary estimate. It is the observation
 * that the published estimates answer a question about the 8.7% and are read
 * by the other 91%.
 *
 * THE BOARD PUBLISHES NO EARNINGS DATA. Checked across all 517 pages of the
 * 2026 Sunset Review: every mention of wages, income or salary concerns
 * apprentice pay rules, the Executive Officer's appraisal, or travel
 * reimbursement. There is no licensee income table and nothing here should be
 * presented as one. What the board has is hours and clients, which is enough
 * to test somebody else's assumption but not enough to replace their number.
 *
 * SURVEY, NOT CENSUS. These are self-selected respondents to the board's
 * occupational analysis, not all licensees, and the sample sizes differ by an
 * order of magnitude between licences (615 barbers, 2,686 estheticians). The
 * "Missing" row is carried below rather than dropped, because a reader
 * checking the percentages against the totals deserves to see why they do not
 * sum to 100 without it.
 *
 * Source: 2026 Sunset Review Report, per-licence occupational analysis —
 * barbering p.164, electrology p.250, esthetics p.334, manicuring p.427.
 * Read 2026-08-10.
 */

export interface CaHoursBand {
  band: string;
  n: number;
  pct: number;
}

export interface CaWorkforceSurvey {
  license: string;
  slug: "barbering" | "esthetics" | "manicuring" | "electrology";
  /** Total survey respondents, including the Missing row. */
  respondents: number;
  hours: CaHoursBand[];
  /** Share reporting the fewest clients per day, with the band the board used. */
  lowClientLoad?: { pct: number; band: string };
  /** Share describing themselves as a sole owner. */
  soleOwnerPct?: number;
  /** Page in the Sunset Review the hours table came from. */
  page: number;
}

export const CA_WORKFORCE: CaWorkforceSurvey[] = [
  {
    license: "Barbering",
    slug: "barbering",
    respondents: 615,
    page: 164,
    hours: [
      { band: "9 hours or less", n: 79, pct: 12.8 },
      { band: "10 to 19 hours", n: 68, pct: 11.1 },
      { band: "20 to 29 hours", n: 78, pct: 12.7 },
      { band: "30 to 39 hours", n: 123, pct: 20.0 },
      { band: "40 or more hours", n: 206, pct: 33.5 },
      { band: "Missing", n: 61, pct: 9.9 },
    ],
    lowClientLoad: { pct: 53, band: "0 to 10 clients per day" },
  },
  {
    license: "Esthetics",
    slug: "esthetics",
    respondents: 2686,
    page: 334,
    hours: [
      { band: "9 hours or less", n: 792, pct: 29.5 },
      { band: "10–19 hours", n: 301, pct: 11.2 },
      { band: "20–29 hours", n: 492, pct: 18.3 },
      { band: "30–39 hours", n: 416, pct: 15.5 },
      { band: "40 or more hours", n: 233, pct: 8.7 },
      { band: "Missing", n: 452, pct: 16.8 },
    ],
    lowClientLoad: { pct: 59.8, band: "0–5 clients per day" },
    soleOwnerPct: 41.5,
  },
  {
    license: "Manicuring",
    slug: "manicuring",
    respondents: 0, // total not transcribed; only the two published shares below
    page: 427,
    hours: [{ band: "40 or more hours", n: 0, pct: 13.2 }],
    lowClientLoad: { pct: 52.2, band: "0–5 clients per day" },
  },
  {
    license: "Electrology",
    slug: "electrology",
    respondents: 0,
    page: 250,
    hours: [{ band: "40 or more hours", n: 12, pct: 11.0 }],
    lowClientLoad: { pct: 54.1, band: "0–5 clients per day" },
  },
];

export function caWorkforce(slug: CaWorkforceSurvey["slug"]): CaWorkforceSurvey {
  const found = CA_WORKFORCE.find((w) => w.slug === slug);
  if (!found) throw new Error(`No California workforce survey for "${slug}"`);
  return found;
}

/** The 40-or-more band, which is the one every salary estimate assumes. */
export function fullTimePct(slug: CaWorkforceSurvey["slug"]): number {
  return caWorkforce(slug).hours.find((h) => h.band.startsWith("40"))!.pct;
}
