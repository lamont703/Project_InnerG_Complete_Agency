/**
 * Maryland licensing facts, and the page each one came from.
 *
 * Maryland's equivalent of lib/tdlr-sources.ts, and it exists for the same
 * reason: a figure on a public page is worth nothing if the specific document
 * behind it isn't recorded.
 *
 * WHAT MAKES MARYLAND DIFFERENT FROM TEXAS, and why none of this can be
 * carried across:
 *
 *  - Two separate boards. The Board of Barbers sits under Title 4 of the
 *    Business Occupations and Professions Article; the Board of Cosmetologists
 *    under Title 5. Different fees, different hour requirements, different CE.
 *  - Continuing education applies to COSMETOLOGY ONLY. Six hours, effective
 *    June 1 2024. The barber renewal page states no CE requirement at all.
 *    Do not write "Maryland requires CE" without naming the board.
 *  - Almost none of this is published as a PDF. The fee tables and the hour
 *    requirements exist only as HTML on labor.maryland.gov, which is why
 *    reference/Maryland Exam Prep Files/HTML-PAGE-MAP.md exists.
 *
 * Every figure below was read from the page named in `source`, on the date in
 * CHECKED. These pages carry no version stamp and change silently. Re-fetch
 * before republishing.
 */

export const CHECKED = "2026-08-10";

const P = "https://labor.maryland.gov/license";
export const MD_SOURCES = {
  barberFees: `${P}/barbers/barbersaff.shtml`,
  barberRequirements: `${P}/barbers/barbersreq.shtml`,
  barberRenewal: `${P}/barbers/barbersrenew.shtml`,
  barberLaw: `${P}/law/barberslaw.shtml`,
  cosFees: `${P}/cos/cosaff.shtml`,
  cosRequirements: `${P}/cos/cosreq.shtml`,
  cosRenewal: `${P}/cos/cosrenew.shtml`,
  cosLaw: `${P}/law/coslaw.shtml`,
  licenseSearch:
    "https://www.dllr.state.md.us/cgi-bin/ElectronicLicensing/OP_search/OP_search.cgi",
  psiPortal: "https://test-takers.psiexams.com/mdcos",
} as const;

export interface FeeRow {
  license: string;
  cat: string;
  original: string;
  renewal: string;
  late: string;
}

/** Board of Barbers — read from barbersaff.shtml. */
export const BARBER_FEES: FeeRow[] = [
  { license: "Barber Shop Owner", cat: "01", original: "$225", renewal: "$56", late: "$112 — after 45 days $225" },
  { license: "Master Barber", cat: "05", original: "$56", renewal: "$56", late: "$112" },
  { license: "Barber", cat: "04", original: "$56", renewal: "$56", late: "$112" },
  { license: "Limited Barber Stylist", cat: "11", original: "$56", renewal: "$56", late: "$112" },
  { license: "Apprentice — Barber", cat: "10", original: "$11", renewal: "—", late: "—" },
  { license: "Apprentice — Barber Stylist", cat: "12", original: "$11", renewal: "—", late: "—" },
  { license: "Duplicate licence — shop", cat: "—", original: "$28", renewal: "—", late: "—" },
  { license: "Duplicate licence — barber", cat: "—", original: "$28", renewal: "—", late: "—" },
  { license: "Licence certification", cat: "—", original: "$28", renewal: "—", late: "—" },
];

/** Board of Cosmetologists — read from cosaff.shtml. */
export const COSMETOLOGY_FEES: FeeRow[] = [
  { license: "Shop — Limited Service", cat: "01", original: "$225", renewal: "$56", late: "$112 — after 45 days $225" },
  { license: "Shop — Full Service", cat: "02", original: "$225", renewal: "$56", late: "$112 — after 45 days $225" },
  { license: "Senior Cosmetologist", cat: "04", original: "$28", renewal: "$28", late: "$56" },
  { license: "Cosmetologist", cat: "08", original: "$28", renewal: "$28", late: "$56" },
  { license: "Limited Hair Stylist", cat: "13", original: "$28", renewal: "$28", late: "$56" },
  { license: "Limited Nail Technician", cat: "14", original: "$28", renewal: "$28", late: "$56" },
  { license: "Limited Esthetician", cat: "15", original: "$28", renewal: "$28", late: "$56" },
  { license: "Blow Dry Stylist", cat: "16", original: "$28", renewal: "$28", late: "$56" },
  { license: "Apprentice — Hair Stylist", cat: "18", original: "$11", renewal: "$11", late: "—" },
  { license: "Apprentice — Cosmetologist", cat: "19", original: "$11", renewal: "$11", late: "—" },
  { license: "Apprentice — Nail Technician", cat: "20", original: "$11", renewal: "$11", late: "—" },
  { license: "Apprentice — Esthetician", cat: "22", original: "$11", renewal: "$11", late: "—" },
];

