import { MONTHLY_HOUR_CAP } from "@/lib/compliance-binder";

/**
 * Turning punches into hours, and deciding what a student is allowed to do next.
 *
 * PURE. No database, no React, no clock of its own — every function takes the
 * time it should reason about. That is not tidiness: an hour engine that reads
 * `new Date()` internally cannot be tested against a month boundary, a
 * daylight-saving change, or a student who is mid-punch, and those are exactly
 * the cases that produce a wrong transcript.
 *
 * ROUNDING IS NOT DONE HERE. Minutes come out exact. Schools round differently
 * and a TDLR report may round differently again, so rounding belongs to the
 * thing producing the document — never to the ledger. `roundForReport` exists
 * for that caller and is deliberately separate.
 *
 * THE ENGINE ANSWERS "MAY THIS PUNCH HAPPEN", NOT ONLY "WHAT HAPPENED". A
 * compliance report tells a school what it already did wrong. Refusing the
 * clock-in that would breach a ceiling is the only version that protects
 * anybody, and it is the reason this is the spine rather than a report.
 */

export type HourKind = "theory" | "practical";
export type Modality = "campus" | "distance";
export type Segment = "core" | "specialty";

export interface Punch {
  id: string;
  punchedInAt: string;
  /** Null means still on the clock. */
  punchedOutAt: string | null;
  kind: HourKind;
  modality: Modality;
  segment: Segment;
  instructorId: string | null;
  validatedAt: string | null;
  voidedAt: string | null;
}

export interface Program {
  totalHours: number;
  coreHours: number;
  specialtyHours: number;
  /** Null falls back to half the segment, which is what 16 TAC §83.202(e) permits. */
  coreDistanceCap: number | null;
  specialtyDistanceCap: number | null;
}

/**
 * The ceilings for a program.
 *
 * Defaults to half of each segment rather than half of the course. The rule
 * caps distance at 50% "of the total hours in each course", and TDLR's SHEARS
 * manual expresses that as a ceiling per segment — 350 of 700 core, 150 of 300
 * specialty for a 1,000-hour course. Half-of-each is the stricter reading and
 * the two agree on the total, so a school held to it can never be over the
 * looser one.
 */
export function distanceCaps(p: Program): { core: number; specialty: number } {
  return {
    core: p.coreDistanceCap ?? Math.floor(p.coreHours / 2),
    specialty: p.specialtyDistanceCap ?? Math.floor(p.specialtyHours / 2),
  };
}

/** A punch that counts: not voided, and closed. Open punches earn nothing yet. */
export function isCountable(p: Punch): boolean {
  return !p.voidedAt && Boolean(p.punchedOutAt);
}

export function punchMinutes(p: Punch, now?: Date): number {
  if (p.voidedAt) return 0;
  const start = new Date(p.punchedInAt).getTime();
  const end = p.punchedOutAt ? new Date(p.punchedOutAt).getTime() : now?.getTime();
  if (end === undefined || !Number.isFinite(start) || !Number.isFinite(end)) return 0;
  return Math.max(0, Math.round((end - start) / 60000));
}

export interface Ledger {
  totalMinutes: number;
  theoryMinutes: number;
  practicalMinutes: number;
  campusMinutes: number;
  distanceMinutes: number;
  coreDistanceMinutes: number;
  specialtyDistanceMinutes: number;
  /** Distance hours that no instructor has validated — NACCAS VI.02 element 1. */
  unvalidatedDistanceMinutes: number;
  openPunch: Punch | null;
}

/**
 * The ledger.
 *
 * `now` is only used to value an OPEN punch, so a live screen can show hours
 * ticking. Closed punches never depend on it, which is what keeps a transcript
 * generated today identical to the same transcript generated next year.
 */
export function ledger(punches: Punch[], now?: Date): Ledger {
  const l: Ledger = {
    totalMinutes: 0, theoryMinutes: 0, practicalMinutes: 0,
    campusMinutes: 0, distanceMinutes: 0,
    coreDistanceMinutes: 0, specialtyDistanceMinutes: 0,
    unvalidatedDistanceMinutes: 0,
    openPunch: null,
  };

  for (const p of punches) {
    if (p.voidedAt) continue;
    if (!p.punchedOutAt) {
      l.openPunch = p;
      if (!now) continue; // no clock supplied: an open punch contributes nothing
    }
    const m = punchMinutes(p, now);
    if (m <= 0) continue;

    l.totalMinutes += m;
    if (p.kind === "theory") l.theoryMinutes += m;
    else l.practicalMinutes += m;

    if (p.modality === "distance") {
      l.distanceMinutes += m;
      if (p.segment === "core") l.coreDistanceMinutes += m;
      else l.specialtyDistanceMinutes += m;
      if (!p.validatedAt) l.unvalidatedDistanceMinutes += m;
    } else {
      l.campusMinutes += m;
    }
  }
  return l;
}

export const toHours = (minutes: number): number => minutes / 60;

/**
 * Rounding, for a document rather than the ledger.
 *
 * Quarter-hour is the common convention in clock-hour schools, but it is a
 * convention and not a rule we have read, so it is a parameter with a stated
 * default rather than a constant pretending to be law.
 */
