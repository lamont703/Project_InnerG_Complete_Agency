import "server-only";

import { createAdminClient } from "@/lib/supabase/admin";
import type { Punch, Program, ScheduleBlock } from "./hours";
// One generator, imported rather than copied. Two token functions in two files
// is two places for the byte length to drift, and the one that shrinks is the
// one nobody notices.
import { claimToken } from "./learning-store";

/**
 * Reads and writes for the school system of record.
 *
 * SERVER ONLY, enforced by the import rather than by convention. Every table
 * here is RLS-enabled with no policies, so one import into a client component
 * would be a build error instead of a browser bundle containing other people's
 * attendance.
 */

function admin() {
  return createAdminClient() as any;
}

export interface SchoolRow { id: string; name: string; timezone: string }
export interface StudentRow {
  id: string; schoolId: string; programId: string;
  firstName: string; lastName: string; clockCode: string; status: string;
}

export async function schoolById(id: string): Promise<SchoolRow | null> {
  const { data } = await admin().from("sis_schools").select("id, name, timezone").eq("id", id).maybeSingle();
  return data ? { id: data.id, name: data.name, timezone: data.timezone } : null;
}

/** The single school a kiosk belongs to. One row is the common case today. */
export async function firstSchool(): Promise<SchoolRow | null> {
  const { data } = await admin().from("sis_schools").select("id, name, timezone").order("created_at").limit(1).maybeSingle();
  return data ? { id: data.id, name: data.name, timezone: data.timezone } : null;
}

export async function studentByCode(schoolId: string, clockCode: string): Promise<StudentRow | null> {
  const { data } = await admin()
    .from("sis_students")
    .select("id, school_id, program_id, first_name, last_name, clock_code, status")
    .eq("school_id", schoolId)
    .eq("clock_code", clockCode)
    .maybeSingle();
  if (!data) return null;
  return {
    id: data.id, schoolId: data.school_id, programId: data.program_id,
    firstName: data.first_name, lastName: data.last_name,
    clockCode: data.clock_code, status: data.status,
  };
}

export async function programById(id: string): Promise<Program | null> {
  const { data } = await admin()
    .from("sis_programs")
    .select("total_hours, core_hours, specialty_hours, core_distance_cap, specialty_distance_cap")
    .eq("id", id).maybeSingle();
  if (!data) return null;
  return {
    totalHours: data.total_hours, coreHours: data.core_hours, specialtyHours: data.specialty_hours,
    coreDistanceCap: data.core_distance_cap, specialtyDistanceCap: data.specialty_distance_cap,
  };
}

function toPunch(r: any): Punch {
  return {
    id: r.id,
    punchedInAt: r.punched_in_at,
    punchedOutAt: r.punched_out_at ?? null,
    kind: r.kind, modality: r.modality, segment: r.segment,
    instructorId: r.instructor_id ?? null,
    validatedAt: r.validated_at ?? null,
    voidedAt: r.voided_at ?? null,
  };
}

const PUNCH_COLS =
  "id, punched_in_at, punched_out_at, kind, modality, segment, instructor_id, validated_at, voided_at";

/**
 * Every punch for a student, voids included.
 *
 * VOIDED ROWS ARE RETURNED, not filtered out. The engine ignores them for
 * totals, and the ledger screen has to show them — a correction trail with the
 * corrections hidden is just a different set of numbers with no explanation.
 */
export async function punchesFor(studentId: string): Promise<Punch[]> {
  const { data, error } = await admin()
    .from("sis_punches").select(PUNCH_COLS)
    .eq("student_id", studentId).order("punched_in_at");
  if (error) throw new Error(`punchesFor(${studentId}): ${error.message}`);
  return (data ?? []).map(toPunch);
}

export async function scheduleFor(programId: string): Promise<ScheduleBlock[]> {
  const { data, error } = await admin()
    .from("sis_schedule_blocks")
    .select("id, label, weekday, starts_minute, ends_minute, kind, modality, segment, instructor_id, effective_from, effective_to")
    .eq("program_id", programId);
  if (error) throw new Error(`scheduleFor(${programId}): ${error.message}`);
  return (data ?? []).map((r: any) => ({
    id: r.id, label: r.label, weekday: r.weekday,
    startsMinute: r.starts_minute, endsMinute: r.ends_minute,
    kind: r.kind, modality: r.modality, segment: r.segment,
    instructorId: r.instructor_id ?? null,
    effectiveFrom: r.effective_from, effectiveTo: r.effective_to ?? null,
  }));
}