export interface Requirement {
  license: string;
  schoolHours: number | null;
  apprenticeHours: number | null;
  /** Verbatim from the board page — quoted rather than paraphrased. */
  detail: string;
}

/** Board of Barbers — read from barbersreq.shtml. */
export const BARBER_REQUIREMENTS: Requirement[] = [
  {
    license: "Barber",
    schoolHours: 1200,
    apprenticeHours: 2250,
    detail:
      "Must submit proof of completion of 1200 hours of barber student training in a barber school or 2250 hours as a registered apprentice in a licensed barbershop and qualify by examination given by the Board.",
  },
  {
    license: "Barber-Stylist Limited",
    schoolHours: 900,
    apprenticeHours: 1650,
    detail:
      "Must submit proof of completion of 900 hours of barber student training in a barber school or 1,650 hours as an apprentice barber-stylist limited in a licensed barbershop and qualify by examination given by the Board.",
  },
  {
    license: "Master Barber",
    schoolHours: null,
    apprenticeHours: null,
    detail:
      "Must have 15 months of experience as a licensed barber and a passing grade on the master barber exam and the barber exam.",
  },
  {
    license: "Shop Owner",
    schoolHours: null,
    apprenticeHours: null,
    detail:
      "Must provide approved use and occupancy permit from the local zoning board with the shop permit application.",
  },
];

/** Board of Cosmetologists — read from cosreq.shtml. */
export const COSMETOLOGY_REQUIREMENTS: Requirement[] = [
  {
    license: "Cosmetologist",
    schoolHours: 1500,
    apprenticeHours: null,
    detail:
      "At least 17 years of age and completed 9th grade or G.E.D; a program of at least 1,500 hours in a cosmetology school approved by MSDE or MHEC in consultation with the Board; or 24 months as a registered apprentice in a licensed beauty salon.",
  },
  {
    license: "Limited Hairstylist",
    schoolHours: 1200,
    apprenticeHours: null,
    detail:
      "At least 17 and 9th grade or G.E.D; at least 1,200 hours of instruction providing hair services in an approved cosmetology school; or 15 months as a registered apprentice.",
  },
  {
    license: "Limited Blow Dry Stylist",
    schoolHours: 350,
    apprenticeHours: null,
    detail:
      "At least 17 and 9th grade or G.E.D; at least 350 hours of instruction providing hair services — blow drying — in an approved cosmetology school. No apprenticeship route is listed.",
  },
  {
    license: "Limited Esthetician",
    schoolHours: 600,
    apprenticeHours: null,
    detail:
      "At least 17 and 9th grade or G.E.D; at least 600 hours of instruction in esthetic services in an approved cosmetology school; or 12 months as a registered apprentice.",
  },
  {
    license: "Limited Nail Technician",
    schoolHours: 250,
    apprenticeHours: null,
    detail:
      "At least 17 and 9th grade or G.E.D; at least 250 hours of instruction in nail technician services in an approved cosmetology school; or 8 months as a registered apprentice.",
  },
  {
    license: "Senior Cosmetologist",
    schoolHours: null,
    apprenticeHours: null,
    detail:
      "Two years of experience as a licensed cosmetologist and passing grades on the senior cosmetologist exam and the cosmetologist exam.",
  },
];

export const RENEWAL = {
  /** Both boards. */
  cycleYears: 2,
  noticeDaysBefore: 60,
  barber: {
    fee: "$56",
    reinstatement: "$56",
    ce: null as string | null, // the barber renewal page states no CE requirement
    source: MD_SOURCES.barberRenewal,
  },
  cosmetology: {
    fee: "$28",
    reinstatement: "$28",
    ce: "6 hours of approved continuing education, required by the State Legislature as a condition of renewal. Approved providers began offering it 1 June 2024.",
    source: MD_SOURCES.cosRenewal,
  },
} as const;

