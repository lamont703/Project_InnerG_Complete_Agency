import type { Metadata } from "next";
import { notFound } from "next/navigation";
import Link from "next/link";
import { ArrowLeft, CalendarClock, Clock } from "lucide-react";

import { isAdmin } from "@/app/admin/ad-campaigns/auth";
import { Navbar } from "@/components/layout/navbar";
import { lessonById } from "@/lib/school/learning-store";
import { EditorClient, type EditorSection } from "./editor-client";

export const metadata: Metadata = {
  title: "Edit lesson",
  robots: { index: false, follow: false },
};

export const dynamic = "force-dynamic";

const DAYS = ["Sunday", "Monday", "Tuesday", "Wednesday", "Thursday", "Friday", "Saturday"];
const hhmm = (m: number) =>
  `${((Math.floor(m / 60) + 11) % 12) + 1}:${String(m % 60).padStart(2, "0")}${Math.floor(m / 60) < 12 ? "am" : "pm"}`;

export default async function LessonEditorPage(props: { params: Promise<{ id: string }> }) {
  if (!(await isAdmin())) notFound();

  const { id } = await props.params;
  const lesson = await lessonById(id);
  if (!lesson) notFound();

  const sections: EditorSection[] = lesson.sections.map((s) => ({
    id: s.id, position: s.position, title: s.title, body: s.body,
    question: s.question, options: s.options, answerIndex: s.answerIndex,
  }));

  return (
    <div className="light flex min-h-screen flex-col bg-slate-50 text-slate-900">
      <Navbar />
      <main className="mx-auto w-full max-w-3xl px-4 pb-24 pt-24 sm:px-6">
        <Link
          href="/school/lessons"
          className="inline-flex items-center gap-1.5 text-xs font-bold text-slate-500 hover:text-slate-800"
        >
          <ArrowLeft className="h-3.5 w-3.5" />
          Lessons
        </Link>

        <h1 className="mt-3 text-3xl font-black tracking-tight text-slate-950">{lesson.title}</h1>
        {lesson.summary && <p className="mt-2 text-sm text-slate-600">{lesson.summary}</p>}
        <p className="mt-2 flex flex-wrap items-center gap-x-2 text-xs text-slate-500">
          <CalendarClock className="h-3 w-3" />
          {lesson.block
            ? `${DAYS[lesson.block.weekday]}s ${hhmm(lesson.block.startsMinute)}–${hhmm(lesson.block.endsMinute)} · ${lesson.block.segment} ${lesson.block.kind}, online`
            : "No class time attached"}
          <span>·</span>
          <Clock className="h-3 w-3" />
          about {lesson.estimatedMinutes} min
        </p>

        <div className="mt-8">
          <EditorClient lessonId={lesson.id} published={lesson.published} sections={sections} />
        </div>
      </main>
    </div>
  );
}
