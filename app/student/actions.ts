"use server";

import { revalidatePath } from "next/cache";
import { createServerClient } from "@/lib/supabase/server";
import { closeStaleSessions, firstSchool, programById, punchesFor, scheduleForSchool } from "@/lib/school/store";
import { sessionMustEndAt } from "@/lib/school/hours";
import {
  claimStudent,
  completeSection,
  endLessonSession,
  lessonById,
  openSessionFor,
  startLessonSession,
  studentForUser,
} from "@/lib/school/learning-store";

/**
 * Every action here establishes WHO IS ASKING from the session, then uses only
 * the student id that yielded.
 *
 * A student id in a request body is not an identity. It is a request to write
 * to somebody else's hour record, and the whole portal is one missing check
 * away from granting it — which is why the check lives in one helper that every
 * action calls first, rather than in each action where one can be forgotten.
 */
async function me() {
  const supabase = await createServerClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return null;
  const student = await studentForUser(user.id);
  return student ? { user, student } : null;
}

export async function claimStudentAction(token: string): Promise<{ ok: boolean; error?: string }> {
  const supabase = await createServerClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return { ok: false, error: "Sign in first." };
  if (!token?.trim()) return { ok: false, error: "Paste the link your school sent you." };

  const res = await claimStudent({ token: token.trim(), userId: user.id });
  if (res.ok) revalidatePath("/student");
  return { ok: res.ok, error: res.error };
}

export async function startSessionAction(
  lessonId: string
): Promise<{ ok: boolean; punchId?: string; error?: string }> {
  const ctx = await me();
  if (!ctx) return { ok: false, error: "Sign in first." };

  const [lesson, school] = await Promise.all([lessonById(lessonId), firstSchool()]);
  if (!lesson || !school) return { ok: false, error: "That lesson isn't available." };
  // A lesson belonging to another program is not this student's to open, and
  // saying so plainly beats a confusing refusal later from the hours engine.
  if (lesson.programId !== ctx.student.programId) {
    return { ok: false, error: "That lesson isn't part of your program." };
  }

  /*
   * SWEEP FIRST, same as the kiosk. A session abandoned last Monday would
   * otherwise still be open, and canClockIn refuses while one is — so the
   * student would be told to "finish that one first" about a session they have
   * no memory of, and finishing it now would credit them a week of hours.
   */
  await closeStaleSessions(school.id, school.timezone, new Date(), {
    studentId: ctx.student.id,
  });

  const [punches, program] = await Promise.all([
    punchesFor(ctx.student.id),
    programById(ctx.student.programId),
  ]);
  if (!program) return { ok: false, error: "Your program record is missing. Tell the school." };

  const res = await startLessonSession({
    student: ctx.student, lesson, punches, program,
    now: new Date(), timeZone: school.timezone,
  });
  if (res.ok) revalidatePath(`/student/lesson/${lessonId}`);
  return res;
}

export async function endSessionAction(): Promise<{ ok: boolean; error?: string }> {
  const ctx = await me();
  if (!ctx) return { ok: false, error: "Sign in first." };

  const open = await openSessionFor(ctx.student.id);
  if (!open) return { ok: true }; // Already closed. The student's intent is satisfied.

  /*
   * CAPPED AT THE END OF THE CLASS. Clicking finish at 10:30pm on a class that
   * ran to 9 must not credit an extra ninety minutes — the same rule the sweep
   * applies, applied here so a student who does the right thing and clicks the
   * button is not credited more than one who forgets.
   */
  const now = new Date();
  const school = await firstSchool();
  const blocks = school ? await scheduleForSchool(school.id) : [];
  const block = open.scheduleBlockId
    ? blocks.find((b) => b.id === open.scheduleBlockId) ?? null
    : null;
  const mustEnd = school ? sessionMustEndAt(new Date(open.punchedInAt), block, school.timezone) : null;
  const at = mustEnd && now.getTime() > mustEnd.getTime() ? mustEnd : now;

  const res = await endLessonSession({
    studentId: ctx.student.id, punchId: open.id, at,
  });
  revalidatePath("/student");
  return res;
}

export async function completeSectionAction(args: {
  sectionId: string;
  answerIndex: number | null;
}): Promise<{ ok: boolean; correct?: boolean | null; error?: string }> {
  const ctx = await me();
  if (!ctx) return { ok: false, error: "Sign in first." };

  /*
   * THE PUNCH IS LOOKED UP, NOT SUPPLIED. If it came from the client a student
   * could attribute tonight's reading to a session three weeks ago, which is
   * precisely the link an instructor is relying on when they sign.
   *
   * Progress with no open session still records — a student reading outside the
   * class window is doing the right thing and should not be discouraged — but
   * it carries a null punch, so it counts toward finishing the lesson and
   * toward no hour at all.
   */
  const open = await openSessionFor(ctx.student.id);

  const res = await completeSection({
    studentId: ctx.student.id,
    sectionId: args.sectionId,
    punchId: open?.id ?? null,
    answerIndex: args.answerIndex,
  });
  return { ok: res.ok, correct: res.correct, error: res.error };
}