/**
 * Practical exam kit — Maryland Barber, read from the PSI Candidate Information
 * Bulletin effective 2025-03-31, reached through PSI's portal (client `mdcos`).
 *
 * NOT from the board's website. Maryland's own barbers exam page links no
 * barber bulletin at all — only cosmetology documents — so the board site
 * cannot answer this question.
 *
 * The bulletin's own words: "The following list is meant to be a suggested
 * list. Test Takers are responsible for bringing all necessary supplies /
 * equipment needed to perform all services." It also warns that bringing a
 * wrong item means no points for those steps.
 */
export const BARBER_KIT = {
  bulletinEffective: "2025-03-31",
  preSanitized: {
    heading: "Pre-exam set up",
    note: 'The bulletin requires these in a zip-lock bag labelled "PRE SANITIZED".',
    items: [
      "Disinfectant — labelled EPA disinfectant, no aerosols allowed",
      "Hand sanitizer — labelled Hand Sanitizer",
      "Paper towels",
      "Trash bag labelled trash/waste",
      "Spray bottle with water labelled water",
    ],
  },
  services: [
    { heading: "Shaving service", items: ["Towels", "Shaving cream", "Razor (with blade)", "Astringent/toner"] },
    { heading: "Hair cut service", items: ["Cape", "Clippers", "Shears", "Combs", "Neck strips"] },
    {
      heading: "Permanent wave service",
      items: [
        "Chemical drape",
        "Permanent rods (minimum of 6)",
        "Towels",
        "End papers",
        'Mock waving solution (i.e. water), labelled "Waving Solution"',
        "Protective cotton",
        "Gloves",
      ],
    },
  ],
  other: ["Plain coloured smock — highly recommended, but not mandatory"],
  prohibited: [
    "Purses, backpacks, recording devices and cell phones are not allowed in the practical examination room",
    "Items left behind will be discarded",
  ],
  mannequin:
    "All task lines associated with the practical must be performed on a mannequin to receive procedure and safety criteria points.",
} as const;

/**
 * The PSI National Practical tests — Cosmetologist, Hairstylist, Esthetician,
 * Nail Technician, Blow Dry Stylist and Eyelash Extension Technician.
 *
 * THERE IS NO KIT LIST FOR THESE, AND THAT IS DELIBERATE ON PSI'S PART. Its
 * exact words: "There are no supply lists or suggested supplies for the PSI
 * Practical National Tests." Test takers bring what they would use in their own
 * work environment, and "there are no right or wrong supplies". Publishing a
 * "Maryland cosmetology kit list" would be inventing a document PSI declines to
 * write. Only the Maryland-specific barber practical has an itemised kit.
 *
 * What IS prescribed is the container, the topic order, the timings and the
 * pass mark — all below, read from each licence's own bulletin.
 *
 * Timings reconcile against each bulletin's stated total for five of the six.
 * Blow Dry Stylist is the exception and the discrepancy is the source's, not
 * ours: its topics sum to 45 minutes against a stated "approximately 60
 * minutes (1 hour)". Its rating line also says candidates must pass "the PSI
 * National Nail Technician" test — a copy-paste error in PSI's own bulletin.
 */
export interface PracticalTopic { topic: string; minutes: number }
export interface PsiPractical {
  slug: string;
  license: string;
  board: "Board of Barbers" | "Board of Cosmetologists";
  bulletin: string;
  totalMinutesStated: number;
  passPct: number;
  topics: PracticalTopic[];
  /** Set where the bulletin contradicts itself; surfaced on the page. */
  sourceNote?: string;
}

export const PSI_CONTAINER =
  'An unmarked closable container — a "supply kit" — no larger than 24" wide, 24" long and 24" high, so it fits under the table when not in use.';
export const PSI_MONOMER =
  'Any monomer must be a low-odour or odourless product. Product that does not meet this requirement will not be allowed into the testing room.';
export const PSI_NO_SUPPLY_LIST =
  'PSI states there are no supply lists or suggested supplies for its National Practical tests. Bring the equipment and supplies you would use for that topic in your own work environment — PSI says there is no right or wrong supply and no right or wrong technique.';

