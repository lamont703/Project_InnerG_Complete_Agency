/**
 * Database access for the student portal and self-paced lessons.
 *
 * SEPARATE FROM store.ts, which serves the staff console. The two have
 * different callers and, more importantly, different trust: everything here is
 * reachable by a signed-in student, so every read is scoped by a student id
 * that came from a verified session and never from a request body.
 *
 * THE RULE THIS FILE MUST NOT BREAK. A student id arriving from the client is
 * not an identity — it is a request to read somebody else's hour record. The
 * only function that turns a session into a student is studentForUser(), and
 * every other function takes the id that yielded.
 */
import "server-only";

import { randomBytes } from "crypto";
import { createAdminClient } from "@/lib/supabase/admin";
import { blockAt, canClockIn, type Punch, type ScheduleBlock } from "./hours";
import type { LessonSection, SectionProgress } from "./learning";

/*
 * Cast to `any` for the same reason store.ts does: types/database.ts is
 * generated and predates every sis_ table, so the typed client narrows these
 * selects to `never`. The alternative is regenerating types on a schema that is
 * still moving. Row shapes are asserted at the boundary of each function
 * instead, which is where they would have to be checked anyway.
 */
const admin = () => createAdminClient() as any;

/** Same shape as the credit-report worker invites: 20 random bytes, url-safe. */
export function claimToken(): string {
  return randomBytes(20).toString("base64url");
}

// ---------------------------------------------------------------------------
// Identity
// ---------------------------------------------------------------------------

export interface StudentIdentity {
  id: string;
  schoolId: string;
  programId: string;
  firstName: string;
  lastName: string;
  status: string;
  enrolledOn: string;
}

/** The student record attached to a signed-in user, or null. */
export async function studentForUser(userId: string): Promise<StudentIdentity | null> {
  const { data } = await admin()
    .from("sis_students")
    .select("id, school_id, program_id, first_name, last_name, status, enrolled_on")
    .eq("user_id", userId)
    .maybeSingle();
  if (!data) return null;
  return {
    id: data.id, schoolId: data.school_id, programId: data.program_id,
    firstName: data.first_name, lastName: data.last_name,
    status: data.status, enrolledOn: data.enrolled_on,
  };
}

/**
 * Attach a signed-in user to the student record a claim link names.
 *
 * REFUSES A SECOND CLAIM rather than reassigning. A token that has already been
 * used is spent; if a student needs a new link because the old one went to the
 * wrong number, the school issues one, and that is a deliberate act by staff
 * rather than a side effect of somebody clicking twice.
 *
 * REFUSES A USER WHO ALREADY HAS A RECORD. One person, one student row — the
 * unique index enforces it, and catching it here produces a sentence instead of
 * a constraint violation.
 */
export async function claimStudent(args: {
  token: string;
  userId: string;
}): Promise<{ ok: boolean; studentId?: string; error?: string }> {
  const existing = await studentForUser(args.userId);
  if (existing) {
    return { ok: false, error: "This account is already linked to a student record." };
  }

  const { data: target } = await admin()
    .from("sis_students")
    .select("id, user_id, status")
    .eq("claim_token", args.token)
    .maybeSingle();

  if (!target) return { ok: false, error: "That link is not valid. Ask the school for a new one." };
  if (target.user_id) return { ok: false, error: "That link has already been used." };

  const { data, error } = await admin()
    .from("sis_students")
    .update({ user_id: args.userId, claimed_at: new Date().toISOString() })
    .eq("id", target.id)
    // The null check is what makes two simultaneous claims safe: the second
    // update matches no rows rather than overwriting the first.
    .is("user_id", null)
    .select("id");

  if (error) return { ok: false, error: error.message };
  if (!data?.length) return { ok: false, error: "That link has already been used." };
  return { ok: true, studentId: target.id };
}

/** Mint a claim link for a student who has none, or re-issue one. */
export async function issueClaimToken(studentId: string): Promise<string | null> {
  const t = claimToken();
  const { error } = await admin()
    .from("sis_students")
    .update({ claim_token: t })
    .eq("id", studentId)
    .is("user_id", null); // A claimed record does not need, and must not get, a fresh link.
  return error ? null : t;
}

/**
 * Whether a student has an account yet, and their unused link if not.
 *
 * RETURNS NO TOKEN ONCE CLAIMED. After a student has signed in, the link is
 * spent and showing it again on a staff screen would only invite somebody to
 * paste it somewhere.
 */
