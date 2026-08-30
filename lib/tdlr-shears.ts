/**
 * How Texas actually requires distance education hours to be reported.
 *
 * Sourced from the APRIL 2026 SHEARS MANUAL — TDLR's own operations manual for
 * the Student Hour and Enrollment Automated Reporting System, the system every
 * licensed Texas barbering and cosmetology school files hours through.
 * https://www.tdlr.texas.gov/SHEARS/Operations%20Manual%20for%20SHEARS.pdf
 *
 * THE FINDING THAT MAKES THIS PAGE WORTH PUBLISHING. Everyone writing about
 * Texas distance education states the cap as "50% of course hours" — we did
 * too, and it is what §83.202(e)(1) says. The SHEARS manual is stricter, and
 * the difference is not cosmetic:
 *
 *   "A school may not not report more than 350 hours of Distance Education or
 *    70 hours of Field Trip within the first 700 hours of education, which are
 *    assigned to the CORE permit."
 *   "The specialty permit may not have more than 150 hours of Distance
 *    Education or 30 hours of Field Trip reported."
 *
 * 350 + 150 = 500, so the totals agree. But they are two separate ceilings
 * against two separate hour pools. A school running 500 distance hours entirely
 * inside the core 700 is at exactly 50% overall and in violation — and nothing
 * that tracks a single percentage would catch it. (The "may not not" is
 * TDLR's typo, quoted as printed.)
 *
 * Everything here is quoted or derived from that manual. Re-read it before
 * relying on any figure: TDLR revises it, the file name carries no version, and
 * the date is inside the document.
 */

export const SHEARS = {
  name: "SHEARS",
  expands: "Student Hour and Enrollment Automated Reporting System",
  manualVersion: "April 2026",
  manualUrl: "https://www.tdlr.texas.gov/SHEARS/Operations%20Manual%20for%20SHEARS.pdf",
} as const;

export interface HourRule {
  label: string;
  quote: string;
  why: string;
}

/** Reporting mechanics, quoted from the manual. */
export const SHEARS_RULES: HourRule[] = [
  {
    label: "Distance hours are a separate field — not classroom hours",
    quote: "DO NOT ENTER DISTANCE EDUCATION HOURS UNDER CLASSROOM HOURS.",
    why: "Capitalised in the manual, which tells you schools do it. The moment distance hours are filed as classroom hours the split is unrecoverable, and the transcript NACCAS requires — distance component identified separately — cannot be produced from the filing.",
  },
  {
    label: "350 distance hours maximum inside the first 700 (core)",
    quote:
      "A school may not not report more than 350 hours of Distance Education or 70 hours of Field Trip within the first 700 hours of education, which are assigned to the CORE permit.",
    why: "This is the rule almost nobody tracks. It is not 50% of the programme — it is a ceiling against the core pool specifically, and a school can be at 50% overall while breaching it.",
  },
  {
    label: "150 distance hours maximum in the 300 specialty hours",
    quote:
      "The specialty permit may not have more than 150 hours of Distance Education or 30 hours of Field Trip reported.",
    why: "The second ceiling. Together with the core limit it totals 500 — the same number §83.202(e)(1) implies — but as two buckets that must each hold.",
  },
  {
    label: "Monthly filing, opening the first week for the prior month",
    quote:
      "For clock-hour schools, you must report hours each month. The first week of each month, the system will update to allow school access to SHEARS for hours to be reported for the previous month.",
    why: "A monthly cadence means a monthly reconciliation. Whatever the school's own records say has to match what was filed, every month, per student.",
  },
  {
    label: "184 hours per student per month, hard ceiling",
    quote: "Students are only allowed up to 184 hours each month.",
    why: "A cap that catches back-filled or batched hours. A school reconstructing a term's hours at the end will hit it and have nowhere to put the overflow.",
  },
  {
    label: "Distance education must be approved per course, before any hours",
    quote:
      "You will not be able to enter distance education hours until you have been approved to offer distance education. To be approved to offer distance education, submit a new curriculum course application for each course, noting the distance education requested.",
    why: "Per course, not per school. And the approved number lives on the certificate of approval — so the school's own ceiling may be lower than the statutory one.",
  },
  {
    label: "Your approved ceiling is on the certificate, not in the rule",
    quote: "Approved distance education hours can be found on your certificate of approval.",
    why: "A school approved for 200 distance hours is capped at 200, whatever §83.202 permits. Compliance is against the certificate.",
  },
];

