import { MAX_BUSINESS_DAYS_BETWEEN_CAMPUS, MONTHLY_HOUR_CAP, businessDaysBetween } from "@/lib/compliance-binder";

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

// ---------------------------------------------------------------------------
// The schedule
// ---------------------------------------------------------------------------

export interface ScheduleBlock {
  id: string;
  label: string;
  /** 0 = Sunday, matching Date#getDay. */
  weekday: number;
  startsMinute: number;
  endsMinute: number;
  kind: HourKind;
  modality: Modality;
  segment: Segment;
  instructorId: string | null;
  effectiveFrom: string;
  effectiveTo: string | null;
}

/**
 * Local wall-clock weekday and minute-of-day, in the school's timezone.
 *
 * A block is "09:00 Tuesday", which is a wall-clock fact. Comparing it against
 * a UTC instant directly would shift every class by an hour for half the year,
 * so the instant is converted into the school's local frame first and the
 * comparison happens there.
 */
export function localWallClock(now: Date, timeZone: string): { weekday: number; minute: number; date: string } {
  const parts = new Intl.DateTimeFormat("en-US", {
    timeZone, weekday: "short", hour: "2-digit", minute: "2-digit", hour12: false,
    year: "numeric", month: "2-digit", day: "2-digit",
  }).formatToParts(now);
  const get = (t: string) => parts.find((p) => p.type === t)?.value ?? "";
  const weekday = ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"].indexOf(get("weekday"));
  // Intl renders midnight as "24" in some locales under hour12:false.
  const hour = Number(get("hour")) % 24;
  return {
    weekday,
    minute: hour * 60 + Number(get("minute")),
    date: `${get("year")}-${get("month")}-${get("day")}`,
  };
}

/**
 * The block running right now, or null.
 *
 * NULL IS A REAL ANSWER, not a failure. Nothing is scheduled at 6am on a
 * Sunday, and the honest response to a student tapping in then is to say so —
 * not to invent a default hour type. "The schedule decides" means the schedule
 * also decides when nothing is happening.
 *
 * If blocks overlap, the one that STARTS LATEST wins. Overlap is a timetabling
 * mistake rather than a feature, but a deterministic answer beats an arbitrary
 * one, and the later block is the more specific in every real case observed
 * (a clinic session carved out of a longer lab).
 */
export function blockAt(
  blocks: ScheduleBlock[],
  now: Date,
  timeZone: string
): ScheduleBlock | null {
  const { weekday, minute, date } = localWallClock(now, timeZone);
  const live = blocks.filter(
    (b) =>
      b.weekday === weekday &&
      minute >= b.startsMinute &&
      minute < b.endsMinute &&
      b.effectiveFrom <= date &&
      (b.effectiveTo === null || b.effectiveTo >= date)
  );
  if (live.length === 0) return null;
  return live.reduce((a, b) => (b.startsMinute > a.startsMinute ? b : a));
}

/** "9:00 AM – 12:00 PM", for a kiosk that has to be readable across a room. */
export function blockWindow(b: ScheduleBlock): string {
  const fmt = (m: number) => {
    const h24 = Math.floor(m / 60);
    const mm = String(m % 60).padStart(2, "0");
    const ampm = h24 < 12 ? "AM" : "PM";
    const h12 = h24 % 12 === 0 ? 12 : h24 % 12;
    return `${h12}:${mm} ${ampm}`;
  };
  return `${fmt(b.startsMinute)} \u2013 ${fmt(b.endsMinute)}`;
}

// ---------------------------------------------------------------------------
// The campus clock
// ---------------------------------------------------------------------------

/**
 * The dates a student was physically on campus, in the school's timezone.
 *
 * Derived from punches rather than stored. A "campus day" is not a field
 * anybody maintains — it is a consequence of somebody having clocked in on
 * site, and deriving it means it can never drift from the attendance it is
 * supposed to summarise.
 */
export function campusDates(punches: Punch[], timeZone: string): string[] {
  const days = new Set<string>();
  for (const p of punches) {
    if (p.voidedAt || p.modality !== "campus") continue;
    days.add(localWallClock(new Date(p.punchedInAt), timeZone).date);
  }
  return [...days].sort();
}

export interface CampusGap {
  from: string;
  to: string;
  businessDays: number;
}

