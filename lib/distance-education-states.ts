/**
 * Which states let you earn barbering / cosmetology hours at a distance.
 *
 * WHY THIS FILE LOOKS HALF-EMPTY, AND WHY THAT IS THE POINT. Every competing
 * page on this subject states a confident number for all fifty states. Nobody
 * has read fifty state boards' regulations, so most of those tables are copied
 * from each other and a share of them are wrong. This file carries a
 * `verification` field on every row and refuses to print a figure we have not
 * read on a primary source. An honest four-state table beats a fabricated
 * fifty-state one, and it is the only version that survives someone checking.
 *
 * A worked example of why. Aggregators repeat that New York permits "up to
 * 1,000 hours of online instruction". New York's cosmetology course IS 1,000
 * hours — the figure is the total course requirement, restated as if it were
 * the distance allowance, which would mean a fully-online licence. It is
 * recorded below as UNVERIFIED with that note rather than published.
 *
 * THE NATIONAL MECHANISM IS NOT THE PERCENTAGE. It is tempting to say the
 * accreditor sets a 50% ceiling that states adopt — several secondary sources
 * say exactly that. NACCAS Policy VI.02 was read in full (January 2017, five
 * elements) and contains NO percentage cap; neither does the complete policy
 * set III.01–IX.02, whose only "50%" appears in a refund table. What VI.02
 * actually propagates is the physical-presence interval and the reciprocity
 * disclaimer — and Alabama's 2026 rule requires compliance with VI.02 by name,
 * which is the propagation happening in public. The percentage caps are set by
 * each state independently.
 *
 * Read 2026-08-04. Re-check before relying on any figure here.
 */

export type Verification =
  /** Read on the regulator's own site or rule document. */
  | "primary"
  /** Read on an official state page that summarises its own rule. */
  | "official-summary"
  /** Not yet read on a primary source. No figure is published for these. */
  | "unverified";

export interface StateDistanceRule {
  code: string;
  name: string;
  /** Share of total course hours deliverable at a distance, where a percentage is set. */
  percentCap: number | null;
  /** Fixed hour ceiling, where the state sets one instead of a percentage. */
  hourCap: number | null;
  /** null = we have not verified; false = verified as NOT permitted. */
  permitted: boolean | null;
  verification: Verification;
  /** The document actually read. */
  sourceUrl?: string;
  sourceLabel?: string;
  /** Rule citation where the state gives one. */
  citation?: string;
  /** What a reader needs to know beyond the number. */
  note?: string;
  /** When the rule took effect, where the state states it. */
  effective?: string;
}

export const STATE_RULES: StateDistanceRule[] = [
  {
    code: "TX",
    name: "Texas",
    percentCap: 50,
    hourCap: null,
    permitted: true,
    verification: "primary",
    sourceUrl:
      "https://www.tdlr.texas.gov/barbering-and-cosmetology/schools/distance-education-responsibilities.htm",
    sourceLabel: "TDLR — School Distance Education Responsibilities + course-approval applications",
    citation: "16 TAC §83.202(e)(1)",
    note: "Theory only. The practical curriculum cannot be delivered at a distance under any circumstances. All eight course-approval applications were read separately and agree on 50%, but cite different subsections of §83.202.",
  },
  {
    code: "AL",
    name: "Alabama",
    percentCap: 50,
    hourCap: null,
    permitted: true,
    verification: "primary",
    sourceUrl: "https://www.aboc.alabama.gov/news/rule-changes-effective-may-15-2026",
    sourceLabel: "Alabama Board of Cosmetology — rule changes",
    citation: "Chapter 250-X-5-.03 (School Curriculum)",
    effective: "2026-05-15",
    note: "Amends the school curriculum rule and requires the school's distance education policy to comply with NACCAS Policy VI.02 by name. Students must be told at enrollment that distance hours may not be accepted for reciprocity in other states.",
  },
  {
    code: "PA",
    name: "Pennsylvania",
    percentCap: null,
    hourCap: 650,
    permitted: true,
    verification: "official-summary",
    sourceUrl:
      "https://www.pa.gov/agencies/dos/department-and-offices/bpoa/boards-commissions/cosmetology/cte-cosmetology-barber1",
    sourceLabel: "PA Dept. of State — Cosmetology & Barber licensure through CTE",
    note: "A NARROW CARVE-OUT, not a general allowance: 650 hours applies to Career and Technical Center students only, raised from a prior 625-hour waiver. Read as a programme-specific concession rather than a state-wide rule.",
  },
  {
    code: "CA",
    name: "California",
    percentCap: null,
    hourCap: null,
    permitted: false,
    verification: "primary",
    sourceUrl: "https://www.barbercosmo.ca.gov/laws_regs/act_regs.pdf",
    sourceLabel: "Barbering and Cosmetology Act & Regulations (Revised 2026)",
    note: "The 164-page Act and Regulations contains no provision for distance learning, distance education, remote or correspondence instruction. The single occurrence of \"online\" refers to the Board's own pre-apprentice training programme, not to course hours. Verified by full-text search of the current document.",
  },
  {
    code: "NY",
    name: "New York",
    percentCap: null,
    hourCap: null,
    permitted: null,
    verification: "unverified",
    note: "Widely repeated as allowing \"up to 1,000 hours\" of online instruction. 1,000 hours is New York's TOTAL cosmetology course requirement, so that figure would describe a fully-online licence. Treated as a misread aggregate until a NYSED or Department of State document says otherwise.",
  },
];

