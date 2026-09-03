import type { Metadata } from "next";
import { notFound } from "next/navigation";
import Link from "next/link";
import { ArrowLeft } from "lucide-react";

import { isAdmin } from "@/app/admin/ad-campaigns/auth";
import { Navbar } from "@/components/layout/navbar";
import { firstSchool, instructorsFor, pendingValidation } from "@/lib/school/store";
import { activityMinutesFor, progressForPunches } from "@/lib/school/learning-store";
import { participation } from "@/lib/school/learning";
import { ValidationClient, type QueueRow } from "./validation-client";

/**
 * Instructor sign-off for distance hours.
 *
 * WHAT RULE THIS SERVES. NACCAS Policy VI.02 element 1 requires measurable,
 * instructor-validated participation for distance education. The hours engine
 * has always counted unsigned distance minutes separately and the ledger has
 * always flagged them; until now nothing could clear the flag, so it was a
 * warning about a gap with no way to close it.
 *
 * WHAT IT DOES NOT CLAIM. Signing here does not make an hour compliant on its
 * own — VI.02 has five elements, and the other four (assessment on campus,
 * campus attendance every 10 business days, distance hours identified on the
 * transcript, a signed reciprocity disclaimer) are separate obligations this
 * page does not touch. It closes one of the five.
 *
 * GATED TWICE for the same reason the roster is: middleware.ts lists this path
 * among the internal tools, and that gate FAILS OPEN on an auth exception.
 */
export const metadata: Metadata = {
  title: "Distance hour sign-off",
  robots: { index: false, follow: false },
};

export const dynamic = "force-dynamic";

const clock = (iso: string) =>
  new Date(iso).toLocaleTimeString("en-US", { hour: "numeric", minute: "2-digit" });

export default async function ValidationPage() {
  if (!(await isAdmin())) notFound();

  const school = await firstSchool();
  if (!school) notFound();

  const [queue, instructors] = await Promise.all([
    pendingValidation(school.id),
    instructorsFor(school.id),
  ]);

  /*
   * THE EVIDENCE BEHIND EACH SESSION, fetched in two queries for the whole
   * queue rather than per row. Before this existed an instructor was asked to
   * sign for "a timer ran for three hours", which is not something a person can
   * responsibly put their name to. Now they see how many of those minutes had
   * somebody at the keyboard and what coursework came out of it.
   */
  const punchIds = queue.map((q) => q.punchId);
  const [minutes, progress] = await Promise.all([
    activityMinutesFor(punchIds),
    progressForPunches(punchIds),
  ]);

  const today = Date.now();
  const rows: QueueRow[] = queue.map((q) => ({
    punchId: q.punchId,
    studentId: q.studentId,
    studentName: q.studentName,
    date: q.date,
    window: `${clock(q.punchedInAt)} – ${clock(q.punchedOutAt)}`,
    minutes: q.minutes,
    segment: q.segment,
    blockLabel: q.blockLabel,
    ageDays: Math.max(0, Math.floor((today - new Date(q.punchedOutAt).getTime()) / 86_400_000)),
    evidence: participation({
      clockedMinutes: q.minutes,
      minuteStamps: minutes[q.punchId]?.minutes ?? [],
      activitySections: minutes[q.punchId]?.sections ?? [],
      /*
       * EMPTY ON PURPOSE, and it means `sectionsTotal` comes back 0 — so this
       * view must never render it as a denominator. A session has no total:
       * "4 of 12" would be the lesson's total, and a student can spread one
       * lesson over three evenings or cover three lessons in one. The
       * meaningful figure per session is how much was done IN it, which is
       * `sectionsCompleted`, and that is the only one shown.
       */
      sections: [],
      progress,
      punchId: q.punchId,
    }),
  }));

  const totalHours = rows.reduce((n, r) => n + r.minutes, 0) / 60;

  return (
    <div className="light flex min-h-screen flex-col bg-slate-50 text-slate-900">
      <Navbar />
      <main className="mx-auto w-full max-w-4xl px-4 pb-32 pt-24">
        <Link
          href="/school/roster"
          className="inline-flex items-center gap-1.5 text-xs font-bold text-slate-500 hover:text-slate-800"
        >
          <ArrowLeft className="h-3.5 w-3.5" />
          Roster
        </Link>

        <h1 className="mt-3 text-3xl font-black tracking-tight text-slate-950">
          Distance hour sign-off
        </h1>
        <p className="mt-3 max-w-2xl text-sm leading-relaxed text-slate-600">
          {rows.length === 0
            ? "Online sessions wait here for an instructor to confirm the student took part."
            : `${totalHours.toFixed(1)} online hours across ${rows.length} ${rows.length === 1 ? "session" : "sessions"} are waiting for an instructor to confirm the student took part.`}{" "}
          Campus hours are not listed — an instructor was in the room for those. This is the one
          NACCAS asks a school to be able to evidence separately.
        </p>
        <p className="mt-3 max-w-2xl text-xs leading-relaxed text-slate-500">
          Each session shows how many of its minutes had somebody actually working and what
          coursework came out of them. <strong>The supported / thin labels are this school&apos;s
          own thresholds, not a regulator&apos;s</strong> — neither NACCAS nor TDLR sets a
          percentage. They sort what deserves a closer look; they decide nothing, and a thin
          session is a reason to ask rather than a reason to refuse.
        </p>
        <p className="mt-3 max-w-2xl rounded-xl border border-sky-200 bg-sky-50 px-4 py-3 text-xs leading-relaxed text-sky-900">
          Signing here is <strong>asserting on an instructor&apos;s behalf</strong>, and is recorded
          as such — unless you are yourself the instructor you pick. An instructor with their own
          account signs at <Link href="/instructor" className="font-black underline underline-offset-2">/instructor</Link>,
          which produces the stronger record and needs no console password. Set them up on{" "}
          <Link href="/school/instructors" className="font-black underline underline-offset-2">Instructors</Link>.
        </p>

        <div className="mt-8">
          <ValidationClient rows={rows} instructors={instructors} />
        </div>
      </main>
    </div>
  );
}