export function roundForReport(minutes: number, granularityMinutes = 15): number {
  return Math.floor(minutes / granularityMinutes) * granularityMinutes;
}

// ---------------------------------------------------------------------------
// May this punch happen?
// ---------------------------------------------------------------------------

export type RefusalCode =
  | "already_clocked_in"
  | "remote_practical"
  | "core_distance_cap"
  | "specialty_distance_cap"
  | "monthly_cap"
  | "not_active";

export interface ClockInRequest {
  kind: HourKind;
  modality: Modality;
  segment: Segment;
}

export interface ClockDecision {
  allowed: boolean;
  code?: RefusalCode;
  /** Plain enough to show a student standing at a kiosk. */
  message?: string;
  /** Minutes of headroom left in whichever ceiling is nearest, when relevant. */
  headroomMinutes?: number;
}

/**
 * Minutes already earned in the calendar month containing `now`, in the
 * school's timezone.
 *
 * The timezone is not decoration. §83.72(w) caps a CALENDAR MONTH, and a punch
 * at 11pm on the 31st belongs to a different month in Chicago than it does in
 * UTC — which is the sort of thing that is invisible until an inspector
 * recomputes a total and gets a different answer.
 */
export function minutesInMonth(punches: Punch[], now: Date, timeZone: string): number {
  const key = (d: Date) =>
    new Intl.DateTimeFormat("en-CA", { timeZone, year: "numeric", month: "2-digit" }).format(d);
  const target = key(now);
  let total = 0;
  for (const p of punches) {
    if (!isCountable(p)) continue;
    if (key(new Date(p.punchedInAt)) === target) total += punchMinutes(p);
  }
  return total;
}

/**
 * Whether a student may start this punch.
 *
 * REFUSES RATHER THAN WARNS, and the order matters: the checks run cheapest and
 * most absolute first, so a student who is already clocked in is told that
 * rather than being handed a lecture about ceilings.
 *
 * The distance ceilings are checked on the punch that would CROSS them, not
 * after. A school that learns at the audit that a student went 12 hours over is
 * a school that already has the violation.
 */
export function canClockIn(args: {
  request: ClockInRequest;
  punches: Punch[];
  program: Program;
  studentStatus: string;
  now: Date;
  timeZone: string;
}): ClockDecision {
  const { request, punches, program, studentStatus, now, timeZone } = args;

  if (studentStatus !== "active") {
    return {
      allowed: false,
      code: "not_active",
      message: `This record is ${studentStatus.replace("_", " ")}. See the front desk.`,
    };
  }

  const l = ledger(punches, now);
  if (l.openPunch) {
    return {
      allowed: false,
      code: "already_clocked_in",
      message: "You're already clocked in. Clock out first.",
    };
  }

  // The database enforces this too. Checked here so the kiosk can explain it
  // rather than surfacing a constraint violation.
  if (request.kind === "practical" && request.modality === "distance") {
    return {
      allowed: false,
      code: "remote_practical",
      message: "Practical hours have to be earned on campus. They can never be distance hours.",
    };
  }

  if (request.modality === "distance") {
    const caps = distanceCaps(program);
    const capMinutes =
      request.segment === "core" ? caps.core * 60 : caps.specialty * 60;
    const used =
      request.segment === "core" ? l.coreDistanceMinutes : l.specialtyDistanceMinutes;
    const headroom = capMinutes - used;

    if (headroom <= 0) {
      return {
        allowed: false,
        code: request.segment === "core" ? "core_distance_cap" : "specialty_distance_cap",
        message: `You've used all ${request.segment} distance hours available. The rest have to be on campus.`,
        headroomMinutes: 0,
      };
    }
    // Allowed, but the caller is told how little is left so a kiosk can say so.
    const monthly = monthlyDecision(punches, now, timeZone);
    return monthly.allowed ? { allowed: true, headroomMinutes: headroom } : monthly;
  }

  return monthlyDecision(punches, now, timeZone);
}

function monthlyDecision(punches: Punch[], now: Date, timeZone: string): ClockDecision {
  const used = minutesInMonth(punches, now, timeZone);
  const capMinutes = MONTHLY_HOUR_CAP * 60;
  if (used >= capMinutes) {
    return {
      allowed: false,
      code: "monthly_cap",
      message: `You've reached the ${MONTHLY_HOUR_CAP}-hour limit for this month. You can clock in again next month.`,
      headroomMinutes: 0,
    };
  }
  return { allowed: true, headroomMinutes: capMinutes - used };
}

/**
 * Written-exam eligibility.
 *
 * TDLR lets a candidate sit the written exam at 900 of the 1,000 hours, before
 * the course is finished — which is a scheduling fact a school needs to see
 * coming, not discover. Expressed as a fraction of the program so it holds for
 * the shorter courses too.
 */
export const WRITTEN_EXAM_ELIGIBLE_FRACTION = 0.9;

export function writtenExamEligible(l: Ledger, program: Program): boolean {
  return toHours(l.totalMinutes) >= program.totalHours * WRITTEN_EXAM_ELIGIBLE_FRACTION;
}