/** The accreditor's requirements, read in full rather than summarised. */
export const NACCAS_POLICY = {
  id: "Policy VI.02",
  title: "Curriculum: Policy on Distance Education",
  version: "January 2017",
  url: "http://elibrary.naccas.org/InfoRouter/docs/Public/NACCAS%20Handbook/Policies%20III.01-IX.02/Policy%20VI.02.pdf",
  /**
   * Note what is NOT here: a percentage cap. Secondary sources attribute a 50%
   * limit to this policy. The document has five elements and none of them is a
   * percentage; the complete policy set III.01–IX.02 contains "50%" once, in a
   * refund table. States set their own caps.
   */
  elements: [
    {
      n: 1,
      text: "The interaction with the instructor must be validated by measurable participation (clock hour, credit hour, or competency based) in the academic programs",
      operationally:
        "Watching a video is not participation. The school has to be able to show a measurable, instructor-linked record for every distance hour it grants.",
    },
    {
      n: 2,
      text: "All assessments that will be used for calculating a student's GPA must be executed while the student is physically on campus",
      operationally:
        "Remote theory delivery is permitted; remote graded assessment is not. Any online quiz that feeds a GPA breaks this.",
    },
    {
      n: 3,
      text: "The student participates in learning activities while physically present at the contracted campus at least once every 10 business days for the length of a scheduled class day as outlined in the enrollment contract",
      operationally:
        "A hard attendance floor. A student cannot go a fortnight without a full day on campus, and the interval has to be written into the enrollment contract.",
    },
    {
      n: 4,
      text: "All transcripts or other documents, (official or unofficial), listing academic attainment received must identify the distance education component",
      operationally:
        "Distance hours have to be separable on the transcript — which means the system of record has to distinguish them from the first hour recorded, not reconstruct them later.",
    },
    {
      n: 5,
      text: "Prior to enrollment, students are provided with a disclaimer that academic achievement earned via distance education may not be accepted for reciprocity or eligible for licensure in other states. A signed and dated copy of this disclosure must be found in the student file",
      operationally:
        "A signed artefact per student, held in the file. This is the requirement Alabama's 2026 rule restates almost word for word.",
    },
  ],
} as const;

/**
 * Rule changes, newest first. The tracker's backing data.
 *
 * Only entries with a dated primary source belong here — the value of a change
 * log is entirely in being right about the dates.
 */
export interface RuleChange {
  date: string;
  state: string;
  summary: string;
  sourceUrl: string;
  detail: string;
}

export const RULE_CHANGES: RuleChange[] = [
  {
    date: "2026-05-15",
    state: "Alabama",
    summary: "Alabama permits distance learning for up to 50% of total course work",
    sourceUrl: "https://www.aboc.alabama.gov/news/rule-changes-effective-may-15-2026",
    detail:
      "Amendment to Chapter 250-X-5-.03 (School Curriculum). Institutions must align their distance education policy with NACCAS Policy VI.02, and must notify students at enrollment that distance hours may not be accepted for reciprocity or licensure elsewhere. Alabama lands on the same 50% figure as Texas without either citing the other.",
  },
];

/** States where we hold a verified figure — the only ones a number is shown for. */
export const VERIFIED_RULES = STATE_RULES.filter((s) => s.verification !== "unverified");

/** Total states in scope, for honest denominators on the page. */
export const US_STATE_COUNT = 50;

export const VERIFIED_ON = "2026-08-04";
