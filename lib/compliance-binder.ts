import { holidaysForYear } from "@/lib/us-holidays";

/**
 * The rules engine behind the distance-education audit binder.
 *
 * WHAT THIS IS. Every check below is a published requirement, not a heuristic:
 * TDLR's April 2026 SHEARS manual, 16 TAC §83.202(e)/§83.120(c), and NACCAS
 * Policy VI.02. The functions are pure so they can be tested against a real
 * school's records later without touching the UI.
 *
 * WHY IT MATTERS THAT THESE ARE SEPARATE CHECKS. A school can pass the headline
 * test and fail the one that carries the penalty. The 50% cap is really two
 * ceilings — 350 distance hours inside the first 700 core hours, 150 inside the
 * 300 specialty hours — so a student at exactly 50% overall can be in breach.
 * "Failed to comply with distance education parameters" is a CLASS D violation
 * at $3,500–$5,000 and/or revocation, which is why the split gets its own check
 * rather than being folded into a percentage.
 *
 * THE CAMPUS-PRESENCE CHECK IS THE ONE NOBODY COMPUTES. VI.02 element 3
 * requires the student physically present "at least once every 10 business
 * days". That is a calendar computation over attendance, not a field anyone
 * stores — which is why a school with perfect records still cannot answer it
 * without joining attendance to a business-day calendar. Federal holidays are
 * excluded via lib/us-holidays.ts rather than counting raw weekdays.
 *
 * DEMO DATA IS LABELLED AS SUCH. The roster below is invented to exercise every
 * failure mode. Nothing here is a real student, and the tool says so — a
 * compliance demo that looks like real student records would be the wrong thing
 * to put on a public page.
 */

export type HourKind = "in-person" | "distance";
export type Segment = "core" | "specialty";

export interface HourEntry {
  date: string; // ISO yyyy-mm-dd
  hours: number;
  kind: HourKind;
  segment: Segment;
  instructor: string;
}

export interface Assessment {
  date: string;
  name: string;
  gpaBearing: boolean;
  onCampus: boolean;
}

export interface Student {
  id: string;
  name: string;
  course: string;
  /** Total programme hours, e.g. 1000 for Class A Barber. */
  courseHours: number;
  enrolledOn: string;
  /** Signed reciprocity disclaimer, VI.02 element 5. Null = not on file. */
  disclaimerSignedOn: string | null;
  hours: HourEntry[];
  /** Dates the student was physically on campus for a full scheduled class day. */
  campusDays: string[];
  assessments: Assessment[];
}

/** The two distance ceilings, from the SHEARS manual. */
export const CORE_DISTANCE_CAP = 350;
export const SPECIALTY_DISTANCE_CAP = 150;
/** 16 TAC §83.72(w) — no more than this in a calendar month. */
export const MONTHLY_HOUR_CAP = 184;
/** NACCAS VI.02 element 3. */
export const MAX_BUSINESS_DAYS_BETWEEN_CAMPUS = 10;

const iso = (d: Date) => d.toISOString().slice(0, 10);

/**
 * Closure dates for the years spanned.
 *
 * TWO CORRECTIONS WORTH KEEPING. lib/us-holidays.ts was written for salon
 * operations and marks days as either "closure" or "busy" — Mother's Day, the
 * day after Thanksgiving, Christmas Eve and New Year's Eve are "busy", meaning
 * a salon is slammed, not shut. Only closures are excluded here.
 *
 * And the direction of error matters: excluding a day makes a gap look SHORTER,
 * so over-excluding hides breaches. That is the wrong way to be wrong in a
 * compliance check, which is why "busy" days count as business days.
 *
 * The list also carries actual dates, not federally observed ones — Independence
 * Day 2026 falls on a Saturday and the observed Friday is not in it. That is
 * fine here and wrong for a real deployment, because the calendar that governs
 * is the school's own: VI.02 measures presence against "a scheduled class day as
 * outlined in the enrollment contract". A school's term dates and closure
 * calendar replace this the moment there is a real one to load.
 */
function holidaySet(fromYear: number, toYear: number): Set<string> {
  const s = new Set<string>();
  for (let y = fromYear; y <= toYear; y++) {
    for (const h of holidaysForYear(y)) if (h.kind === "closure") s.add(h.date);
  }
  return s;
}

/**
 * Business days strictly between two dates — weekends and federal holidays
 * excluded. Exclusive of both endpoints: the question is how long the student
 * was away, not how long the span was.
 */
