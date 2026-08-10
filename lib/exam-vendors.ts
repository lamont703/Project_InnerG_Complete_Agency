/**
 * Who administers each state's barber & cosmetology licensing exam.
 *
 * WHY THIS EXISTS. Nobody publishes this in one place, and it decides
 * something that shows up in our own data: exam WORDING comes from the
 * administrator, not the textbook. Texas candidates pass the practical at
 * 92.34% and the written at 56.98% first attempt (lib/texas-exam-stats.ts).
 * If part of that gap is Milady's plain language against PSI's register —
 * double negatives, terms absent from the textbook — then it is
 * administrator-specific, and a student crossing a state line is crossing
 * question styles.
 *
 * DEVELOPER IS NOT ADMINISTRATOR. Most states use exams developed by NIC
 * (National-Interstate Council) and administered by someone else. Delaware
 * names both on one page, which is the clearest example. `vendor` here is
 * always the ADMINISTRATOR — who runs the test centre and publishes the
 * candidate information bulletin.
 *
 * SOURCING RULE, and it is the whole point of the file: `boardUrl` must be
 * the STATE BOARD's own page naming the vendor. Vendor-side evidence (PSI or
 * Prometric publishing a client page) is recorded as `vendorUrl` and is NOT
 * sufficient on its own — those lists go stale and at least one is already
 * wrong. PSI's marketing page appears to name Washington, Georgia and Idaho,
 * but those are logos for their Insurance Commissioner, Real Estate
 * Commission and Department of Insurance respectively. None are cosmetology
 * boards.
 *
 * Where the two disagree, the board wins.
 */

export type ExamVendor =
  | "PSI"
  | "Pearson VUE"
  | "PCS" // Professional Credential Services
  | "Prometric"
  | "state-administered"
  | "unknown";

export interface StateExamVendor {
  /** Two-letter postal code. */
  state: string;
  /** Administrator of the written exam. */
  written: ExamVendor;
  /**
   * Administrator of the practical, where one is required. `null` means the
   * state does not require a practical at all — which is a real answer, not a
   * gap. California abolished its practical on 1 Jan 2022.
   */
  practical: ExamVendor | null;
  /** The board's OWN page naming the vendor. The bar for `confirmed`. */
  boardUrl?: string;
  /** What the board page actually says. Quote, don't paraphrase. */
  quote?: string;
  /** Vendor-published evidence. Supporting only — never sufficient alone. */
  vendorUrl?: string;
  /**
   * confirmed  — the board's own page names the vendor
   * vendor-only — only the vendor claims it; board page not yet found
   * contested  — two sources disagree; do not publish
   * unchecked  — not yet researched
   */
  confidence: "confirmed" | "vendor-only" | "contested" | "unchecked";
  /** ISO date the source above was last read. */
  checked?: string;
  notes?: string;
}