export async function openPunchFor(studentId: string): Promise<Punch | null> {
  const { data } = await admin()
    .from("sis_punches").select(PUNCH_COLS)
    .eq("student_id", studentId).is("punched_out_at", null).is("voided_at", null)
    .maybeSingle();
  return data ? toPunch(data) : null;
}

export async function insertPunch(args: {
  studentId: string; block: ScheduleBlock; at: Date;
}): Promise<{ ok: boolean; error?: string }> {
  const { error } = await admin().from("sis_punches").insert({
    student_id: args.studentId,
    punched_in_at: args.at.toISOString(),
    kind: args.block.kind, modality: args.block.modality, segment: args.block.segment,
    instructor_id: args.block.instructorId,
    schedule_block_id: args.block.id,
    source: "kiosk",
  });
  /*
   * A unique-violation here is the one-open-punch index doing its job — two
   * taps a second apart, or two kiosks. It is not an error worth showing as
   * one, because the student's intent (be clocked in) is already satisfied.
   */
  if (error && /duplicate key|unique/i.test(error.message)) {
    return { ok: false, error: "already_clocked_in" };
  }
  return error ? { ok: false, error: error.message } : { ok: true };
}

export async function closePunch(punchId: string, at: Date): Promise<{ ok: boolean; error?: string }> {
  const { error } = await admin()
    .from("sis_punches").update({ punched_out_at: at.toISOString() })
    .eq("id", punchId).is("punched_out_at", null);
  return error ? { ok: false, error: error.message } : { ok: true };
}

// ---------------------------------------------------------------------------
// Roster
// ---------------------------------------------------------------------------

export interface RosterEntry {
  student: StudentRow;
  programName: string;
  program: Program;
  punches: Punch[];
  /** Set while the student is on the clock right now. */
  onClockSince: string | null;
}

/**
 * Every student at a school, with enough history to compute their standing.
 *
 * READS EVERY PUNCH FOR EVERY STUDENT, which is fine at a school's scale (a
 * few hundred students against a few thousand punches each) and would not be
 * at a district's. Written this way on purpose rather than with a clever
 * aggregate: the totals then come from lib/school/hours.ts, which is the same
 * code the kiosk and the ledger use, so a roster figure can never disagree with
 * a transcript. When this gets slow, the fix is a materialised total that is
 * still derived from these punches — not a second definition of an hour.
 */
export async function roster(schoolId: string): Promise<RosterEntry[]> {
  const { data: students, error } = await admin()
    .from("sis_students")
    .select("id, school_id, program_id, first_name, last_name, clock_code, status")
    .eq("school_id", schoolId)
    .order("last_name");
  if (error) throw new Error(`roster(${schoolId}): ${error.message}`);
  if (!students?.length) return [];

  const { data: programs } = await admin()
    .from("sis_programs")
    .select("id, name, total_hours, core_hours, specialty_hours, core_distance_cap, specialty_distance_cap")
    .eq("school_id", schoolId);
  const byProgram = new Map<string, any>((programs ?? []).map((p: any) => [p.id, p]));

  const { data: allPunches, error: pErr } = await admin()
    .from("sis_punches").select(PUNCH_COLS + ", student_id")
    .in("student_id", students.map((s: any) => s.id))
    .order("punched_in_at");
  if (pErr) throw new Error(`roster punches: ${pErr.message}`);

  const byStudent = new Map<string, Punch[]>();
  for (const r of allPunches ?? []) {
    const list = byStudent.get(r.student_id) ?? [];
    list.push(toPunch(r));
    byStudent.set(r.student_id, list);
  }

  return students.map((s: any) => {
    const p = byProgram.get(s.program_id);
    const punches = byStudent.get(s.id) ?? [];
    const open = punches.find((x) => !x.punchedOutAt && !x.voidedAt) ?? null;
    return {
      student: {
        id: s.id, schoolId: s.school_id, programId: s.program_id,
        firstName: s.first_name, lastName: s.last_name,
        clockCode: s.clock_code, status: s.status,
      },
      programName: p?.name ?? "Unknown program",
      program: {
        totalHours: p?.total_hours ?? 0, coreHours: p?.core_hours ?? 0,
        specialtyHours: p?.specialty_hours ?? 0,
        coreDistanceCap: p?.core_distance_cap ?? null,
        specialtyDistanceCap: p?.specialty_distance_cap ?? null,
      },
      punches,
      onClockSince: open?.punchedInAt ?? null,
    };
  });
}

