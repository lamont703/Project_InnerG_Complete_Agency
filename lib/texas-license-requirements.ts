/**
 * What each Texas barbering and cosmetology licence actually requires.
 *
 * Every figure here was read from the TDLR page named in `source`, recorded in
 * lib/tdlr-sources.ts. Nothing is carried across between licence types: the
 * hours range from 300 to 1,000 and the fees from $50 to $580, and the pattern
 * is not what you would guess from the names.
 *
 * The thing worth noticing, and the reason these are separate pages rather than
 * one: a hair weaving specialist trains for 300 hours and a barber for 1,000,
 * yet both pay the same $50 and renew on the same two-year cycle. Someone
 * searching "how do I get a hair weaving licence in Texas" is not served by a
 * page that answers for barbers and mentions them in a footnote.
 */

export interface LicenseRequirement {
  key: string;
  slug: string;
  /** Page and H1 subject, e.g. "Class A Barber". */
  label: string;
  /** How the licence is referred to in a sentence. */
  noun: string;
  category: "individual" | "establishment" | "school" | "transfer";
  /** Course hours required, where the licence is earned by training. */
  hours?: number;
  /** Hours at which written exam eligibility generates, if different from `hours`. */
  writtenEligibleAt?: number;
  minimumAge?: number;
  /** Application fee in USD. */
  feeUsd: number;
  termYears: number;
  /** TDLR page this was read from — the id in TDLR_SOURCES. */
  source: string;
  /** Requirements that don't reduce to a number. */
  conditions: string[];
  /** Related pages on this site. */
  related?: { href: string; label: string }[];
}