export async function portalStateFor(
  studentId: string
): Promise<{ token: string | null; claimedAt: string | null }> {
  const { data } = await admin()
    .from("sis_students").select("claim_token, user_id, claimed_at")
    .eq("id", studentId).maybeSingle();
  if (!data) return { token: null, claimedAt: null };
  if (data.user_id) return { token: null, claimedAt: data.claimed_at ?? null };
  return { token: data.claim_token ?? null, claimedAt: null };
}

// ---------------------------------------------------------------------------
// Lessons
// ---------------------------------------------------------------------------

export interface LessonSummary {
  id: string;
  title: string;
  summary: string | null;
  position: number;
  estimatedMinutes: number;
  published: boolean;
  blockId: string;
  blockLabel: string;
  sectionCount: number;
}

/** Published lessons for a student's program, in order. */
export async function lessonsForProgram(
  programId: string,
  opts: { includeUnpublished?: boolean } = {}
): Promise<LessonSummary[]> {
  let q = admin()
    .from("sis_lessons")
    .select("id, title, summary, position, estimated_minutes, published, schedule_block_id")
    .eq("program_id", programId)
    .order("position");
  if (!opts.includeUnpublished) q = q.eq("published", true);

  const { data } = await q;
  if (!data?.length) return [];

  const [{ data: blocks }, { data: sections }] = await Promise.all([
    admin().from("sis_schedule_blocks").select("id, label")
      .in("id", [...new Set(data.map((l: any) => l.schedule_block_id))]),
    admin().from("sis_lesson_sections").select("lesson_id")
      .in("lesson_id", data.map((l: any) => l.id)),
  ]);
  const labels = new Map<string, string>((blocks ?? []).map((b: any) => [b.id, b.label]));
  const counts = new Map<string, number>();
  for (const s of sections ?? []) counts.set(s.lesson_id, (counts.get(s.lesson_id) ?? 0) + 1);

  return data.map((l: any) => ({
    id: l.id, title: l.title, summary: l.summary, position: l.position,
    estimatedMinutes: l.estimated_minutes, published: l.published,
    blockId: l.schedule_block_id,
    blockLabel: labels.get(l.schedule_block_id) ?? "Unscheduled",
    sectionCount: counts.get(l.id) ?? 0,
  }));
}

export interface LessonFull {
  id: string;
  title: string;
  summary: string | null;
  estimatedMinutes: number;
  published: boolean;
  programId: string;
  blockId: string;
  block: ScheduleBlock | null;
  sections: {
    id: string; position: number; title: string; body: string;
    question: string | null; options: string[] | null; answerIndex: number | null;
  }[];
}

export async function lessonById(lessonId: string): Promise<LessonFull | null> {
  const { data: l } = await admin()
    .from("sis_lessons")
    .select("id, title, summary, estimated_minutes, published, program_id, schedule_block_id")
    .eq("id", lessonId).maybeSingle();
  if (!l) return null;

  const [{ data: sections }, { data: b }] = await Promise.all([
    admin().from("sis_lesson_sections")
      .select("id, position, title, body, question, options, answer_index")
      .eq("lesson_id", lessonId).order("position"),
    admin().from("sis_schedule_blocks")
      .select("id, label, weekday, starts_minute, ends_minute, kind, modality, segment, instructor_id, effective_from, effective_to")
      .eq("id", l.schedule_block_id).maybeSingle(),
  ]);

  return {
    id: l.id, title: l.title, summary: l.summary,
    estimatedMinutes: l.estimated_minutes, published: l.published,
    programId: l.program_id, blockId: l.schedule_block_id,
    block: b
      ? {
          id: b.id, label: b.label, weekday: b.weekday,
          startsMinute: b.starts_minute, endsMinute: b.ends_minute,
          kind: b.kind, modality: b.modality, segment: b.segment,
          instructorId: b.instructor_id ?? null,
          // Carried through because blockAt() checks them: a lesson attached to
          // a retired block must stop opening sessions, not keep running on a
          // timetable the school has already replaced.
          effectiveFrom: b.effective_from,
          effectiveTo: b.effective_to ?? null,
        }
      : null,
    sections: (sections ?? []).map((s: any) => ({
      id: s.id, position: s.position, title: s.title, body: s.body,
      question: s.question ?? null,
      options: Array.isArray(s.options) ? s.options : null,
      answerIndex: s.answer_index ?? null,
    })),
  };
}

export function sectionsForEngine(l: LessonFull): LessonSection[] {
  return l.sections.map((s) => ({
    id: s.id, position: s.position, title: s.title, hasQuestion: s.question !== null,
  }));
}

// ---------------------------------------------------------------------------
// Progress
// ---------------------------------------------------------------------------