export async function programsFor(schoolId: string): Promise<{ id: string; name: string }[]> {
  const { data } = await admin().from("sis_programs").select("id, name").eq("school_id", schoolId).order("name");
  return (data ?? []).map((p: any) => ({ id: p.id, name: p.name }));
}

/**
 * Enroll a student.
 *
 * THE CLOCK CODE IS GENERATED, NOT CHOSEN. A person picking their own would
 * pick their birth year, and the code is the only credential the kiosk has.
 * Four digits is short enough to tap at a door and long enough that the
 * uniqueness index does the rest — a collision retries rather than failing,
 * because a front desk enrolling somebody should never see a database error.
 */
export async function enrollStudent(args: {
  schoolId: string; programId: string;
  firstName: string; lastName: string; email?: string | null; phone?: string | null;
  enrolledOn: string;
}): Promise<{ ok: boolean; clockCode?: string; claimToken?: string; error?: string }> {
  for (let attempt = 0; attempt < 6; attempt++) {
    const code = String(Math.floor(1000 + Math.random() * 9000));
    /*
     * TWO CREDENTIALS, DELIBERATELY DIFFERENT SIZES, because they are used in
     * places with very different defences.
     *
     * The clock code is four digits and belongs at the door, where guessing it
     * means standing in the building typing wrong numbers at a screen in front
     * of staff. The claim token opens a student's account over the open
     * internet, where ten thousand guesses is a shell loop, so it is 20 random
     * bytes. Issuing one credential for both jobs would have meant either an
     * unusable kiosk or a guessable account.
     */
    const claim = claimToken();
    const { error } = await admin().from("sis_students").insert({
      school_id: args.schoolId, program_id: args.programId,
      first_name: args.firstName, last_name: args.lastName,
      email: args.email || null, phone: args.phone || null,
      clock_code: code, enrolled_on: args.enrolledOn,
      claim_token: claim,
    });
    if (!error) return { ok: true, clockCode: code, claimToken: claim };
    if (!/duplicate key|unique/i.test(error.message)) return { ok: false, error: error.message };
  }
  return { ok: false, error: "Could not allocate a clock code. Try again." };
}

// ---------------------------------------------------------------------------
// One student, in full
// ---------------------------------------------------------------------------

export interface StudentDetail {
  student: StudentRow;
  school: SchoolRow;
  programName: string;
  program: Program;
  enrolledOn: string;
  punches: Punch[];
  /** Label per block id, so a punch can name the class it was taken under. */
  blockLabels: Record<string, string>;
}

