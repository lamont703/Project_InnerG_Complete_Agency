import type { Metadata } from "next";
import { notFound } from "next/navigation";
import Link from "next/link";
import { ArrowLeft } from "lucide-react";

import { isAdmin } from "@/app/admin/ad-campaigns/auth";
import { Navbar } from "@/components/layout/navbar";
import { firstSchool, instructorsFor, pendingValidation } from "@/lib/school/store";
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

        <div className="mt-8">
          <ValidationClient rows={rows} instructors={instructors} />
        </div>
      </main>
    </div>
  );
}