export function businessDaysBetween(aIso: string, bIso: string): number {
  const a = new Date(`${aIso}T00:00:00Z`);
  const b = new Date(`${bIso}T00:00:00Z`);
  if (b <= a) return 0;
  const hol = holidaySet(a.getUTCFullYear(), b.getUTCFullYear());
  let n = 0;
  const cur = new Date(a);
  cur.setUTCDate(cur.getUTCDate() + 1);
  while (cur < b) {
    const dow = cur.getUTCDay();
    if (dow !== 0 && dow !== 6 && !hol.has(iso(cur))) n++;
    cur.setUTCDate(cur.getUTCDate() + 1);
  }
  return n;
}

export interface GapFinding {
  from: string;
  to: string;
  businessDays: number;
}

/**
 * Every stretch where the student went more than 10 business days without a
 * full day on campus. Measured from enrollment, because the clock starts then —
 * a student who never attends has the longest gap of all, and a check that only
 * looked between visits would score them perfect.
 */
export function campusGaps(s: Student, asOf: string): GapFinding[] {
  const days = [...new Set(s.campusDays)].sort();
  const marks = [s.enrolledOn, ...days, asOf];
  const out: GapFinding[] = [];
  for (let i = 0; i < marks.length - 1; i++) {
    const n = businessDaysBetween(marks[i], marks[i + 1]);
    if (n > MAX_BUSINESS_DAYS_BETWEEN_CAMPUS) {
      out.push({ from: marks[i], to: marks[i + 1], businessDays: n });
    }
  }
  return out;
}

export interface HourTotals {
  inPerson: number;
  distance: number;
  coreDistance: number;
  specialtyDistance: number;
  total: number;
  /** Distance as a share of hours earned so far — the figure that misleads. */
  distancePct: number;
}

export function totals(s: Student): HourTotals {
  let inPerson = 0, distance = 0, coreDistance = 0, specialtyDistance = 0;
  for (const h of s.hours) {
    if (h.kind === "distance") {
      distance += h.hours;
      if (h.segment === "core") coreDistance += h.hours;
      else specialtyDistance += h.hours;
    } else inPerson += h.hours;
  }
  const total = inPerson + distance;
  return {
    inPerson, distance, coreDistance, specialtyDistance, total,
    distancePct: total ? (distance / total) * 100 : 0,
  };
}

/** Calendar months where reported hours exceeded the §83.72(w) ceiling. */
export function monthsOverCap(s: Student): { month: string; hours: number }[] {
  const by: Record<string, number> = {};
  for (const h of s.hours) {
    const m = h.date.slice(0, 7);
    by[m] = (by[m] || 0) + h.hours;
  }
  return Object.entries(by)
    .filter(([, v]) => v > MONTHLY_HOUR_CAP)
    .map(([month, hours]) => ({ month, hours }))
    .sort((a, b) => a.month.localeCompare(b.month));
}

export type Severity = "pass" | "warn" | "fail";

export interface Check {
  id: string;
  label: string;
  authority: "TDLR" | "NACCAS";
  citation: string;
  severity: Severity;
  detail: string;
  /** The violation this maps to when it fails, for the penalty page. */
  violation?: string;
}

/**
 * Run every check for one student.
 *
 * `warn` is used where a figure is inside the limit but close enough that the
 * next month breaches it — the point of the tool is to catch it before the
 * inspector does, not to report a fait accompli.
 */