export async function studentDetail(studentId: string): Promise<StudentDetail | null> {
  const { data: s } = await admin()
    .from("sis_students")
    .select("id, school_id, program_id, first_name, last_name, clock_code, status, enrolled_on")
    .eq("id", studentId).maybeSingle();
  if (!s) return null;

  const [school, prog, punches, blocks] = await Promise.all([
    schoolById(s.school_id),
    admin().from("sis_programs")
      .select("name, total_hours, core_hours, specialty_hours, core_distance_cap, specialty_distance_cap")
      .eq("id", s.program_id).maybeSingle(),
    // Voids INCLUDED. The engine ignores them for totals and the ledger has to
    // show them — a correction trail with the corrections filtered out is just
    // a different set of numbers with nothing to explain them.
    admin().from("sis_punches").select(PUNCH_COLS + ", schedule_block_id, source, voided_by, void_reason")
      .eq("student_id", studentId).order("punched_in_at"),
    scheduleFor(s.program_id),
  ]);
  if (!school || !prog.data) return null;

  const blockLabels: Record<string, string> = {};
  for (const b of blocks) blockLabels[b.id] = b.label;

  return {
    student: {
      id: s.id, schoolId: s.school_id, programId: s.program_id,
      firstName: s.first_name, lastName: s.last_name,
      clockCode: s.clock_code, status: s.status,
    },
    school,
    enrolledOn: s.enrolled_on,
    programName: prog.data.name,
    program: {
      totalHours: prog.data.total_hours, coreHours: prog.data.core_hours,
      specialtyHours: prog.data.specialty_hours,
      coreDistanceCap: prog.data.core_distance_cap,
      specialtyDistanceCap: prog.data.specialty_distance_cap,
    },
    punches: (punches.data ?? []).map((r: any) => ({
      ...toPunch(r),
      scheduleBlockId: r.schedule_block_id ?? null,
      source: r.source,
      voidedBy: r.voided_by ?? null,
      voidReason: r.void_reason ?? null,
    })) as any,
    blockLabels,
  };
}

/**
 * Void a punch.
 *
 * THE ROW IS NEVER EDITED AND NEVER DELETED. Its timestamps stay exactly as
 * they were recorded and it gains a reason and an author, so the trail reads
 * "this was wrong, here is who said so, here is why" rather than silently
 * becoming a different fact. That is the entire reason the record is worth
 * anything to an inspector.
 *
 * A REASON IS REQUIRED. A void with no explanation is indistinguishable from a
 * deletion after the fact, which is the thing this design exists to prevent.
 */
export async function voidPunch(args: {
  punchId: string; reason: string; by: string;
}): Promise<{ ok: boolean; error?: string }> {
  if (!args.reason.trim()) return { ok: false, error: "A reason is required." };
  const { error } = await admin().from("sis_punches").update({
    voided_at: new Date().toISOString(),
    voided_by: args.by,
    void_reason: args.reason.trim().slice(0, 500),
  }).eq("id", args.punchId).is("voided_at", null);
  return error ? { ok: false, error: error.message } : { ok: true };
}

// ---------------------------------------------------------------------------
// Instructors, and validating distance hours
// ---------------------------------------------------------------------------

export interface Instructor {
  id: string;
  name: string;
  licenseNumber: string | null;
  active: boolean;
}

export async function instructorsFor(schoolId: string): Promise<Instructor[]> {
  const { data } = await admin()
    .from("sis_instructors")
    .select("id, name, license_number, active")
    .eq("school_id", schoolId).eq("active", true).order("name");
  return (data ?? []).map((r: any) => ({
    id: r.id, name: r.name, licenseNumber: r.license_number ?? null, active: r.active,
  }));
}

export async function addInstructor(args: {
  schoolId: string; name: string; licenseNumber?: string | null; email?: string | null;
}): Promise<{ ok: boolean; error?: string }> {
  if (!args.name.trim()) return { ok: false, error: "A name is required." };
  const { error } = await admin().from("sis_instructors").insert({
    school_id: args.schoolId, name: args.name.trim(),
    license_number: args.licenseNumber?.trim() || null,
    email: args.email?.trim() || null,
  });
  return error ? { ok: false, error: error.message } : { ok: true };
}

export interface PendingValidation {
  punchId: string;
  studentId: string;
  studentName: string;
  date: string;
  punchedInAt: string;
  punchedOutAt: string;
  minutes: number;
  segment: string;
  blockLabel: string | null;
}

/**
 * Distance hours nobody has signed for.
 *
 * CLOSED PUNCHES ONLY. A student still on the clock has not finished the
 * session, and signing for participation that is still happening is signing for
 * something nobody has seen the end of.
 *
 * DISTANCE ONLY. Campus hours are witnessed by an instructor being in the room;
 * VI.02 element 1 is specifically about the ones that are not.
 *
 * OLDEST FIRST. The queue is a backlog, and the oldest unsigned hour is both
 * the one closest to being indefensible and the one an instructor is least
 * likely to remember — which is an argument for signing promptly, and for the
 * page saying how old the oldest one is.
 */
