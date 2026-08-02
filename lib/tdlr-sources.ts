/**
 * TDLR pages we treat as authoritative, and what each one actually settles.
 *
 * This exists because "sourced from TDLR" is a claim the site makes on a dozen
 * pages, and a claim like that is only worth something if the specific document
 * behind each figure is written down. Without this list the provenance lives in
 * whoever wrote the page, which is how the barber pass rate stayed wrong for
 * months (see lib/texas-exam-stats.ts).
 *
 * HOW TO USE IT. Before stating a fee, a deadline, a CE requirement or a rule
 * number on a public page, fetch the page named here and check. Do not carry a
 * number across from a sibling page — the specialty licences differ from the
 * operator licences more than they look like they should.
 *
 * WHAT IS NOT SETTLED. Whether specialty licence holders (esthetician,
 * manicurist, eyelash extension, hair weaving) must complete the 4 hours of
 * continuing education is NOT answered by any of these pages. The Barbering &
 * Cosmetology at-a-glance PDF says "all Barber and Cosmetology Operators
 * licensees"; the continuing-education page says "your license" with no
 * qualifier. Three separate fetches did not resolve it. Any page that needs
 * this must say it is unresolved and point the reader at TDLR, not guess.
 */

export interface TdlrSource {
  /** Short key used when citing this in a page comment. */
  id: string;
  url: string;
  title: string;
  /** What this page is the authority for. */
  settles: string[];
  /** When we last read it. */
  checked: string;
}

export const TDLR_SOURCES: TdlrSource[] = [
  {
    id: "individual-renew",
    url: "https://www.tdlr.texas.gov/barbering-and-cosmetology/individuals/renew/",
    title: "Renew Your Barbering or Cosmetology License",
    settles: [
      "The renewal entry point for every individual licence type",
      "Screening questionnaire that routes a licensee to their instructions",
    ],
    checked: "2026-08-02",
  },
  {
    id: "establishment-renew",
    url: "https://www.tdlr.texas.gov/barbering-and-cosmetology/establishments/renew.htm",
    title: "Renew a Barbering or Cosmetology Establishment License",
    settles: ["Establishment renewal requirements", "Establishment renewal fee ($78)"],
    checked: "2026-08-02",
  },
  {
    id: "mobile-establishment-renew",
    url: "https://www.tdlr.texas.gov/barbering-and-cosmetology/establishments/renew-mobile-establishment.htm",
    title: "Renew a Mobile Barbering or Cosmetology Establishment License",
    settles: ["Mobile establishment renewal — a separate licence from a fixed establishment"],
    checked: "2026-08-02",
  },
  {
    id: "school-renew",
    url: "https://www.tdlr.texas.gov/barbering-and-cosmetology/schools/renew.htm",
    title: "Renew a Barbering or Cosmetology School License",
    settles: ["School licence renewal, which is distinct from practitioner and establishment renewal"],
    checked: "2026-08-02",
  },
  {
    id: "oag-license-denial",
    url: "https://www.tdlr.texas.gov/barbering-and-cosmetology/oag-license-denial.htm",
    title: "License Denial for Non-Payment of Child Support",
    settles: [
      "The four triggers for non-renewable status: 3+ months child support arrears, missed repayment schedule, failure to appear after subpoena, non-compliance with a possession/access order",
      "Only the OAG Child Support Division can lift it — TDLR cannot",
      "20 days to petition for a hearing after a suspension notice",
      "Nothing here concerns student loan default — that is a separate matter and not a TDLR trigger",
    ],
    checked: "2026-08-02",
  },
  {
    id: "bac-at-a-glance",
    url: "https://www.tdlr.texas.gov/media/pdf/BAC%20at%20a%20Glance.pdf",
    title: "Barbering & Cosmetology At A Glance (PDF)",
    settles: [
      "CE from 1 Sep 2025: 4 hours — 1 sanitation, 1 human trafficking awareness, 2 elective from §83.202",
      "States the requirement for 'Barber and Cosmetology Operators licensees' — does NOT name specialty licences",
    ],
    checked: "2026-08-02",
  },
  {
    id: "continuing-education",
    url: "https://www.tdlr.texas.gov/barbering-and-cosmetology/individuals/continuing-education.htm",
    title: "Continuing Education Requirements for Barbers and Cosmetologists",
    settles: ["4 hours every two years", "Confirms the two-year renewal cycle"],
    checked: "2026-08-02",
  },
];

export const TDLR_RENEW_URL = TDLR_SOURCES[0].url;
export const TDLR_OAG_URL = TDLR_SOURCES[4].url;

/** Verified renewal figures shared by every specialty practitioner licence. */
export const SPECIALTY_RENEWAL = {
  /** On-time renewal fee. Same $50 across all specialty practitioner licences. */
  feeUsd: 50,
  /** Renewal term in years. */
  termYears: 2,
  /**
   * Late tiers, as multipliers of the base fee. Taken from the rule rather than
   * from a sibling page — /texas-barber-license-renewal currently states the
   * bands differently ("$75 under 18 months") and is worth re-checking.
   */
  late: [
    { label: "Expired 90 days or less", multiplier: 1.5, feeUsd: 75 },
    { label: "Expired more than 90 days but under 18 months", multiplier: 2, feeUsd: 100 },
  ],
  /** Beyond this the licence generally cannot be renewed. */
  cannotRenewAfterMonths: 18,
} as const;
