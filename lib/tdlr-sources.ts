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
  {
    id: "individuals-apply",
    url: "https://www.tdlr.texas.gov/barbering-and-cosmetology/individuals/apply.htm",
    title: "Apply for a Barber or Cosmetologist License",
    settles: ["Entry point for every individual licence application"],
    checked: "2026-08-02",
  },
  {
    id: "apply-barber",
    url: "https://www.tdlr.texas.gov/barbering-and-cosmetology/individuals/apply-barber.htm",
    title: "Apply for a Class A Barber License",
    settles: ["1,000 hours", "17 minimum age", "$50 non-refundable", "written eligible at 900 hours, practical after all hours + written passed"],
    checked: "2026-08-02",
  },
  {
    id: "apply-cosmetologist",
    url: "https://www.tdlr.texas.gov/barbering-and-cosmetology/individuals/apply-cosmetologist.htm",
    title: "Apply for a Cosmetology Operator License",
    settles: ["1,000 hours", "17 minimum age", "$50", "same 900-hour written eligibility as barber"],
    checked: "2026-08-02",
  },
  {
    id: "apply-esthetician",
    url: "https://www.tdlr.texas.gov/barbering-and-cosmetology/individuals/apply-esthetician.htm",
    title: "Apply for an Esthetician License",
    settles: ["750 hours", "17 minimum age", "$50"],
    checked: "2026-08-02",
  },
  {
    id: "apply-manicurist",
    url: "https://www.tdlr.texas.gov/barbering-and-cosmetology/individuals/apply-manicurist.htm",
    title: "Apply for a Manicurist License",
    settles: ["600 hours", "17 minimum age", "$50"],
    checked: "2026-08-02",
  },
  {
    id: "apply-eyelash",
    url: "https://www.tdlr.texas.gov/barbering-and-cosmetology/individuals/apply-eyelash.htm",
    title: "Apply for an Eyelash Extension Specialist License",
    settles: ["320 hours", "17 minimum age", "$50"],
    checked: "2026-08-02",
  },
  {
    id: "apply-weaving",
    url: "https://www.tdlr.texas.gov/barbering-and-cosmetology/individuals/apply-weaving.htm",
    title: "Apply for a Hair Weaving Specialist License",
    settles: ["300 hours — the shortest course TDLR licenses", "17 minimum age", "$50"],
    checked: "2026-08-02",
  },
  {
    id: "barber-to-cosmetologist",
    url: "https://www.tdlr.texas.gov/barbering-and-cosmetology/individuals/barber-to-cosmetologist.htm",
    title: "Barber to Cosmetology Operator",
    settles: ["300 crossover hours", "$50", "both exams", "barber licence must be current, active and in good standing"],
    checked: "2026-08-02",
  },
  {
    id: "cosmetologist-to-barber",
    url: "https://www.tdlr.texas.gov/barbering-and-cosmetology/individuals/cosmetologist-to-barber.htm",
    title: "Cosmetologist to Class A Barber",
    settles: ["300 crossover hours", "$50", "both exams", "cosmetology licence must be current, active and in good standing"],
    checked: "2026-08-02",
  },
  {
    id: "out-of-state",
    url: "https://www.tdlr.texas.gov/barbering-and-cosmetology/individuals/out-of-state/",
    title: "Licensed in Another State",
    settles: ["The equivalence pathway for out-of-state applicants — a different route from the standard application"],
    checked: "2026-08-02",
  },
  {
    id: "examinations",
    url: "https://www.tdlr.texas.gov/barbering-and-cosmetology/individuals/examinations/",
    title: "Barbering and Cosmetology Examinations",
    settles: ["Exam administration by PSI on TDLR's behalf"],
    checked: "2026-08-02",
  },
  {
    id: "establishments-apply",
    url: "https://www.tdlr.texas.gov/barbering-and-cosmetology/establishments/apply.htm",
    title: "Apply for an Establishment License",
    settles: [
      "Full-service $78, specialty $78, mini $70",
      "All requirements within one year or the application is void",
      "No living or sleeping on licensed premises; a residence-attached shop needs its own entrance and the connecting door closed in business hours",
    ],
    checked: "2026-08-02",
  },
  {
    id: "mini-establishment",
    url: "https://www.tdlr.texas.gov/barbering-and-cosmetology/establishments/mini-faq.htm",
    title: "Mini-Establishment FAQ",
    settles: [
      "A room or suite leased inside a licensed establishment, enclosed and separate from common areas",
      "May only perform services the HOST establishment is licensed for — it cannot hold its own specialty scope",
      "Host owner remains responsible for common areas and shared equipment",
      "16 TAC 83.71",
    ],
    checked: "2026-08-02",
  },
  {
    id: "mobile-establishment",
    url: "https://www.tdlr.texas.gov/barbering-and-cosmetology/establishments/apply-mobile-establishment.htm",
    title: "Apply for a Mobile Establishment License",
    settles: [
      "$78",
      "Self-contained, self-supporting, enclosed mobile unit",
      "Permanent address for dispatch and storage; GPS tracking OR weekly itineraries filed 7+ days ahead",
      "Onboard water heater, fresh water tank for a full day, functioning restroom at the service location",
      "No services outside the unit or while in motion; furniture anchored; records kept one year",
    ],
    checked: "2026-08-02",
  },
  {
    id: "schools-apply",
    url: "https://www.tdlr.texas.gov/barbering-and-cosmetology/schools/apply.htm",
    title: "Apply for a School License",
    settles: [
      "$580 including the inspection",
      "One application for both barber and cosmetology — you select which curricula to offer",
      "Private schools: proof of ownership or a 12-month lease, plus a CPA financial statement",
      "Public schools: curriculum approval applications only",
    ],
    checked: "2026-08-02",
  },
  {
    id: "barber-license-video",
    url: "https://youtu.be/BCVWaojZV_E",
    title: "TDLR video — barbering and cosmetology licensing",
    settles: ["Supplied by the client as background context; not used as a source for any figure"],
    checked: "2026-08-02",
  },
  {
    id: "school-distance-education",
    url: "https://www.tdlr.texas.gov/barbering-and-cosmetology/schools/distance-education-responsibilities.htm",
    title: "School Distance Education Responsibilities",
    settles: [
      "The definition of distance education — theory only, student and instructor separated by physical distance",
      "That distance education does NOT satisfy the practical portion of any curriculum",
      "The five school duties: account for hours, grant credit only per Chapter 83, maintain documents, track by the same method used for in-person attendance, report electronically",
      "That distance hours are the only hours completable without an instructor physically present",
    ],
    checked: "2026-08-03",
  },
  {
    // The cap is NOT on the distance-education page — that page says inspectors
    // confirm "approved hour limits" without publishing one. It is on each
    // course-approval application, which is why all eight were read separately.
    id: "school-course-applications",
    url: "https://www.tdlr.texas.gov/barbering-and-cosmetology/schools/forms.htm",
    title: "Course-approval applications — all eight course types",
    settles: [
      "The 50% cap — schools may not designate more than 50% of a course's total hours as theory delivered via distance education, per 16 TAC §83.202(e)(1)",
      "That a school must NAME the learning management system it will use, on the application",
      "Per-course totals: barber 1,000, cosmetology 1,000, esthetician 750, manicurist 600, eyelash 320, hair weaving 300",
      "That the §83.202 subsections cited DIFFER by course — barber (a)(1)+(a)(3), cosmetology (a)(1)+(a)(2), esthetician (d)(1)",
    ],
    checked: "2026-08-03",
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