export async function progressFor(
  studentId: string,
  sectionIds: string[]
): Promise<SectionProgress[]> {
  if (!sectionIds.length) return [];
  const { data } = await admin()
    .from("sis_lesson_progress")
    .select("section_id, punch_id, completed_at, answer_index, correct")
    .eq("student_id", studentId)
    .in("section_id", sectionIds);
  return (data ?? []).map((r: any) => ({
    sectionId: r.section_id, punchId: r.punch_id ?? null,
    completedAt: r.completed_at, answerIndex: r.answer_index ?? null,
    correct: r.correct ?? null,
  }));
}

/**
 * Record a completed section.
 *
 * THE ANSWER IS MARKED ON THE SERVER. The correct index never leaves the
 * database for an unanswered question, and `correct` is computed here rather
 * than accepted from the client — a self-scored comprehension check is not a
 * measurement, it is a form field.
 *
 * FIRST COMPLETION STANDS. The unique constraint refuses a second row, and that
 * refusal is reported as success: the student's intent (this section is done)
 * is already true, and rewriting it would let a wrong answer be retried into a
 * right one after the fact.
 */
export async function completeSection(args: {
  studentId: string;
  sectionId: string;
  punchId: string | null;
  answerIndex: number | null;
}): Promise<{ ok: boolean; correct: boolean | null; error?: string }> {
  const { data: section } = await admin()
    .from("sis_lesson_sections").select("id, answer_index, question")
    .eq("id", args.sectionId).maybeSingle();
  if (!section) return { ok: false, correct: null, error: "No such section." };

  const correct =
    section.question === null || args.answerIndex === null
      ? null
      : args.answerIndex === section.answer_index;

  const { error } = await admin().from("sis_lesson_progress").insert({
    student_id: args.studentId, section_id: args.sectionId,
    punch_id: args.punchId, answer_index: args.answerIndex, correct,
  });

  if (error && /duplicate key|unique/i.test(error.message)) {
    const { data } = await admin()
      .from("sis_lesson_progress").select("correct")
      .eq("student_id", args.studentId).eq("section_id", args.sectionId).maybeSingle();
    return { ok: true, correct: data?.correct ?? null };
  }
  if (error) return { ok: false, correct: null, error: error.message };
  return { ok: true, correct };
}

// ---------------------------------------------------------------------------
// Sessions, opened by a lesson and only by a lesson
// ---------------------------------------------------------------------------

/**
 * Start a distance session for a lesson.
 *
 * RUNS THE SAME canClockIn() THE KIOSK DOES. The distance ceilings, the 184
 * hour monthly cap and the one-open-punch rule are not re-implemented here;
 * a second copy of that logic is a second set of answers, and the one that
 * drifts is always the copy.
 *
 * REFUSES OUTSIDE THE SCHEDULED WINDOW. Self-paced means the student chooses
 * what to study and how fast, not that the hours may be claimed at any hour of
 * any day — the block is what tells the engine this is core theory taken at a
 * distance, and outside it there is no block to attribute the hour to.
 */
export async function startLessonSession(args: {
  student: StudentIdentity;
  lesson: LessonFull;
  punches: Punch[];
  program: Parameters<typeof canClockIn>[0]["program"];
  now: Date;
  timeZone: string;
}): Promise<{ ok: boolean; punchId?: string; error?: string }> {
  const { lesson, now, timeZone } = args;
  if (!lesson.published) return { ok: false, error: "That lesson is not open yet." };
  if (!lesson.block) return { ok: false, error: "That lesson has no class time attached." };

  const scheduled = blockAt([lesson.block], now, timeZone);
  if (!scheduled || scheduled.id !== lesson.block.id) {
    return { ok: false, error: "outside_window" };
  }

  const decision = canClockIn({
    request: { kind: lesson.block.kind, modality: lesson.block.modality, segment: lesson.block.segment },
    punches: args.punches,
    program: args.program,
    studentStatus: args.student.status,
    now,
    timeZone,
  });
  if (!decision.allowed) return { ok: false, error: decision.message ?? "Can't start right now." };

  const { data, error } = await admin().from("sis_punches").insert({
    student_id: args.student.id,
    punched_in_at: now.toISOString(),
    kind: lesson.block.kind, modality: lesson.block.modality, segment: lesson.block.segment,
    instructor_id: lesson.block.instructorId,
    schedule_block_id: lesson.block.id,
    source: "lesson",
  }).select("id").single();

  if (error && /duplicate key|unique/i.test(error.message)) {
    return { ok: false, error: "You're already in a session. Finish that one first." };
  }
  return error ? { ok: false, error: error.message } : { ok: true, punchId: data.id };
}

