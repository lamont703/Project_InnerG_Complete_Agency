/**
 * California Board of Barbering & Cosmetology sources, and what each settles.
 *
 * The California counterpart to lib/tdlr-sources.ts, and it exists for the same
 * reason: "sourced from the board" is worth nothing unless the specific
 * document behind each figure is written down.
 *
 * READ THE TEXAS WARNING FIRST, THEN IGNORE THE TEXAS NUMBERS. Nothing in
 * lib/tdlr-sources.ts applies here. Two of the five hour requirements below
 * differ from their Texas equivalents, and one matches exactly — which is the
 * dangerous part, because a matching cosmetology figure makes the others look
 * safe to copy. Texas esthetician is 750 hours; California is 600. Texas
 * manicurist is 600; California is 400.
 *
 * CAPS ARE NOT PRICES. Every fee in BPC 7423 reads "not more than". The board
 * sets the actual amount underneath the cap, so these are ceilings and must
 * never be published as the fee. The delinquency fee is the exception: it is
 * defined as a formula, so it is exact.
 *
 * FETCHING THESE. barbercosmo.ca.gov and leginfo.legislature.ca.gov both fail
 * TLS verification from this environment — "unable to get local issuer
 * certificate" — and need `curl -k`. That is not a sign the site is down; it is
 * the fourth regulator site in this repo to behave that way, after TDLR, NACCAS
 * and PCS. A browser has the full chain and opens them fine.
 */

export interface CaSource {
  /** Short key for citing this in a page comment. */
  id: string;
  url: string;
  title: string;
  /** What this document is the authority for. */
  settles: string[];
  /** When we last read it. */
  checked: string;
}