/** Course hour totals and the distance ceiling for each, from the manual's table. */
export const COURSE_CAPS = [
  { course: "Class A Barber", total: 1000, maxDistance: 500, core: 700, specialty: 300 },
  { course: "Cosmetology Operator", total: 1000, maxDistance: 500, core: 700, specialty: 300 },
  { course: "Esthetician", total: 750, maxDistance: 375 },
  { course: "Esthetician/Manicurist", total: 800, maxDistance: 400 },
  { course: "Hair Weaving/Esthetician", total: 800, maxDistance: 400 },
  { course: "Manicurist", total: 600, maxDistance: 300 },
  { course: "Eyelash Extension", total: 320, maxDistance: 160 },
  { course: "Hair Weaving", total: 300, maxDistance: 150 },
] as const;

/**
 * What a system has to do to satisfy both authorities at once.
 *
 * Ordered by how badly it fails if missing, not by which rule it comes from —
 * a school does not experience TDLR and NACCAS as separate problems.
 */
export interface Obligation {
  requirement: string;
  authority: "TDLR" | "NACCAS" | "both";
  evidence: string;
  /** Why an in-person system does not already do this. */
  gap: string;
}

export const OBLIGATIONS: Obligation[] = [
  {
    requirement: "Distance hours separated from classroom hours at the point of entry",
    authority: "both",
    evidence: "Per student, per month, in a field of their own",
    gap: "In-person systems have one hours field because in-person schools have one kind of hour. Reconstructing the split later cannot be evidenced.",
  },
  {
    requirement: "Core and specialty distance hours capped separately — 350 and 150",
    authority: "TDLR",
    evidence: "Running totals against two ceilings, not one",
    gap: "Tracking a single 50% figure passes a school that has put every distance hour in the core pool. Nothing on the market watches two buckets.",
  },
  {
    requirement: "Distance hours tracked by the same verification method as attendance",
    authority: "TDLR",
    evidence: "One method, demonstrable, across both kinds of hour",
    gap: "A time clock for the floor and a video-completion log for theory is two methods. Both can be diligently kept and still fail.",
  },
  {
    requirement: "Student physically on campus at least once every 10 business days",
    authority: "NACCAS",
    evidence: "A presence timeline per student with gap analysis",
    gap: "Nothing computes this. It requires joining attendance to the calendar and to the enrollment contract, then finding the longest gap.",
  },
  {
    requirement: "All GPA-bearing assessment taken physically on campus",
    authority: "NACCAS",
    evidence: "Assessment log with location, per student",
    gap: "An LMS that grades online quizzes creates the violation by working as designed.",
  },
  {
    requirement: "Distance component identified on every transcript",
    authority: "NACCAS",
    evidence: "Transcript with the split shown, official or unofficial",
    gap: "Only possible if the split was recorded from the first hour. This is downstream of the first obligation and fails with it.",
  },
  {
    requirement: "Signed, dated reciprocity disclaimer in every student file",
    authority: "NACCAS",
    evidence: "One signed artefact per student, retrievable",
    gap: "A filing cabinet satisfies the letter and fails the audit, because producing 100 of them on request is the actual test.",
  },
  {
    requirement: "Monthly SHEARS filing that reconciles to the school's own records",
    authority: "TDLR",
    evidence: "Filed vs recorded, per student, per month",
    gap: "Two systems that never compare. The discrepancy is only discovered when someone asks.",
  },
];

export const VERIFIED_ON = "2026-08-04";