export function runChecks(s: Student, asOf: string): Check[] {
  const t = totals(s);
  const gaps = campusGaps(s, asOf);
  const over = monthsOverCap(s);
  const badAssessments = s.assessments.filter((a) => a.gpaBearing && !a.onCampus);

  const checks: Check[] = [];

  checks.push({
    id: "core-distance",
    label: `Distance hours inside the core 700 — ${t.coreDistance} of ${CORE_DISTANCE_CAP}`,
    authority: "TDLR",
    citation: "SHEARS manual; 16 TAC §83.202(e)",
    severity: t.coreDistance > CORE_DISTANCE_CAP ? "fail" : t.coreDistance > CORE_DISTANCE_CAP * 0.9 ? "warn" : "pass",
    detail:
      t.coreDistance > CORE_DISTANCE_CAP
        ? `Over the core ceiling by ${t.coreDistance - CORE_DISTANCE_CAP} hours. Overall distance is ${t.distancePct.toFixed(0)}%, which is why a percentage check would pass this student.`
        : `${CORE_DISTANCE_CAP - t.coreDistance} hours of headroom in the core segment.`,
    violation: "Failed to comply with distance education parameters",
  });

  checks.push({
    id: "specialty-distance",
    label: `Distance hours inside the 300 specialty — ${t.specialtyDistance} of ${SPECIALTY_DISTANCE_CAP}`,
    authority: "TDLR",
    citation: "SHEARS manual; 16 TAC §83.202(e)",
    severity: t.specialtyDistance > SPECIALTY_DISTANCE_CAP ? "fail" : t.specialtyDistance > SPECIALTY_DISTANCE_CAP * 0.9 ? "warn" : "pass",
    detail:
      t.specialtyDistance > SPECIALTY_DISTANCE_CAP
        ? `Over the specialty ceiling by ${t.specialtyDistance - SPECIALTY_DISTANCE_CAP} hours.`
        : `${SPECIALTY_DISTANCE_CAP - t.specialtyDistance} hours of headroom in the specialty segment.`,
    violation: "Failed to comply with distance education parameters",
  });

  checks.push({
    id: "campus-presence",
    label:
      gaps.length === 0
        ? "On campus at least every 10 business days"
        : `${gaps.length} gap${gaps.length > 1 ? "s" : ""} over 10 business days`,
    authority: "NACCAS",
    citation: "Policy VI.02, element 3",
    severity: gaps.length ? "fail" : "pass",
    detail: gaps.length
      ? gaps.map((g) => `${g.from} → ${g.to}: ${g.businessDays} business days`).join(" · ")
      : "No gap exceeded the limit, counting weekends and federal holidays out.",
  });

  checks.push({
    id: "monthly-cap",
    label: over.length ? `${over.length} month(s) over ${MONTHLY_HOUR_CAP} hours` : `No month over ${MONTHLY_HOUR_CAP} hours`,
    authority: "TDLR",
    citation: "16 TAC §83.72(w)",
    severity: over.length ? "fail" : "pass",
    detail: over.length
      ? over.map((m) => `${m.month}: ${m.hours} hours`).join(" · ")
      : "Every month within the ceiling — no sign of back-filled reporting.",
    violation: "Awarded credit or provided instruction of more than 184 hours per calendar month",
  });

  checks.push({
    id: "assessments",
    label: badAssessments.length ? `${badAssessments.length} GPA-bearing assessment(s) taken off campus` : "All GPA-bearing assessments on campus",
    authority: "NACCAS",
    citation: "Policy VI.02, element 2",
    severity: badAssessments.length ? "fail" : "pass",
    detail: badAssessments.length
      ? badAssessments.map((a) => `${a.name} (${a.date})`).join(" · ")
      : `${s.assessments.filter((a) => a.gpaBearing).length} graded assessments, all on campus.`,
  });

  checks.push({
    id: "disclaimer",
    label: s.disclaimerSignedOn ? "Reciprocity disclaimer on file" : "No signed reciprocity disclaimer",
    authority: "NACCAS",
    citation: "Policy VI.02, element 5",
    severity: s.disclaimerSignedOn ? "pass" : "fail",
    detail: s.disclaimerSignedOn
      ? `Signed ${s.disclaimerSignedOn}, before the first distance hour.`
      : "Required before enrollment, signed and dated, held in the student file.",
  });

  return checks;
}

export const worstSeverity = (checks: Check[]): Severity =>
  checks.some((c) => c.severity === "fail") ? "fail" : checks.some((c) => c.severity === "warn") ? "warn" : "pass";

// ---------------------------------------------------------------------------
// Demo roster. Invented, and labelled as invented wherever it is shown.
// Each student exercises a different failure so the tool demonstrates the
// checks rather than showing six green ticks.
// ---------------------------------------------------------------------------

const h = (date: string, hours: number, kind: HourKind, segment: Segment, instructor = "R. Alvarez"): HourEntry =>
  ({ date, hours, kind, segment, instructor });

/** Spread hours across months so monthly totals are realistic. */
function series(start: string, months: number, perMonth: number, kind: HourKind, segment: Segment): HourEntry[] {
  const out: HourEntry[] = [];
  const d = new Date(`${start}T00:00:00Z`);
  for (let i = 0; i < months; i++) {
    const m = new Date(d);
    m.setUTCMonth(m.getUTCMonth() + i);
    out.push(h(iso(m), perMonth, kind, segment));
  }
  return out;
}