export const CA_SOURCES: CaSource[] = [
  {
    id: "bpc-7362-5",
    url: "https://leginfo.legislature.ca.gov/faces/codes_displaySection.xhtml?lawCode=BPC&sectionNum=7362.5",
    title: "BPC 7362.5 — Hours of Practical Training and Technical Instruction",
    settles: ["Barbering or cosmetology: not less than 1,000 hours"],
    checked: "2026-08-10",
  },
  {
    id: "bpc-7363",
    url: "https://leginfo.legislature.ca.gov/faces/codes_displaySection.xhtml?lawCode=BPC&sectionNum=7363.",
    title: "BPC 7363 — Hairstylist Course; Hours of Practical Training",
    settles: [
      "Hairstylist: not less than 600 hours",
      "That California licenses a Hairstylist at all — there is no Texas equivalent",
    ],
    checked: "2026-08-10",
  },
  {
    id: "bpc-7364",
    url: "https://leginfo.legislature.ca.gov/faces/codes_displaySection.xhtml?lawCode=BPC&sectionNum=7364.",
    title: "BPC 7364 — Skin Care Course; Hours of Practical Training",
    settles: ["Esthetician / skin care: not less than 600 hours (Texas is 750 — do not carry it across)"],
    checked: "2026-08-10",
  },
  {
    id: "bpc-7365",
    url: "https://leginfo.legislature.ca.gov/faces/codes_displaySection.xhtml?lawCode=BPC&sectionNum=7365.",
    title: "BPC 7365 — Nail Care Course; Hours of Practical Training",
    settles: ["Manicurist / nail care: not less than 400 hours (Texas is 600 — do not carry it across)"],
    checked: "2026-08-10",
  },
  {
    id: "bpc-7366",
    url: "https://leginfo.legislature.ca.gov/faces/codes_displaySection.xhtml?lawCode=BPC&sectionNum=7366.",
    title: "BPC 7366 — Electrolysis Course; Hours of Practical Training",
    settles: [
      "Electrolysis: not less than 600 hours",
      "That California licenses an Electrologist — no Texas equivalent",
    ],
    checked: "2026-08-10",
  },
  {
    id: "bpc-7415",
    url: "https://leginfo.legislature.ca.gov/faces/codes_displaySection.xhtml?lawCode=BPC&sectionNum=7415.",
    title: "BPC 7415 — Expiration of Licenses",
    settles: [
      "Two-year licence period",
      "Expires at midnight on the last day of the month of issuance — NOT a fixed calendar date",
    ],
    checked: "2026-08-10",
  },
  {
    id: "bpc-7417",
    url: "https://leginfo.legislature.ca.gov/faces/codes_displaySection.xhtml?lawCode=BPC&sectionNum=7417.",
    title: "BPC 7417 — Renewal Period for Expired License",
    settles: ["An expired licence may be renewed within five years on payment of accrued renewal and delinquency fees"],
    checked: "2026-08-10",
  },
  {
    id: "bpc-7423",
    url: "https://leginfo.legislature.ca.gov/faces/codes_displaySection.xhtml?lawCode=BPC&sectionNum=7423.",
    title: "BPC 7423 — Fee Schedule Relating to Individual Practice",
    settles: [
      "CAPS ONLY, all phrased 'not more than' — never publish these as the fee",
      "Individual practitioner renewal: max $50",
      "Initial: cosmetologist / barber / electrologist / hairstylist max $50, esthetician max $40, manicurist max $35",
      "Apprentice application and licence: max $25",
      "Delinquency fee: 50% of the renewal fee in effect — a formula, so this one IS exact",
    ],
    checked: "2026-08-10",
  },
  {
    id: "act-regs-book",
    url: "https://www.barbercosmo.ca.gov/laws_regs/act_regs.pdf",
    title: "Barbering and Cosmetology Act and Regulations (164pp, revised 2026)",
    settles: [
      "NO CONTINUING EDUCATION REQUIREMENT — see the note below",
      "Establishment: initial max $80, renewal max $40",
      "The complete Act (145 BPC sections) and 16 CCR Division 9 (80 sections) in one document",
    ],
    checked: "2026-08-10",
  },
  {
    id: "exam-national",
    url: "https://www.barbercosmo.ca.gov/applicants/national.shtml",
    title: "Information Regarding the Examination",
    settles: [
      "PSI administers: 'the Board began offering the national examination developed by PSI services for all license types', effective 1 July 2022",
      "NO PRACTICAL EXAM: 'Effective January 1, 2022, the practical exam is no longer required for all license types'",
    ],
    checked: "2026-08-09",
  },
  {
    id: "psi-cib",
    url: "https://test-takers.psiexams.com/cabacos",
    title: "PSI Candidate Information Bulletin — California BBC (© April 2026)",
    settles: [
      "Written exam only; scheduling, ID and site rules",
      "The PSI portal candidates actually use",
    ],
    checked: "2026-08-09",
  },
  {
    id: "psi-2026-outlines",
    url: "https://www.barbercosmo.ca.gov",
    title: "Board letter to schools — exam update effective 1 April 2026 (dated 21 Nov 2025)",
    settles: [
      "New PSI content outlines took effect 1 April 2026 after a new validation study",
      "2020 vs 2025 topic weightings for all five licences",
      "Exam structures: cosmetologist 110q/2h, barber 95q/2h, esthetician 85q/1.5h, nail technician 65q/1.5h, electrologist 55q/1.5h",
    ],
    checked: "2026-08-09",
  },
  {
    id: "sunset-2026-table4",
    url: "https://www.barbercosmo.ca.gov",
    title: "2026 Sunset Review Report, Tables 3–4 — Fee Schedule and Revenue (data as of 17 Nov 2025)",
    settles: [
      "The ACTUAL fees charged, not the statutory caps — the board's own report to the Legislature",
      "Renewal is $50 for every individual licence type; delinquency renewal $25",
      "Application and exam fee $75 (barber, cosmetology, esthetician, electrologist, manicurist)",
      "Hairstylist exam fee: NONE",
      "Initial licence: barber/cosmetology/electrologist/hairstylist $50, esthetician $40, manicurist $35",
      "Establishment: licence $50 against an $80 cap — the one fee charged BELOW its statutory limit",
      "Establishment renewal $40, delinquency $20; mobile unit renewal $40",
      "Apprenticeship licence $25; duplicate licence $10",
      "FY21/22 and FY22/23 revenue is depressed by COVID-era renewal fee waivers — do not read it as a decline in licensees",
    ],
    checked: "2026-08-10",
  },
  {
    id: "bpc-7321-7330",
    url: "https://leginfo.legislature.ca.gov/faces/codes_displaySection.xhtml?lawCode=BPC&sectionNum=7321.",
    title: "BPC 7321, 7321.5, 7322, 7324, 7326, 7330 — Qualifications for Admittance to Examination",
    settles: [
      "Minimum age 17 for every licence type",
      "10th grade or equivalent for cosmetology, barbering, hairstylist, esthetician and manicurist",
      "ELECTROLOGIST IS 12th GRADE — the only licence with a different education bar, in 7330(b)",
      "The four routes to the exam: approved-school course, out-of-state practice, crossover, apprenticeship",
      "Out-of-state practice converts at three months = 100 hours of training",
      "Cosmetology and barbering have a crossover course between them; the specialty licences do not",
      "Electrology additionally requires 18 months of out-of-state practice to use that route (7330(d)(2))",
    ],
    checked: "2026-08-10",
  },
  {
    id: "bpc-7316-7320-5",
    url: "https://leginfo.legislature.ca.gov/faces/codes_displaySection.xhtml?lawCode=BPC&sectionNum=7316.",
    title: "BPC 7316 — Scope of Practice; and BPC 7320.5 — Laser Treatment a Misdemeanor",
    settles: [
      "What skin care legally is: improving the appearance of the skin by means 'that do not result in the ablation or destruction of the live tissue' (7316(c)(1))",
      "Hair removal is permitted by depilatory, tweezers, sugaring, nonprescription chemical, waxing or devices — 'except by the use of lasers or light waves, which are commonly known as rays' (7316(c)(3))",
      "BPC 7320.5 in full: 'Any licensee who uses a laser in the treatment of any human being is guilty of a misdemeanor.' Note LICENSEE — it binds every licence type, not just estheticians",
      "Nail care scope runs elbow-to-fingertips and knee-to-toes (7316(d))",
      "Eyelash and brow tinting, perming and application sit in BOTH the cosmetology and skin care scopes",
    ],
    checked: "2026-08-10",
  },
  {
    id: "license-applications",
    url: "https://www.barbercosmo.ca.gov/applicants/",
    title: "Board licence applications (one per licence type)",
    settles: [
      "The forms confirm the statutory bars: 'Must be at least 17 years old' on all six",
      "The electrologist form asks about the 12th grade where the other five ask about the 10th — corroborating BPC 7330 rather than being a form quirk",
      "Proof of Training document is what an approved-school graduate files",
    ],
    checked: "2026-08-10",
  },
  {
    id: "breeze",
    url: "https://www.breeze.ca.gov",
    title: "BreEZe — DCA online licensing system",
    settles: [
      "Where renewal is actually done. NOT on barbercosmo.ca.gov — which is why the 'renewal online' searches exist and what a renewal page must link to first",
    ],
    checked: "2026-08-10",
  },
];