export const LICENSE_REQUIREMENTS: LicenseRequirement[] = [
  // ── Individual practitioner licences ──────────────────────────────────────
  {
    key: "barber",
    slug: "texas-barber-license-requirements-guide",
    label: "Class A Barber",
    noun: "Class A Barber licence",
    category: "individual",
    hours: 1000,
    writtenEligibleAt: 900,
    minimumAge: 17,
    feeUsd: 50,
    termYears: 2,
    source: "apply-barber",
    conditions: [
      "Complete a 1,000-hour Class A Barber course at a barbering or cosmetology school licensed in Texas.",
      "Written exam eligibility generates at 900 hours — you can sit it before the course ends.",
      "The practical exam comes only after all 1,000 hours are complete AND the written exam is passed.",
      "Trained outside Texas? You go through the out-of-state equivalence route instead of this one.",
    ],
    related: [
      { href: "/texas-barber-exam-intelligence-prep", label: "Barber Exam Prep" },
      { href: "/texas-barber-state-board-practical-exam-kit-list", label: "Barber Kit List" },
      { href: "/texas-barber-license-renewal", label: "Barber Renewal" },
    ],
  },
  {
    key: "cosmetologist",
    slug: "texas-cosmetology-license-requirements-guide",
    label: "Cosmetology Operator",
    noun: "Cosmetology Operator licence",
    category: "individual",
    hours: 1000,
    writtenEligibleAt: 900,
    minimumAge: 17,
    feeUsd: 50,
    termYears: 2,
    source: "apply-cosmetologist",
    conditions: [
      "Complete a 1,000-hour Cosmetology Operator course at a school licensed in Texas.",
      "Written exam eligibility generates at 900 hours.",
      "The practical exam follows all 1,000 hours and a passed written exam.",
      "Same hours and fee as the Class A Barber licence — the difference is scope of practice, not length.",
    ],
    related: [
      { href: "/texas-cosmetology-exam-intelligence-prep", label: "Cosmetology Exam Prep" },
      { href: "/texas-cosmetology-practical-exam-kit-list", label: "Cosmetology Kit List" },
      { href: "/texas-cosmetology-license-renewal", label: "Cosmetology Renewal" },
    ],
  },
  {
    key: "esthetician",
    slug: "texas-esthetician-license-requirements-guide",
    label: "Esthetician",
    noun: "Esthetician licence",
    category: "individual",
    hours: 750,
    minimumAge: 17,
    feeUsd: 50,
    termYears: 2,
    source: "apply-esthetician",
    conditions: [
      "Complete a 750-hour Esthetician course at a barbering or cosmetology school licensed in Texas.",
      "Specialty courses must be COMPLETED and your enrollment dropped before written eligibility generates — there is no sitting the written early the way a 1,000-hour barber or cosmetology student can at 900 hours.",
      "Pass both the written and practical exams. The esthetician practical is the longest of any specialty at 1 hour 41 minutes across 8 sections.",
      "Trained outside Texas? You go through the out-of-state equivalence route instead of this one.",
    ],
    related: [
      { href: "/texas-esthetician-exam-prep", label: "Esthetician Exam Prep" },
      { href: "/texas-esthetician-practical-exam-kit-list", label: "Esthetician Kit List" },
      { href: "/texas-esthetician-license-renewal", label: "Esthetician Renewal" },
    ],
  },
  {
    key: "manicurist",
    slug: "texas-manicurist-license-requirements-guide",
    label: "Manicurist",
    noun: "Manicurist licence",
    category: "individual",
    hours: 600,
    minimumAge: 17,
    feeUsd: 50,
    termYears: 2,
    source: "apply-manicurist",
    conditions: [
      "Complete a 600-hour Manicurist course at a school licensed in Texas.",
      "Specialty courses must be COMPLETED and your enrollment dropped before written eligibility generates — unlike the 1,000-hour courses, there is no early sitting at 900 hours.",
      "Pass both the written and practical exams.",
    ],
    related: [
      { href: "/texas-manicurist-exam-prep", label: "Manicurist Exam Prep" },
      { href: "/texas-manicurist-practical-exam-kit-list", label: "Manicurist Kit List" },
      { href: "/texas-manicurist-license-renewal", label: "Manicurist Renewal" },
    ],
  },
  {
    key: "eyelash",
    slug: "texas-eyelash-extension-license-requirements-guide",
    label: "Eyelash Extension Specialist",
    noun: "Eyelash Extension Specialist licence",
    category: "individual",
    hours: 320,
    minimumAge: 17,
    feeUsd: 50,
    termYears: 2,
    source: "apply-eyelash",
    conditions: [
      "Complete a 320-hour Eyelash Extension Specialist course at a school licensed in Texas.",
      "The course must be completed and your enrollment dropped before written eligibility generates.",
      "Pass both the written and practical exams.",
    ],
    related: [
      { href: "/texas-eyelash-extension-exam-prep", label: "Eyelash Exam Prep" },
      { href: "/texas-eyelash-extension-practical-exam-kit-list", label: "Eyelash Kit List" },
      { href: "/texas-eyelash-extension-license-renewal", label: "Eyelash Renewal" },
    ],
  },
  {
    key: "hairweaving",
    slug: "texas-hair-weaving-license-requirements-guide",
    label: "Hair Weaving Specialist",
    noun: "Hair Weaving Specialist licence",
    category: "individual",
    hours: 300,
    minimumAge: 17,
    feeUsd: 50,
    termYears: 2,
    source: "apply-weaving",
    conditions: [
      "Complete a 300-hour Hair Weaving Specialist course — the shortest course TDLR licenses.",
      "The course must be completed and your enrollment dropped before written eligibility generates.",
      "Pass both the written and practical exams.",
      "At 300 hours against the barber licence's 1,000, this is the fastest route into a licensed Texas trade.",
    ],
    related: [
      { href: "/texas-hair-weaving-exam-prep", label: "Hair Weaving Exam Prep" },
      { href: "/texas-hair-weaving-practical-exam-kit-list", label: "Hair Weaving Kit List" },
      { href: "/texas-hair-weaving-license-renewal", label: "Hair Weaving Renewal" },
    ],
  },

  // ── Crossover / transfer ──────────────────────────────────────────────────
  {
    key: "barber-transfer",
    slug: "texas-barber-license-transfer-guide",
    label: "Cosmetologist to Class A Barber",
    noun: "barber licence by crossover",
    category: "transfer",
    hours: 300,
    minimumAge: 17,
    feeUsd: 50,
    termYears: 2,
    source: "cosmetologist-to-barber",
    conditions: [
      "Hold a current, active Texas Cosmetology Operator licence in good standing — it must stay that way throughout.",
      "Complete a 300-hour Class A Barber course at a licensed school. Not the full 1,000 — your cosmetology training carries.",
      "Pass the PSI written exam after the coursework, then the practical after all hours.",
      "This is the crossover route. Someone licensed in another state uses the out-of-state equivalence route instead.",
    ],
    related: [
      { href: "/texas-barber-license-requirements-guide", label: "Barber Requirements" },
      { href: "/texas-barber-exam-intelligence-prep", label: "Barber Exam Prep" },
    ],
  },
  {
    key: "cosmetology-transfer",
    slug: "texas-cosmetology-license-transfer-guide",
    label: "Barber to Cosmetology Operator",
    noun: "cosmetology licence by crossover",
    category: "transfer",
    hours: 300,
    minimumAge: 17,
    feeUsd: 50,
    termYears: 2,
    source: "barber-to-cosmetologist",
    conditions: [
      "Hold a current, active Texas Class A Barber licence in good standing — it must stay that way throughout.",
      "Complete 300 hours of cosmetology instruction through an approved program at a licensed cosmetology school.",
      "Pass both the written and practical exams for the Cosmetology Operator licence.",
      "300 hours rather than the full 1,000 — the crossover exists because most of the training overlaps.",
    ],
    related: [
      { href: "/texas-cosmetology-license-requirements-guide", label: "Cosmetology Requirements" },
      { href: "/texas-cosmetology-exam-intelligence-prep", label: "Cosmetology Exam Prep" },
    ],
  },

  // ── Establishments ────────────────────────────────────────────────────────
  {
    key: "barber-establishment",
    slug: "texas-barber-establishment-license-requirements-guide",
    label: "Barber Establishment",
    noun: "barbershop establishment licence",
    category: "establishment",
    feeUsd: 78,
    termYears: 2,
    source: "establishments-apply",
    conditions: [
      "Name every business owner on the application and describe how ownership is structured.",
      "Meet the health, safety and equipment standards in the Act and 16 TAC Chapter 83.",
      "The premises cannot be used for living or sleeping. Attached to a residence? It needs its own entrance, and any connecting door stays closed during business hours.",
      "Every requirement must be met within one year of TDLR receiving the application, or it is void.",
    ],
    related: [{ href: "/texas-barber-license-requirements-guide", label: "Barber Licence Requirements" }],
  },
  {
    key: "cosmetology-establishment",
    slug: "texas-cosmetology-establishment-license-requirements-guide",
    label: "Cosmetology Establishment",
    noun: "salon establishment licence",
    category: "establishment",
    feeUsd: 78,
    termYears: 2,
    source: "establishments-apply",
    conditions: [
      "Name every business owner and the ownership structure on the application.",
      "Meet the health, safety and equipment standards in 16 TAC Chapter 83.",
      "No living or sleeping on the licensed premises; a residence-attached salon needs a separate entrance with the connecting door closed in business hours.",
      "All requirements within one year of receipt or the application is void.",
    ],
    related: [{ href: "/texas-cosmetology-license-requirements-guide", label: "Cosmetology Licence Requirements" }],
  },
  {
    key: "specialty-establishment",
    slug: "texas-specialty-establishment-license-requirements-guide",
    label: "Specialty Establishment",
    noun: "specialty establishment licence",
    category: "establishment",
    feeUsd: 78,
    termYears: 2,
    source: "establishments-apply",
    conditions: [
      "For a shop offering only specialty services — esthetics, manicuring, eyelash extensions or hair weaving — rather than full-service barbering or cosmetology.",
      "Same $78 fee as a full-service establishment; the difference is scope, not price.",
      "Same ownership disclosure, health and safety standards, and one-year deadline.",
      "A specialty establishment can host mini-establishments, but those are limited to the services the host is licensed for.",
    ],
    related: [
      { href: "/texas-mini-establishment-license-requirements-guide", label: "Mini-Establishment" },
    ],
  },
  {
    key: "mini-establishment",
    slug: "texas-mini-establishment-license-requirements-guide",
    label: "Mini-Establishment",
    noun: "mini-establishment licence",
    category: "establishment",
    feeUsd: 70,
    termYears: 2,
    source: "mini-establishment",
    conditions: [
      "A room or suite, leased or rented, inside a licensed barbering or cosmetology establishment — enclosed by walls and separate from the common areas.",
      "The host establishment must hold its own establishment licence, which can itself be a specialty licence.",
      "You may only perform services the HOST is licensed to offer. A mini-establishment cannot hold a specialty scope of its own.",
      "Other licensed professionals may work there if you keep records of their names, licence numbers and expiry dates.",
      "The licence must be displayed in the mini-establishment at all times.",
      "The host owner stays responsible for common areas and shared equipment — not you.",
    ],
    related: [
      { href: "/texas-specialty-establishment-license-requirements-guide", label: "Specialty Establishment" },
    ],
  },
  {
    key: "mobile-establishment",
    slug: "texas-mobile-establishment-license-requirements-guide",
    label: "Mobile Establishment",
    noun: "mobile establishment licence",
    category: "establishment",
    feeUsd: 78,
    termYears: 2,
    source: "mobile-establishment",
    conditions: [
      "A self-contained, self-supporting, enclosed mobile unit in which barbering or cosmetology is practised.",
      "You need a permanent address for dispatch and storage — the unit alone is not an address.",
      "Either the unit is GPS-trackable while operating, or you file weekly itineraries at least 7 days ahead.",
      "Onboard water heater giving continuous hot water on demand, and a fresh water tank sized for a full day. If the water runs out, you stop.",
      "A functioning restroom must be available at the service location.",
      "Furniture anchored to the unit. Licence number and shop name on both sides. Chemicals in locked cabinets.",
      "No services outside the unit, and none while it is moving.",
      "Keep appointment records and itineraries on site for one year.",
    ],
    related: [{ href: "/texas-barber-establishment-license-requirements-guide", label: "Fixed Establishment" }],
  },

  // ── Schools ───────────────────────────────────────────────────────────────
  {
    key: "barber-school",
    slug: "texas-barber-school-license-requirements-guide",
    label: "Barber School",
    noun: "barber school licence",
    category: "school",
    feeUsd: 580,
    termYears: 2,
    source: "schools-apply",
    conditions: [
      "One application covers barbering and cosmetology schools alike — you select which curricula to offer.",
      "The $580 fee includes the cost of the inspection.",
      "Private schools: proof you own the building or a signed lease of at least 12 months, owner details, and a current financial statement prepared by a CPA.",
      "Public schools: curriculum approval applications only.",
      "A curriculum approval application per programme you intend to run — 300 to 1,000 hours depending on the course.",
      "All requirements within one year of receipt or the application is void.",
    ],
    related: [{ href: "/texas-school-leaderboard", label: "Texas School Leaderboard" }],
  },
  {
    key: "cosmetology-school",
    slug: "texas-cosmetology-school-license-requirements-guide",
    label: "Cosmetology School",
    noun: "cosmetology school licence",
    category: "school",
    feeUsd: 580,
    termYears: 2,
    source: "schools-apply",
    conditions: [
      "TDLR uses one school application for both trades — barbering and cosmetology schools are not separate licences. You choose the curricula.",
      "The $580 fee includes the inspection.",
      "Private schools: building ownership or a 12-month lease, owner details, and a CPA-prepared financial statement.",
      "Public schools: curriculum approval applications only.",
      "One curriculum approval application per programme offered.",
      "All requirements within one year of receipt or the application is void.",
    ],
    related: [{ href: "/texas-school-leaderboard", label: "Texas School Leaderboard" }],
  },
];

export const byCategory = (c: LicenseRequirement["category"]) =>
  LICENSE_REQUIREMENTS.filter((r) => r.category === c);

export const findRequirement = (key: string) =>
  LICENSE_REQUIREMENTS.find((r) => r.key === key);
