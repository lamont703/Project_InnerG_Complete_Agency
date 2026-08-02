/**
 * Texas ↔ California licence portability.
 *
 * THE HEADLINE, AND THE REASON THIS PAGE EXISTS: neither state has
 * reciprocity. Both run an equivalence review — they look at your training and
 * decide whether it is enough — and the word people search for describes
 * something that does not exist between these two states. Saying that plainly
 * is more useful than a matrix of green ticks.
 *
 * The second finding is that the licence types do not map. Texas licenses
 * eyelash extension and hair weaving as standalone credentials; California does
 * not, and folds those services into esthetician and cosmetologist scope.
 * California licenses hairstylist and electrologist; Texas does not. So for
 * four of the ten credentials across the two states, the question is not "will
 * my hours transfer" but "does my licence exist there at all".
 *
 * Sources — TDLR apply pages (see lib/tdlr-sources.ts) and the California Board
 * of Barbering and Cosmetology at barbercosmo.ca.gov. Read 2026-08-02.
 */

export interface StateLicence {
  /** Hours of training the state requires, or null where it issues no such licence. */
  hours: number | null;
  /** Note explaining an absence or an unusual condition. */
  note?: string;
}

export interface ReciprocityRow {
  key: string;
  /** How the credential is described generically. */
  label: string;
  tx: StateLicence;
  ca: StateLicence;
  /** Our own page for the Texas side, where one exists. */
  txGuide?: string;
}

export const RECIPROCITY_ROWS: ReciprocityRow[] = [
  {
    key: "barber",
    label: "Barber",
    tx: { hours: 1000, note: "Class A Barber" },
    ca: { hours: 1000 },
    txGuide: "/texas-barber-license-requirements-guide",
  },
  {
    key: "cosmetologist",
    label: "Cosmetologist",
    tx: { hours: 1000, note: "Cosmetology Operator" },
    ca: { hours: 1000 },
    txGuide: "/texas-cosmetology-license-requirements-guide",
  },
  {
    key: "esthetician",
    label: "Esthetician",
    tx: { hours: 750 },
    ca: { hours: 600 },
    txGuide: "/texas-esthetician-license-requirements-guide",
  },
  {
    key: "manicurist",
    label: "Manicurist / Nail Technician",
    tx: { hours: 600 },
    ca: { hours: 400 },
    txGuide: "/texas-manicurist-license-requirements-guide",
  },
  {
    key: "eyelash",
    label: "Eyelash Extension",
    tx: { hours: 320 },
    ca: {
      hours: null,
      note: "No standalone licence. Eyelash work sits inside esthetician or cosmetologist scope, so the route is a 600-hour esthetician licence.",
    },
    txGuide: "/texas-eyelash-extension-license-requirements-guide",
  },
  {
    key: "hairweaving",
    label: "Hair Weaving",
    tx: { hours: 300 },
    ca: {
      hours: null,
      note: "No standalone licence. The nearest California credential is hairstylist at 600 hours or cosmetologist at 1,000.",
    },
    txGuide: "/texas-hair-weaving-license-requirements-guide",
  },
  {
    key: "hairstylist",
    label: "Hairstylist",
    tx: { hours: null, note: "No standalone licence. Texas covers this scope under Cosmetology Operator at 1,000 hours." },
    ca: { hours: 600 },
  },
  {
    key: "electrologist",
    label: "Electrologist",
    tx: { hours: null, note: "Not licensed by TDLR's barbering and cosmetology programme." },
    ca: { hours: 600, note: "Minimum age 18 and 12th-grade completion, unlike every other California credential." },
  },
];

export interface StateRoute {
  state: "Texas" | "California";
  authority: string;
  /** What the route is actually called by the regulator. */
  routeName: string;
  hasTrueReciprocity: false;
  steps: string[];
  sourceUrl: string;
}

export const TEXAS_ROUTE: StateRoute = {
  state: "Texas",
  authority: "TDLR",
  routeName: "Licence by equivalence",
  hasTrueReciprocity: false,
  steps: [
    "Your out-of-state licence is submitted as proof of training and experience — TDLR does not grant a Texas licence automatically on the strength of another state's.",
    "TDLR routes you through a questionnaire covering where you are licensed, your licence status, the licence type, how you trained, and how long you have held it.",
    "The Department does not publish the hours it credits or the exams it waives. That determination is made per applicant.",
    "Confirm your own position with TDLR before assuming anything transfers: (512) 463-6599, or (800) 803-9202 in state.",
  ],
  sourceUrl: "https://www.tdlr.texas.gov/barbering-and-cosmetology/individuals/out-of-state/",
};

export const CALIFORNIA_ROUTE: StateRoute = {
  state: "California",
  authority: "Board of Barbering and Cosmetology",
  routeName: "Out-of-state examination application",
  hasTrueReciprocity: false,
  steps: [
    "You apply to sit the California exam, not for a licence transfer. Submit the Initial Exam Application together with Form B, the out-of-state school training record, which your school completes.",
    "The Board reviews both to decide whether you have enough hours to sit the exam or must complete more.",
    "Licensed work experience counts: every three months of practice is treated as 100 hours of training. It only counts for time after you were licensed, and Form C records it.",
    "Apprentice hours are not accepted — which matters if you trained through the Texas apprentice route.",
    "Baseline requirements apply regardless: minimum age 17, and completion of the 10th grade.",
  ],
  sourceUrl: "https://www.barbercosmo.ca.gov/applicants/license_requirements.shtml",
};

/** Hours a licensee is short when moving, or null where the licence has no counterpart. */
export function gap(row: ReciprocityRow, direction: "txToCa" | "caToTx"): number | null {
  const from = direction === "txToCa" ? row.tx.hours : row.ca.hours;
  const to = direction === "txToCa" ? row.ca.hours : row.tx.hours;
  if (from === null || to === null) return null;
  return Math.max(0, to - from);
}

/** Every credential that simply does not exist in the other state. */
export const NO_COUNTERPART = RECIPROCITY_ROWS.filter(
  (r) => r.tx.hours === null || r.ca.hours === null
);