export async function openSessionFor(studentId: string): Promise<{
  id: string; punchedInAt: string; scheduleBlockId: string | null;
} | null> {
  const { data } = await admin()
    .from("sis_punches")
    .select("id, punched_in_at, schedule_block_id")
    .eq("student_id", studentId)
    .is("punched_out_at", null).is("voided_at", null)
    .maybeSingle();
  return data
    ? { id: data.id, punchedInAt: data.punched_in_at, scheduleBlockId: data.schedule_block_id ?? null }
    : null;
}

/** Close a session. Scoped by student so one student cannot close another's. */
export async function endLessonSession(args: {
  studentId: string; punchId: string; at: Date;
}): Promise<{ ok: boolean; error?: string }> {
  const { data, error } = await admin()
    .from("sis_punches")
    .update({ punched_out_at: args.at.toISOString() })
    .eq("id", args.punchId).eq("student_id", args.studentId)
    .is("punched_out_at", null)
    .select("id");
  if (error) return { ok: false, error: error.message };
  return { ok: Boolean(data?.length) };
}

/**
 * Record that somebody was there for this minute.
 *
 * TRUNCATED TO THE MINUTE SERVER-SIDE, so the primary key does the deduping.
 * A client that sends a hundred heartbeats in one minute writes one row; a
 * client that sends a timestamp of its own choosing cannot claim a minute it is
 * not currently living in, because the value here comes from the server clock.
 */
export async function recordActivityMinute(args: {
  studentId: string; punchId: string; now: Date;
}): Promise<{ ok: boolean }> {
  const owned = await admin()
    .from("sis_punches").select("id")
    .eq("id", args.punchId).eq("student_id", args.studentId)
    .is("punched_out_at", null).is("voided_at", null)
    .maybeSingle();
  if (!owned.data) return { ok: false };

  const minute = new Date(args.now);
  minute.setUTCSeconds(0, 0);

  const { error } = await admin()
    .from("sis_activity_minutes")
    .insert({ punch_id: args.punchId, minute_at: minute.toISOString() });
  // A duplicate is the normal case, not a failure — it means the heartbeat
  // fired twice inside one minute, which is what a 20-second interval does.
  if (error && !/duplicate key|unique/i.test(error.message)) return { ok: false };
  return { ok: true };
}

export async function activityMinutesFor(punchIds: string[]): Promise<Record<string, string[]>> {
  if (!punchIds.length) return {};
  const out: Record<string, string[]> = {};
  const { data } = await admin()
    .from("sis_activity_minutes").select("punch_id, minute_at").in("punch_id", punchIds);
  for (const r of data ?? []) (out[r.punch_id] ??= []).push(r.minute_at);
  return out;
}

/** Progress rows tied to a set of punches — the evidence behind a signature. */
export async function progressForPunches(punchIds: string[]): Promise<SectionProgress[]> {
  if (!punchIds.length) return [];
  const { data } = await admin()
    .from("sis_lesson_progress")
    .select("section_id, punch_id, completed_at, answer_index, correct")
    .in("punch_id", punchIds);
  return (data ?? []).map((r: any) => ({
    sectionId: r.section_id, punchId: r.punch_id ?? null,
    completedAt: r.completed_at, answerIndex: r.answer_index ?? null,
    correct: r.correct ?? null,
  }));
}

/** Section ids per lesson, for computing standing across a list of lessons. */
export async function sectionIndexFor(
  lessonIds: string[]
): Promise<{ all: LessonSection[]; byLesson: Map<string, LessonSection[]> }> {
  const byLesson = new Map<string, LessonSection[]>();
  if (!lessonIds.length) return { all: [], byLesson };

  const { data } = await admin()
    .from("sis_lesson_sections")
    .select("id, lesson_id, position, title, question")
    .in("lesson_id", lessonIds)
    .order("position");

  const all: LessonSection[] = [];
  for (const r of (data ?? []) as any[]) {
    const s: LessonSection = {
      id: r.id, position: r.position, title: r.title, hasQuestion: r.question !== null,
    };
    all.push(s);
    const list = byLesson.get(r.lesson_id);
    if (list) list.push(s);
    else byLesson.set(r.lesson_id, [s]);
  }
  return { all, byLesson };
}

// ---------------------------------------------------------------------------
// Authoring (staff console)
// ---------------------------------------------------------------------------

/**
 * Distance-capable blocks, which are the only ones a lesson may attach to.
 *
 * A LESSON ON A CAMPUS BLOCK WOULD BE A TRAP. It would render, a student could
 * work through it from home, and every hour it produced would be recorded as
 * campus attendance — a false statement in the one field that says where the
 * hour happened. Filtering here means the mistake cannot be made in the form.
 */