export async function pendingValidation(schoolId: string, limit = 200): Promise<PendingValidation[]> {
  const { data: students } = await admin()
    .from("sis_students").select("id, first_name, last_name").eq("school_id", schoolId);
  if (!students?.length) return [];
  const names = new Map<string, string>(
    students.map((s: any) => [s.id, `${s.first_name} ${s.last_name}`])
  );

  const { data, error } = await admin()
    .from("sis_punches")
    .select("id, student_id, punched_in_at, punched_out_at, segment, schedule_block_id")
    .in("student_id", [...names.keys()])
    .eq("modality", "distance")
    .is("validated_at", null)
    .is("voided_at", null)
    .not("punched_out_at", "is", null)
    .order("punched_in_at")
    .limit(limit);
  if (error) throw new Error(`pendingValidation: ${error.message}`);

  const { data: blocks } = await admin()
    .from("sis_schedule_blocks").select("id, label").eq("school_id", schoolId);
  const labels = new Map<string, string>((blocks ?? []).map((b: any) => [b.id, b.label]));

  return (data ?? []).map((r: any) => ({
    punchId: r.id,
    studentId: r.student_id,
    studentName: names.get(r.student_id) ?? "Unknown",
    date: r.punched_in_at.slice(0, 10),
    punchedInAt: r.punched_in_at,
    punchedOutAt: r.punched_out_at,
    minutes: Math.round(
      (new Date(r.punched_out_at).getTime() - new Date(r.punched_in_at).getTime()) / 60000
    ),
    segment: r.segment,
    blockLabel: r.schedule_block_id ? labels.get(r.schedule_block_id) ?? null : null,
  }));
}

/**
 * Sign for a set of distance hours.
 *
 * WRITES validated_by AND validated_at TOGETHER, which the CHECK constraint in
 * 20260831020000 also enforces: a validated_at with no validator is the shape a
 * careless bulk update leaves behind, and it would read as signed.
 *
 * ONLY EVER SIGNS UNSIGNED PUNCHES — the `is("validated_at", null)` filter
 * means a second signature can never overwrite the first. The earliest
 * signature is the one that was actually given.
 */
export async function validatePunches(args: {
  punchIds: string[]; instructorId: string;
}): Promise<{ ok: boolean; signed?: number; error?: string }> {
  if (!args.punchIds.length) return { ok: false, error: "Nothing selected." };
  const { data, error } = await admin()
    .from("sis_punches")
    .update({ validated_at: new Date().toISOString(), validated_by: args.instructorId })
    .in("id", args.punchIds)
    .is("validated_at", null)
    .is("voided_at", null)
    .select("id");
  if (error) return { ok: false, error: error.message };
  return { ok: true, signed: data?.length ?? 0 };
}

/**
 * Who signed for which punch, for one student.
 *
 * DELIBERATELY NOT PART OF THE Punch TYPE. lib/school/hours.ts is a pure engine
 * and it only ever asks WHETHER an hour is validated — the name of the person
 * who signed changes no total it computes. Threading the name through it would
 * add a field the engine never reads, and the next person maintaining it would
 * reasonably assume it mattered.
 */
export async function signaturesFor(
  studentId: string
): Promise<Record<string, { name: string; at: string }>> {
  const { data } = await admin()
    .from("sis_punches")
    .select("id, validated_at, validated_by")
    .eq("student_id", studentId)
    .not("validated_by", "is", null);
  if (!data?.length) return {};

  const ids = [...new Set(data.map((r: any) => r.validated_by))];
  const { data: people } = await admin()
    .from("sis_instructors").select("id, name").in("id", ids);
  const names = new Map<string, string>((people ?? []).map((p: any) => [p.id, p.name]));

  const out: Record<string, { name: string; at: string }> = {};
  for (const r of data as any[]) {
    out[r.id] = {
      // A deleted instructor row leaves the punch signed but unattributable.
      // Saying so is better than dropping the signature or inventing a name.
      name: names.get(r.validated_by) ?? "an instructor no longer on file",
      at: r.validated_at,
    };
  }
  return out;
}