/** Campus days every N calendar days from a start, for `count` visits. */
function visits(start: string, everyDays: number, count: number): string[] {
  const out: string[] = [];
  const d = new Date(`${start}T00:00:00Z`);
  for (let i = 0; i < count; i++) {
    const v = new Date(d);
    v.setUTCDate(v.getUTCDate() + i * everyDays);
    out.push(iso(v));
  }
  return out;
}

export const DEMO_AS_OF = "2026-08-05";

export const DEMO_STUDENTS: Student[] = [
  {
    // The headline case: exactly 50% distance overall, and in breach.
    id: "S-1042",
    name: "Alicia Moreno",
    course: "Cosmetology Operator",
    courseHours: 1000,
    enrolledOn: "2025-09-02",
    disclaimerSignedOn: "2025-09-02",
    hours: [
      ...series("2025-09-15", 10, 36, "distance", "core"), // 360 core distance — over 350
      ...series("2025-09-20", 10, 36, "in-person", "core"),
    ],
    campusDays: visits("2025-09-08", 12, 28),
    assessments: [
      { date: "2025-11-14", name: "Midterm theory", gpaBearing: true, onCampus: true },
      { date: "2026-03-20", name: "Practical checkpoint", gpaBearing: true, onCampus: true },
    ],
  },
  {
    // Perfect on hours, fails the campus clock nobody computes.
    id: "S-1108",
    name: "Devon Wright",
    course: "Class A Barber",
    courseHours: 1000,
    enrolledOn: "2025-10-06",
    disclaimerSignedOn: "2025-10-06",
    hours: [
      ...series("2025-10-20", 9, 30, "distance", "core"),
      ...series("2025-10-25", 9, 40, "in-person", "core"),
    ],
    campusDays: [...visits("2025-10-13", 9, 8), ...visits("2026-02-16", 9, 12)],
    assessments: [{ date: "2026-01-15", name: "Theory unit 4", gpaBearing: true, onCampus: true }],
  },
  {
    // Graded online, and no disclaimer on file.
    id: "S-1163",
    name: "Priya Raman",
    course: "Esthetician",
    courseHours: 750,
    enrolledOn: "2026-01-12",
    disclaimerSignedOn: null,
    hours: [
      ...series("2026-01-26", 6, 28, "distance", "core"),
      ...series("2026-01-30", 6, 34, "in-person", "core"),
    ],
    campusDays: visits("2026-01-19", 11, 18),
    assessments: [
      { date: "2026-03-05", name: "Unit 2 quiz", gpaBearing: true, onCampus: false },
      { date: "2026-05-18", name: "Unit 5 quiz", gpaBearing: true, onCampus: false },
      { date: "2026-06-02", name: "Practical assessment", gpaBearing: true, onCampus: true },
    ],
  },
  {
    // Back-filled a term — trips the 184-hour ceiling.
    id: "S-1201",
    name: "Marcus Bell",
    course: "Class A Barber",
    courseHours: 1000,
    enrolledOn: "2025-11-03",
    disclaimerSignedOn: "2025-11-03",
    hours: [
      h("2026-02-27", 210, "in-person", "core"), // one filing for a whole term
      ...series("2025-11-17", 8, 30, "distance", "core"),
      ...series("2025-11-24", 8, 25, "in-person", "core"),
    ],
    campusDays: visits("2025-11-10", 10, 30),
    assessments: [{ date: "2026-04-09", name: "Theory unit 6", gpaBearing: true, onCampus: true }],
  },
  {
    // Clean. Present so the tool is not a wall of red.
    id: "S-1247",
    name: "Sofia Delgado",
    course: "Cosmetology Operator",
    courseHours: 1000,
    enrolledOn: "2025-08-18",
    disclaimerSignedOn: "2025-08-18",
    hours: [
      ...series("2025-09-01", 11, 28, "distance", "core"),
      ...series("2025-09-05", 11, 40, "in-person", "core"),
      ...series("2026-05-04", 3, 40, "in-person", "specialty"),
      ...series("2026-05-11", 3, 30, "distance", "specialty"),
    ],
    campusDays: visits("2025-08-25", 9, 40),
    assessments: [
      { date: "2025-12-10", name: "Midterm theory", gpaBearing: true, onCampus: true },
      { date: "2026-06-15", name: "Specialty practical", gpaBearing: true, onCampus: true },
    ],
  },
];