/**
 * Hour requirements, by licence. Each traces to its own BPC section above.
 * Do not add a row without reading the section it comes from.
 */
export const CA_TRAINING_HOURS = [
  { license: "Barbering", hours: 1000, source: "bpc-7362-5" },
  { license: "Cosmetology", hours: 1000, source: "bpc-7362-5" },
  { license: "Hairstylist", hours: 600, source: "bpc-7363" },
  { license: "Esthetician (Skin Care)", hours: 600, source: "bpc-7364" },
  { license: "Manicurist (Nail Care)", hours: 400, source: "bpc-7365" },
  { license: "Electrologist", hours: 600, source: "bpc-7366" },
] as const;

/**
 * Who may sit each exam, from BPC 7321 / 7321.5 / 7322 / 7324 / 7326 / 7330.
 *
 * ELECTROLOGY IS THE OUTLIER AND IT IS EASY TO MISS. Five licences ask for the
 * 10th grade; electrology asks for the 12th. It was noticed because the
 * electrologist application form asks a different question from the other
 * five, and confirmed in 7330(b) — so it is law, not a form quirk. Publishing
 * "17 and 10th grade" as California's requirement, which is how every summary
 * on the web puts it, is wrong for one licence in six.
 *
 * THE FOUR ROUTES ARE THE OTHER UNDER-REPORTED PART. Everyone writes up the
 * approved-school route. The statute lists three more, including one that
 * converts prior out-of-state work into hours at a fixed rate: "Each three
 * months of practice shall be deemed the equivalent of 100 hours of training."
 * That is 400 hours a year of credit for someone who has been working, which
 * changes the arithmetic completely for an experienced practitioner moving to
 * California — and it is not on the board's own summary pages.
 */