/**
 * Stretches where a student went too long without setting foot on campus.
 *
 * NACCAS VI.02 element 3 requires the student physically present at least once
 * every 10 business days. This is the check nobody computes, because it is a
 * calendar calculation over attendance rather than a number in a column — a
 * school with immaculate records still cannot answer it without joining
 * attendance to a business-day calendar that excludes federal holidays.
 *
 * The window runs from enrollment to `asOf`, not just between visits, so a
 * student who enrolled six weeks ago and has never appeared shows a gap. The
 * absence at the start is the one most likely to matter and the easiest to
 * miss, because there is no "from" visit to anchor it.
 */
export function campusGaps(
  punches: Punch[],
  args: { enrolledOn: string; asOf: string; timeZone: string }
): CampusGap[] {
  const days = campusDates(punches, args.timeZone);
  const marks = [args.enrolledOn, ...days, args.asOf];
  const out: CampusGap[] = [];
  for (let i = 0; i < marks.length - 1; i++) {
    const n = businessDaysBetween(marks[i], marks[i + 1]);
    if (n > MAX_BUSINESS_DAYS_BETWEEN_CAMPUS) {
      out.push({ from: marks[i], to: marks[i + 1], businessDays: n });
    }
  }
  return out;
}

export { MAX_BUSINESS_DAYS_BETWEEN_CAMPUS, MONTHLY_HOUR_CAP };

// ---------------------------------------------------------------------------
// When a session must end
// ---------------------------------------------------------------------------

/**
 * The moment a punch opened under `block` stops being creditable.
 *
 * THE RULE IS THE TIMETABLE, NOT A TIMEOUT. A session cannot run past the end
 * of the class it was opened under, because after that the class is over — the
 * block is what says the hour is core theory taken at a distance, and there is
 * nothing to attribute a 9:30pm minute of a 9pm class to. Picking an arbitrary
 * "sessions expire after N hours" instead would be inventing a number the
 * school never agreed to and that no rule supports.
 *
 * RETURNS null WHEN THERE IS NO BLOCK, and that is a real answer rather than a
 * fallback. An admin-entered or imported punch has no scheduled end, so nothing
 * here can honestly say when it should have closed. Guessing would write a
 * fabricated clock-out into an hour record; the caller surfaces it for a human
 * instead.
 *
 * WORKS IN THE SCHOOL'S WALL CLOCK. The block says "ends at minute 1260" — 9pm
 * where the school is, which is a different instant in June and December.
 * Reconstructing it from the punch-in date in the school's timezone is the only
 * way to land on the right instant across a daylight-saving change.
 */
export function sessionMustEndAt(
  punchedInAt: Date,
  block: ScheduleBlock | null,
  timeZone: string
): Date | null {
  if (!block) return null;

  const local = localWallClock(punchedInAt, timeZone);

  /*
   * A punch that began before its block's start is credited to the block's end
   * on the SAME calendar day — the student arrived early for a class that then
   * ran and ended. A punch that began after the end belongs to a block that was
   * already over when it opened, which the kiosk would not have issued; it is
   * treated the same way rather than being pushed to the next day, because
   * moving it forward would invent a session that never happened.
   */
  const [y, m, d] = local.date.split("-").map(Number);

  // Walk from a UTC guess to the instant whose local wall clock matches the
  // block's end. Two passes settle it: the first lands within an hour or so,
  // the second corrects for the offset at that instant, which is what makes a
  // DST boundary come out right instead of an hour off.
  let guess = new Date(Date.UTC(y, m - 1, d, 0, block.endsMinute, 0, 0));
  for (let i = 0; i < 2; i++) {
    const at = localWallClock(guess, timeZone);
    const drift = block.endsMinute - at.minute;
    if (drift === 0 && at.date === local.date) break;
    guess = new Date(guess.getTime() + drift * 60_000);
    // A drift correction can move the guess across midnight; pull it back onto
    // the punch's own day so a late-evening block never lands on the next one.
    const after = localWallClock(guess, timeZone);
    if (after.date !== local.date) {
      const days = (Date.parse(`${local.date}T00:00:00Z`) - Date.parse(`${after.date}T00:00:00Z`)) / 86_400_000;
      guess = new Date(guess.getTime() + days * 86_400_000);
    }
  }
  return guess;
}

/**
 * Whether an open punch has outlived its class, as of `now`.
 *
 * A punch with no block is never stale here — see sessionMustEndAt(). It is not
 * "fine", it is "not this function's to judge".
 */
export function isStale(
  punchedInAt: Date,
  block: ScheduleBlock | null,
  timeZone: string,
  now: Date
): boolean {
  const end = sessionMustEndAt(punchedInAt, block, timeZone);
  return end !== null && now.getTime() > end.getTime();
}