export async function distanceBlocksFor(programId: string): Promise<
  { id: string; label: string; weekday: number; startsMinute: number; endsMinute: number }[]
> {
  const { data } = await admin()
    .from("sis_schedule_blocks")
    .select("id, label, weekday, starts_minute, ends_minute")
    .eq("program_id", programId)
    .eq("modality", "distance")
    .order("weekday").order("starts_minute");
  return (data ?? []).map((b: any) => ({
    id: b.id, label: b.label, weekday: b.weekday,
    startsMinute: b.starts_minute, endsMinute: b.ends_minute,
  }));
}

export async function createLesson(args: {
  schoolId: string; programId: string; scheduleBlockId: string;
  title: string; summary?: string | null; estimatedMinutes: number;
}): Promise<{ ok: boolean; id?: string; error?: string }> {
  if (!args.title.trim()) return { ok: false, error: "Give the lesson a title." };

  const { data: last } = await admin()
    .from("sis_lessons").select("position")
    .eq("program_id", args.programId).order("position", { ascending: false }).limit(1);
  const position = ((last?.[0]?.position as number) ?? -1) + 1;

  const { data, error } = await admin().from("sis_lessons").insert({
    school_id: args.schoolId, program_id: args.programId,
    schedule_block_id: args.scheduleBlockId,
    title: args.title.trim(), summary: args.summary?.trim() || null,
    estimated_minutes: Math.max(1, Math.round(args.estimatedMinutes)),
    position,
  }).select("id").single();

  return error ? { ok: false, error: error.message } : { ok: true, id: data.id };
}

export async function addSection(args: {
  lessonId: string; title: string; body: string;
  question?: string | null; options?: string[] | null; answerIndex?: number | null;
}): Promise<{ ok: boolean; error?: string }> {
  if (!args.title.trim()) return { ok: false, error: "Give the section a title." };

  // The database refuses half a question; catching it here produces a sentence
  // rather than a constraint violation the author has to decode.
  const hasQ = Boolean(args.question?.trim());
  const opts = (args.options ?? []).map((o) => o.trim()).filter(Boolean);
  if (hasQ) {
    if (opts.length < 2) return { ok: false, error: "A question needs at least two answers." };
    if (args.answerIndex === null || args.answerIndex === undefined || args.answerIndex >= opts.length) {
      return { ok: false, error: "Mark which answer is the right one." };
    }
  }

  const { data: last } = await admin()
    .from("sis_lesson_sections").select("position")
    .eq("lesson_id", args.lessonId).order("position", { ascending: false }).limit(1);
  const position = ((last?.[0]?.position as number) ?? -1) + 1;

  const { error } = await admin().from("sis_lesson_sections").insert({
    lesson_id: args.lessonId, position,
    title: args.title.trim(), body: args.body,
    question: hasQ ? args.question!.trim() : null,
    options: hasQ ? opts : null,
    answer_index: hasQ ? args.answerIndex : null,
  });
  return error ? { ok: false, error: error.message } : { ok: true };
}

export async function deleteSection(sectionId: string): Promise<{ ok: boolean; error?: string }> {
  /*
   * REFUSES ONCE ANY STUDENT HAS COMPLETED IT. The progress row is evidence
   * behind an hour that may already be signed for, and the cascade on this
   * foreign key would take it with the section — removing the thing an
   * instructor's signature was given for, after the fact.
   */
  const { count } = await admin()
    .from("sis_lesson_progress")
    .select("*", { count: "exact", head: true })
    .eq("section_id", sectionId);
  if ((count ?? 0) > 0) {
    return { ok: false, error: "Students have already worked through this section, so it can't be removed. Edit the text instead." };
  }
  const { error } = await admin().from("sis_lesson_sections").delete().eq("id", sectionId);
  return error ? { ok: false, error: error.message } : { ok: true };
}

export async function setLessonPublished(
  lessonId: string, published: boolean
): Promise<{ ok: boolean; error?: string }> {
  if (published) {
    // Publishing an empty lesson puts a door in front of an empty room, and
    // any session opened through it earns hours with nothing behind them.
    const { count } = await admin()
      .from("sis_lesson_sections").select("*", { count: "exact", head: true })
      .eq("lesson_id", lessonId);
    if ((count ?? 0) === 0) {
      return { ok: false, error: "Add at least one section before publishing." };
    }
  }
  const { error } = await admin()
    .from("sis_lessons")
    .update({ published, updated_at: new Date().toISOString() })
    .eq("id", lessonId);
  return error ? { ok: false, error: error.message } : { ok: true };
}