export const CA_ELIGIBILITY = {
  minimumAge: 17,
  /** Grade completed, or equivalent. Electrology is the exception. */
  grade: { default: 10, electrologist: 12 },
  /** Out-of-state practice credited toward the school-hours route. */
  practiceCredit: { months: 3, hours: 100 },
  /**
   * Electrology alone puts a floor on the out-of-state route: 18 months of
   * practice, per 7330(d)(2). The other five sections state no minimum period.
   */
  electrologyPracticeMinimumMonths: 18,
  source: "bpc-7321-7330",
} as const;

/**
 * Fees actually charged, from Sunset Review Tables 3-4 — NOT the BPC 7423 caps.
 *
 * The board charges its statutory maximum on almost everything, which makes
 * the cap/price distinction look academic until you reach the establishment
 * licence: $50 against an $80 cap. One row in nineteen, and it is the row that
 * proves publishing caps as prices would have been wrong.
 */
export const CA_FEES = {
  applicationAndExam: 75,      // barber, cosmetology, esthetician, electrologist, manicurist
  hairstylistExam: 0,          // the board lists "None"
  initialLicense: { barber: 50, cosmetology: 50, electrologist: 50, hairstylist: 50, esthetician: 40, manicurist: 35 },
  renewalIndividual: 50,       // every individual licence type
  delinquencyIndividual: 25,   // 50% of renewal
  establishment: { initial: 50, renewal: 40, delinquency: 20, statutoryCap: 80 },
  apprenticeship: 25,
  duplicate: 10,
  source: "sunset-2026-table4",
} as const;

/**
 * WHAT IS SETTLED, AND WHAT IS NOT.
 *
 * SETTLED — no continuing education requirement.
 *   The complete 164-page Act and Regulations book contains the phrase
 *   "continuing education" exactly ONCE, and conditionally:
 *
 *     "If the license is renewed after its expiration, the licensee, as a
 *      condition precedent to renewal, shall also pay the delinquency fee and
 *      meet current continuing education requirements, IF APPLICABLE,
 *      prescribed by this chapter."
 *
 *   "If applicable, prescribed by this chapter" — and the chapter prescribes
 *   none. There is no CE section among the Act's 145 sections or the 80
 *   regulations, and zero mentions across 301 board documents.
 *
 *   This is a real contrast worth publishing: Texas requires 4 hours every two
 *   years (lib/tdlr-sources.ts, `continuing-education`); California requires
 *   none. Anyone moving between the two needs to know it, and nobody frames it
 *   that way.
 *
 * SETTLED SINCE — the actual renewal fee is $50.
 *   Found in the 2026 Sunset Review Report, Tables 3-4, which prints "Current
 *   Fee Amount" beside "Statutory Limit". It was never on a board web page;
 *   it was on page 21 of a 517-page report to the Legislature. See CA_FEES.
 *
 * SETTLED SINCE — the hour minimums are NOT affected by the 2026 rulemaking.
 *   This was recorded as unsettled on the strength of a filename: "California
 *   Notice of Approval (Effective July 1, 2026).pdf" alongside a Notice of
 *   Proposed Action and a Notice of Modified Text certainly looks like active
 *   rulemaking over the training requirements. It is not. All three documents
 *   concern one section:
 *
 *     16 CCR 972 — Disciplinary Guidelines
 *     OAL Matter 2026-0324-03, approved 6 May 2026, effective 1 July 2026
 *
 *   The hour minimums are in the Business and Professions Code — 7362.5 and
 *   7363 through 7366 — and OAL rulemaking amends the California Code of
 *   Regulations, not statute. Only the Legislature moves those sections, and
 *   they were read directly on 2026-08-10 and are current as of then.
 *
 *   The lesson is the one this file already teaches about fees: a document's
 *   title is not its scope. Three documents were nearly allowed to block the
 *   licence guides over a subject none of them mentions.
 *
 *   Worth knowing separately: the disciplinary guidelines DID change on
 *   1 July 2026. Nothing on the licensing pages depends on it, but anything
 *   written about enforcement or discipline does.
 */
