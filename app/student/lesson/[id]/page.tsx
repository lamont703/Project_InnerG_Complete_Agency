import type { Metadata } from "next";
import { notFound, redirect } from "next/navigation";

import { Navbar } from "@/components/layout/navbar";
import { createServerClient } from "@/lib/supabase/server";
import { blockAt } from "@/lib/school/hours";
import {
  lessonById,
  openSessionFor,
  progressFor,
  studentForUser,
} from "@/lib/school/learning-store";
import { firstSchool } from "@/lib/school/store";
import { LessonClient, type ClientSection } from "./lesson-client";

/**
 * One lesson.
 *
 * THE CORRECT ANSWER NEVER REACHES THE BROWSER for a question the student has
 * not answered. answer_index is stripped here and marking happens on the
 * server, because a comprehension check whose answer is in the page source is
 * not a check — and this is the measurement an instructor signs against.
 *
 * An already-answered question DOES send back what the student chose and
 * whether it was right, because that is their own record and they are entitled
 * to see it.
 */
export const metadata: Metadata = {
  title: "Lesson",
  robots: { index: false, follow: false },
};

export const dynamic = "force-dynamic";

const DAYS = ["Sunday", "Monday", "Tuesday", "Wednesday", "Thursday", "Friday", "Saturday"];
const hhmm = (m: number) =>
  `${((Math.floor(m / 60) + 11) % 12) + 1}:${String(m % 60).padStart(2, "0")}${Math.floor(m / 60) < 12 ? "am" : "pm"}`;

export default async function LessonPage(props: { params: Promise<{ id: string }> }) {
  const { id } = await props.params;

  const supabase = await createServerClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) redirect(`/student`);

  const student = await studentForUser(user.id);
  if (!student) redirect("/student");

  const [lesson, school] = await Promise.all([lessonById(id), firstSchool()]);
  if (!lesson || !school) notFound();

  // Another program's lesson is a 404, not a 403 — there is no reason for a
  // student to learn which lessons exist outside their own program.
  if (lesson.programId !== student.programId) notFound();
  if (!lesson.published) notFound();

  const [progress, open] = await Promise.all([
    progressFor(student.id, lesson.sections.map((s) => s.id)),
    openSessionFor(student.id),
  ]);
  const byId = new Map(progress.map((p) => [p.sectionId, p]));

  const sections: ClientSection[] = lesson.sections.map((s) => {
    const p = byId.get(s.id) ?? null;
    return {
      id: s.id,
      title: s.title,
      body: s.body,
      question: s.question,
      options: s.options,
      doneAt: p?.completedAt ?? null,
      answeredIndex: p?.answerIndex ?? null,
      wasCorrect: p?.correct ?? null,
    };
  });

  const now = new Date();
  const live = lesson.block ? blockAt([lesson.block], now, school.timezone) : null;
  const windowLabel = lesson.block
    ? `${DAYS[lesson.block.weekday]}s, ${hhmm(lesson.block.startsMinute)} to ${hhmm(lesson.block.endsMinute)}`
    : "at a time your school has not set yet";

  return (
    <div className="light flex min-h-screen flex-col bg-slate-50 text-slate-900">
      <Navbar />
      <main className="mx-auto w-full max-w-2xl flex-1 px-4 pb-24 pt-24 sm:px-6">
        <header className="mb-6">
          <h1 className="text-3xl font-black tracking-tight text-slate-950">{lesson.title}</h1>
          {lesson.summary && (
            <p className="mt-2 text-sm leading-relaxed text-slate-600">{lesson.summary}</p>
          )}
        </header>

        <LessonClient
          lessonId={lesson.id}
          sections={sections}
          // Only a session opened for THIS lesson's block counts as being in
          // this lesson. A student clocked into a different class should not
          // see this page claiming their hours are counting here.
          openPunchId={open && open.scheduleBlockId === lesson.blockId ? open.id : null}
          windowOpen={Boolean(live)}
          windowLabel={windowLabel}
        />
      </main>
    </div>
  );
}
