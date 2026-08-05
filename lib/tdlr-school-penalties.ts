/**
 * What TDLR fines a Texas barbering or cosmetology school, by violation.
 *
 * Source: TDLR's published penalty schedule for schools, instructors and
 * continuing education providers.
 * https://www.tdlr.texas.gov/enforcement/bacsanctions-schools-instructors-ce.htm
 *
 * WHY THIS SITS NEXT TO THE DISTANCE-EDUCATION WORK. The schedule contains a
 * Class D violation — the most severe band — reading "Failed to comply with
 * distance education parameters", and it cites 83.120(c) AND 83.202(e). The
 * second of those is the rule carrying the 50% cap and, through the SHEARS
 * manual, the 350-in-core / 150-in-specialty split. So the split is not
 * guidance: breaching it is a named violation with a published range of $3,500
 * to $5,000 and/or revocation.
 *
 * A school can sit at exactly 50% overall, believe it is compliant, and be
 * inside that band.
 *
 * ON PRESENTING THESE NUMBERS. They are ranges TDLR publishes, not sentences
 * anyone has received. An actual outcome depends on the case, the history, and
 * whatever settlement follows the Notice of Alleged Violation. Every page using
 * this data has to say so — quoting a maximum as though it were the expected
 * result would be the same failure as quoting a licence number without checking
 * it was live.
 *
 * Read 2026-08-04. TDLR revises the schedule; re-read before citing.
 */

export interface PenaltyClass {
  cls: "A" | "B" | "C" | "D";
  range: string;
  min: number;
  max: number;
  sanction: string;
  label: string;
}

/** The four bands, quoted from the schedule's own headings. */
export const PENALTY_CLASSES: PenaltyClass[] = [
  { cls: "A", range: "$500 – $1,500", min: 500, max: 1500, sanction: "—", label: "Administrative Violations" },
  { cls: "B", range: "$1,000 – $3,500", min: 1000, max: 3500, sanction: "and/or up to one-year full suspension", label: "Administrative and Records Violations" },
  { cls: "C", range: "$2,000 – $5,000", min: 2000, max: 5000, sanction: "and/or up to revocation", label: "Unlicensed Violations" },
  { cls: "D", range: "$3,500 – $5,000", min: 3500, max: 5000, sanction: "and/or revocation", label: "Violations" },
];

export interface Violation {
  /** Quoted from the schedule. */
  text: string;
  citation: string;
  cls: "A" | "B" | "C" | "D";
  /** Which operational failure produces it. */
  trigger: string;
  distanceEducation?: boolean;
}

export const VIOLATIONS: Violation[] = [
  {
    text: "Failed to comply with distance education parameters",
    citation: "16 TAC §83.120(c), §83.202(e)",
    cls: "D",
    trigger:
      "Exceeding the distance ceiling — including the 350-hour core limit or the 150-hour specialty limit, which is where a school at 50% overall can still breach.",
    distanceEducation: true,
  },
  {
    text: "Taught the practical portion of the curriculum via distance education",
    citation: "Tex. Occ. Code §1603.351(c), 16 TAC §83.72(f)(3)",
    cls: "C",
    trigger:
      "Any practical hour delivered remotely. There is no allowance and no partial credit — practical is in person or it is not earned.",
    distanceEducation: true,
  },
  {
    text: "Failed to obtain department approval before offering distance education course",
    citation: "16 TAC §83.72(f)(1)",
    cls: "C",
    trigger:
      "Starting distance delivery before the course-approval application is granted. Approval is per course, not per school.",
    distanceEducation: true,
  },
  {
    text: "Failed to have an instructor physically present or participating through distance education for theory curriculum",
    citation: "16 TAC §83.72(e)",
    cls: "C",
    trigger:
      "Self-paced theory with no instructor participation. This is the same requirement NACCAS states as instructor interaction validated by measurable participation.",
    distanceEducation: true,
  },
  {
    text: "Directly or indirectly granting or approving student hours not correctly accrued",
    citation: "16 TAC §83.72(k)",
    cls: "D",
    trigger:
      "\"Indirectly\" is the operative word. A process that awards hours the records cannot substantiate is inside this whether or not anyone intended it.",
  },
  {
    text: "Increased, decreased, or withheld for any reason the number of hours earned by a student",
    citation: "Tex. Occ. Code §1603.2308(c)",
    cls: "D",
    trigger: "Any adjustment to a student's hours after the fact, for any reason.",
  },
  {
    text: "Failed to maintain a daily record of students' attendance",
    citation: "Tex. Occ. Code §1603.2309(a), 16 TAC §83.72(h)",
    cls: "D",
    trigger:
      "Daily, not weekly and not reconstructable. This is the obligation the 10-business-day NACCAS rule is measured against.",
  },
  {
    text: "Failed to properly account for credit hours granted to each student",
    citation: "16 TAC §83.72(k)",
    cls: "D",
    trigger: "Per student, not in aggregate.",
  },
  {
    text: "Failed to keep required documents for 48 months after a student completes the curriculum standards, withdraws, or enrollment is terminated",
    citation: "16 TAC §83.72(k)",
    cls: "C",
    trigger:
      "Four years of retention per student, surviving staff turnover and system changes — counted from completion, withdrawal or termination.",
  },
  {
    text: "Failed to allow inspection of school's attendance records at any time",
    citation: "Tex. Occ. Code §1603.2309(b)",
    cls: "C",
    trigger: "\"At any time\" — production on demand is the test, not existence.",
  },
  {
    text: "Failed to electronically submit a student's drop from course to the Department within 10 days of withdrawal or termination of enrollment",
    citation: "16 TAC §83.72(p)",
    cls: "B",
    trigger: "A ten-day clock that starts on an event nobody logs in real time.",
  },
  {
    text: "Failed to submit an electronic record of a student's accrued clock hours at least once per month",
    citation: "16 TAC §83.72(l)",
    cls: "A",
    trigger: "The monthly SHEARS filing, missed or late.",
  },
  {
    text: "Awarded credit or provided instruction of more than 184 hours or equivalent credit hours per calendar month",
    citation: "16 TAC §83.72(w)",
    cls: "A",
    trigger:
      "The ceiling that catches back-filling. A school reconstructing a term's hours in one filing hits it.",
  },
  {
    text: "Failed to provide students with the educational materials necessary to fulfill course requirements via distance education",
    citation: "16 TAC §83.72(f)(2)",
    cls: "A",
    trigger: "Approved for distance delivery without the materials to deliver it.",
    distanceEducation: true,
  },
];

export const SOURCE_URL =
  "https://www.tdlr.texas.gov/enforcement/bacsanctions-schools-instructors-ce.htm";
export const VERIFIED_ON = "2026-08-04";

export const classOf = (c: string) => PENALTY_CLASSES.find((p) => p.cls === c)!;
export const DISTANCE_VIOLATIONS = VIOLATIONS.filter((v) => v.distanceEducation);
export const HOURS_VIOLATIONS = VIOLATIONS.filter((v) => !v.distanceEducation);
