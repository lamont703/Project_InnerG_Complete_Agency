import "server-only";
import { createAdminClient } from "@/lib/supabase/admin";
import type { Punch, Program, ScheduleBlock } from "./hours";

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