export const PSI_PRACTICALS: PsiPractical[] = [
  {
    slug: "maryland-cosmetology-practical-exam",
    license: "Cosmetologist",
    board: "Board of Cosmetologists",
    bulletin: "Cosmetology v1.1, effective 2026-07-08",
    totalMinutesStated: 235,
    passPct: 75,
    topics: [
      { topic: "Workstation preparation", minutes: 10 },
      { topic: "Basic manicure", minutes: 20 },
      { topic: "Nail enhancement using a form", minutes: 20 },
      { topic: "Basic facial", minutes: 20 },
      { topic: "Eyebrow waxing and tweezing", minutes: 10 },
      { topic: "Haircutting", minutes: 20 },
      { topic: "Chemical wave", minutes: 30 },
      { topic: "Sodium hydroxide relaxer (straightener) application", minutes: 20 },
      { topic: "Color lift", minutes: 20 },
      { topic: "Permanent hair color deposit", minutes: 20 },
      { topic: "Workstation preparation for next client", minutes: 45 },
    ],
  },
  {
    slug: "maryland-hairstylist-practical-exam",
    license: "Limited Hairstylist",
    board: "Board of Cosmetologists",
    bulletin: "Hairstylist v1.1, effective 2026-07-08",
    totalMinutesStated: 145,
    passPct: 75,
    topics: [
      { topic: "Workstation preparation", minutes: 10 },
      { topic: "Haircutting", minutes: 20 },
      { topic: "Chemical wave", minutes: 45 },
      { topic: "Sodium hydroxide relaxer (straightener) application", minutes: 20 },
      { topic: "Color lift", minutes: 20 },
      { topic: "Permanent hair color deposit", minutes: 20 },
      { topic: "Workstation preparation for next client", minutes: 10 },
    ],
  },
  {
    slug: "maryland-esthetician-practical-exam",
    license: "Limited Esthetician",
    board: "Board of Cosmetologists",
    bulletin: "Esthetician v1.1, effective 2026-07-08",
    totalMinutesStated: 85,
    passPct: 75,
    topics: [
      { topic: "Workstation preparation", minutes: 10 },
      { topic: "Basic facial", minutes: 20 },
      { topic: "Eyebrow waxing and tweezing", minutes: 20 },
      { topic: "Make up application", minutes: 25 },
      { topic: "Workstation preparation for next client", minutes: 10 },
    ],
  },
  {
    slug: "maryland-nail-technician-practical-exam",
    license: "Limited Nail Technician",
    board: "Board of Cosmetologists",
    bulletin: "Nail Technician v1.1, effective 2026-07-08",
    totalMinutesStated: 90,
    passPct: 75,
    topics: [
      { topic: "Workstation preparation", minutes: 10 },
      { topic: "Basic manicure", minutes: 20 },
      { topic: "Nail tip application", minutes: 20 },
      { topic: "Nail enhancement using a form", minutes: 30 },
      { topic: "Workstation preparation for next client", minutes: 10 },
    ],
  },
  {
    slug: "maryland-blow-dry-stylist-practical-exam",
    license: "Limited Blow Dry Stylist",
    board: "Board of Cosmetologists",
    bulletin: "Blow Dry Stylist v2.5, effective 2026-07-08",
    totalMinutesStated: 60,
    passPct: 75,
    topics: [
      { topic: "Workstation preparation", minutes: 10 },
      { topic: "Blow dry and thermal curling", minutes: 25 },
      { topic: "End of day clean up", minutes: 10 },
    ],
    sourceNote:
      'Two inconsistencies in PSI\'s own bulletin, reproduced rather than tidied: the three topics sum to 45 minutes against a stated "approximately 60 minutes (1 hour)", and the rating line says candidates must pass "the PSI National Nail Technician" test rather than the blow dry one.',
  },
  {
    slug: "maryland-eyelash-extension-practical-exam",
    license: "Eyelash Extension Technician",
    board: "Board of Cosmetologists",
    bulletin: "Eyelash Extension Technician v1.3, effective 2026-07-08",
    totalMinutesStated: 60,
    passPct: 75,
    topics: [
      { topic: "Daily workstation preparation", minutes: 10 },
      { topic: "Eyelash extension application", minutes: 25 },
      { topic: "Blood exposure incident", minutes: 15 },
      { topic: "Workstation preparation for next client", minutes: 10 },
    ],
  },
];
