import type { Metadata } from "next";
import { notFound } from "next/navigation";
import Link from "next/link";
import { ArrowLeft } from "lucide-react";

import { isAdmin } from "@/app/admin/ad-campaigns/auth";
import { Navbar } from "@/components/layout/navbar";
import { firstSchool, programsFor } from "@/lib/school/store";
import { distanceBlocksFor, lessonsForProgram } from "@/lib/school/learning-store";
import { LessonsClient, type LessonRow, type ProgramOption } from "./lessons-client";

/**
 * Lesson authoring.
 *
 * Gated twice, like the rest of the console: middleware lists this path and the
 * page re-checks, because that middleware fails open on an auth exception.
 */
export const metadata: Metadata = {
  title: "Lessons",
  robots: { index: false, follow: false },
};

export const dynamic = "force-dynamic";

const DAYS = ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"];
const hhmm = (m: number) =>
  `${((Math.floor(m / 60) + 11) % 12) + 1}:${String(m % 60).padStart(2, "0")}${Math.floor(m / 60) < 12 ? "am" : "pm"}`;

export default async function LessonsPage() {
  if (!(await isAdmin())) notFound();

  const school = await firstSchool();
  if (!school) notFound();

  const programs = await programsFor(school.id);

  const perProgram = await Promise.all(
    programs.map(async (p) => ({
      program: p,
      blocks: await distanceBlocksFor(p.id),
      lessons: await lessonsForProgram(p.id, { includeUnpublished: true }),
    }))
  );

  const rows: LessonRow[] = perProgram.flatMap(({ program, lessons }) =>
    lessons.map((l) => ({
      id: l.id, title: l.title, summary: l.summary, published: l.published,
      sectionCount: l.sectionCount, estimatedMinutes: l.estimatedMinutes,
      blockLabel: l.blockLabel, programName: program.name,
    }))
  );

  const options: ProgramOption[] = perProgram.map(({ program, blocks }) => ({
    id: program.id,
    name: program.name,
    blocks: blocks.map((b) => ({
      id: b.id, label: b.label,
      when: `${DAYS[b.weekday]} ${hhmm(b.startsMinute)}–${hhmm(b.endsMinute)}`,
    })),
  }));

  return (
    <div className="light flex min-h-screen flex-col bg-slate-50 text-slate-900">
      <Navbar />
      <main className="mx-auto w-full max-w-4xl px-4 pb-24 pt-24 sm:px-6">
        <Link
          href="/school/roster"
          className="inline-flex items-center gap-1.5 text-xs font-bold text-slate-500 hover:text-slate-800"
        >
          <ArrowLeft className="h-3.5 w-3.5" />
          Roster
        </Link>

        <h1 className="mt-3 text-3xl font-black tracking-tight text-slate-950">Lessons</h1>
        <p className="mt-3 max-w-2xl text-sm leading-relaxed text-slate-600">
          Self-paced coursework for the online blocks on your timetable. A lesson can only be
          attached to a distance block, so a student working through one always earns the hour type
          the timetable already says it is — you never pick it, and it can never be recorded as
          campus time.
        </p>

        <div className="mt-8">
          <LessonsClient rows={rows} programs={options} />
        </div>
      </main>
    </div>
  );
}