export const STATE_EXAM_VENDORS: StateExamVendor[] = [
  {
    state: "CA",
    written: "PSI",
    practical: null,
    boardUrl: "https://www.barbercosmo.ca.gov/applicants/national.shtml",
    quote:
      "Effective July 1, 2022, the Board began offering the national examination developed by PSI services for all license types.",
    confidence: "confirmed",
    checked: "2026-08-09",
    notes:
      "No practical at all: 'Effective January 1, 2022, the practical exam is no longer required for all license types.' PSI's own page lists CA as 'theory only', which reads like a scope limit but is really the absence of a practical — the kind of thing vendor-side sourcing gets subtly wrong.",
  },
  {
    state: "TX",
    written: "PSI",
    practical: "PSI",
    boardUrl:
      "https://www.tdlr.texas.gov/barbering-and-cosmetology/individuals/examinations/",
    quote: "Exam administration by PSI on TDLR's behalf.",
    confidence: "confirmed",
    checked: "2026-08-09",
    notes:
      "Also settled in lib/tdlr-sources.ts (`examinations` entry). Texas is NOT on PSI's national-exam list because TDLR uses a Texas-specific exam PSI administers — same vendor, different paper.",
  },
  {
    state: "MD",
    written: "PSI",
    practical: "PSI",
    boardUrl: "https://labor.maryland.gov/license/cos/cosexam.shtml",
    quote: "PSI Services provides examination services for the State Board of Cosmetologists.",
    confidence: "confirmed",
    checked: "2026-08-09",
  },
  {
    state: "FL",
    written: "Pearson VUE",
    practical: "Pearson VUE",
    boardUrl: "https://www2.myfloridalicense.com/cosmetology/",
    vendorUrl: "https://www.pearsonvue.com/us/en/fl/dbpr/cosmetology.html",
    confidence: "confirmed",
    checked: "2026-08-09",
    notes: "Pearson VUE publishes separate FL client pages for cosmetology and barbers.",
  },
  {
    state: "DE",
    written: "Prometric",
    practical: "Prometric",
    boardUrl: "https://dpr.delaware.gov/boards/cosmetology/cosmoexam/",
    vendorUrl: "https://www.prometric.com/exams/nicde/",
    confidence: "confirmed",
    checked: "2026-08-09",
    notes:
      "Board page names Prometric AND NIC together — the clearest example in this file of developer and administrator being different companies.",
  },

  // ---- Vendor-claimed, board page not yet located --------------------------
  // PSI's national-exam page lists these seven for theory AND practical.
  // Each still needs its board's own page before it is publishable.
  ...(["AL", "CO", "GA", "KY", "MI", "TN"] as const).map((state) => ({
    state,
    written: "PSI" as ExamVendor,
    practical: "PSI" as ExamVendor,
    vendorUrl: "https://www.psiexams.com/test-takers/psi-cosmetology-barber-national-exams/",
    confidence: "vendor-only" as const,
    checked: "2026-08-09",
    notes: "Listed on PSI's national-exam page for theory and practical. Board page outstanding.",
  })),
  {
    state: "MA",
    written: "PSI",
    practical: null,
    vendorUrl: "https://www.psiexams.com/test-takers/psi-cosmetology-barber-national-exams/",
    confidence: "vendor-only",
    checked: "2026-08-09",
    notes:
      "PSI lists MA as theory-only. Whether that means no practical exists (as in CA) or that someone else runs it is exactly what the board page has to settle.",
  },
  {
    state: "MN",
    written: "PSI",
    practical: "PSI",
    vendorUrl: "https://proctor2.psionline.com/media/programs/704.pdf",
    confidence: "vendor-only",
    checked: "2026-08-09",
    notes: "PSI hosts a Minnesota Board of Cosmetology candidate information bulletin.",
  },
  {
    state: "NV",
    written: "Pearson VUE",
    practical: "Pearson VUE",
    vendorUrl: "https://www.pearsonvue.com/us/en/nv/cosmetology.html",
    confidence: "vendor-only",
    checked: "2026-08-09",
  },
  {
    state: "PA",
    written: "Pearson VUE",
    practical: "Pearson VUE",
    vendorUrl: "https://www.pearsonvue.com/us/en/pa/cosmetology.html",
    confidence: "vendor-only",
    checked: "2026-08-09",
  },
  {
    state: "NJ",
    written: "Prometric",
    practical: "Prometric",
    vendorUrl: "https://www.prometric.com/exams/njsbch/",
    confidence: "vendor-only",
    checked: "2026-08-09",
  },
  {
    state: "NM",
    written: "PCS",
    practical: "PCS",
    vendorUrl: "https://pcshq.com/cosmetology-barbering-new-mexico/",
    confidence: "vendor-only",
    checked: "2026-08-09",
    notes: "pcshq.com 403s automated requests and has a broken cert chain; read via search result.",
  },
  {
    state: "VA",
    written: "PCS",
    practical: "PCS",
    vendorUrl: "https://pr.pcshq.com/?page=vacibco12.pdf",
    confidence: "vendor-only",
    checked: "2026-08-09",
    notes: "Bulletin states the Board contracted with Professional Credential Services.",
  },

  {
    state: "NY",
    written: "state-administered",
    practical: "state-administered",
    boardUrl: "https://dos.ny.gov/appearance-enhancement-written-examination-procedures",
    quote:
      "Any decisions regarding disciplinary measures will be made by the Examination Unit Supervisor at the Department of State.",
    confidence: "vendor-only",
    checked: "2026-08-09",
    notes:
      "Strongly implies the Department of State runs its own exam — it has an Examination Unit — but the page never names an administrator, so this is NOT confirmed to the standard of the entries above. Secondary sources claim NY self-administers in 14+ languages; unverified. Needs a page that says so outright.",
  },

  // ---- Contested — do not publish until the board settles it ---------------
  {
    state: "AZ",
    written: "unknown",
    practical: "unknown",
    confidence: "contested",
    checked: "2026-08-09",
    notes:
      "PCS publishes an Arizona cosmetology bulletin (www1.pcshq.com/?page=azcos092024.pdf) AND Prometric publishes prometric.com/exams/azcos/. Both cannot be current. bcb.az.gov returned a 5.6KB shell to a plain fetch — needs a rendered browser or a human.",
  },
  {
    state: "HI",
    written: "unknown",
    practical: "unknown",
    confidence: "contested",
    checked: "2026-08-09",
    notes:
      "PSI's national-exam page lists HI as theory-only, but Prometric publishes a Hawaii cosmetology CIB (prometric.com/files/HICosmetologyCIB.pdf). One is stale.",
  },
];

/** Jurisdictions with no entry above. 31 of 51 outstanding. */
export const UNCHECKED_STATES = [
  "AK", "AR", "CT", "DC", "IA", "ID", "IL", "IN", "KS", "LA", "ME", "MO",
  "MS", "MT", "NC", "ND", "NE", "NH", "OH", "OK", "OR", "RI", "SC",
  "SD", "UT", "VT", "WA", "WI", "WV", "WY",
] as const;

/**
 * WHAT DOES NOT WORK — recorded so nobody burns the time again.
 *
 *   NIC (nictesting.org) ....... member list is behind a login.
 *   PSI licensure page ......... marketing; the "states" are client logos from
 *                                other industries entirely.
 *   PSI test-taker API ......... /api/content/jurisdictions, /api/jurisdictions,
 *                                /api/content/programs and /api/content/catalog
 *                                all return the same 2,289-byte SPA shell.
 *   pcshq.com .................. broken cert chain AND 403 to automated
 *                                requests. Even -k gets 403.
 *   prometric.com/sitemap.xml .. 403.
 *   Pearson VUE URL guessing ... the /us/en/{st}/cosmetology.html pattern
 *                                resolves for only PA and NV out of 51, so a
 *                                404 there proves nothing. Their US sitemap
 *                                lists just four cosmetology/barber client
 *                                pages total — probably their whole book here.
 *   Board LANDING pages ........ do not name the vendor. 42 probed: Arkansas
 *                                281KB, Iowa 421KB, Mississippi 128KB, Utah
 *                                145KB — all real pages, no vendor named. It
 *                                lives on a deeper examination page whose path
 *                                differs per state, and guessing those paths
 *                                failed on 25 of 25.
 *   Secondary aggregators ...... contradict each other. One search returned
 *                                "38 states use NIC", a 34-state list, and a
 *                                third different list.
 *
 * The method that works is one search per state to locate the board's
 * examination page, then read who it names.
 */
