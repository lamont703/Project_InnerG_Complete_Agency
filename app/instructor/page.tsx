import type { Metadata } from "next";
import Link from "next/link";
import { LogIn, ShieldCheck } from "lucide-react";

import { Navbar } from "@/components/layout/navbar";
import { createServerClient } from "@/lib/supabase/server";
import { participation } from "@/lib/school/learning";
import { firstSchool, pendingValidation } from "@/lib/school/store";
import {
  activityMinutesFor,
  blocksForInstructor,
  instructorForUser,
  progressForPunches,
} from "@/lib/school/learning-store";
import { ClaimInstructor, InstructorQueue, type QueueRow } from "./instructor-client";

/**
 * The instructor's own surface.
 *
 * DELIBERATELY NOT BEHIND THE INTERNAL TOOLS PASSWORD. An instructor is not an
 * administrator: handing them the console password so they can sign for their
 * own classes would give every instructor access to the roster, the ledger and
 * enrollment. Identity here comes from their own session, and it authorises
 * exactly one thing — signing for the classes they are down to teach.
 */
export const metadata: Metadata = {
  title: "Your classes",
  robots: { index: false, follow: false },
};

export const dynamic = "force-dynamic";

const clock = (iso: string) =>
  new Date(iso).toLocaleTimeString("en-US", { hour: "numeric", minute: "2-digit" });

export default async function InstructorPage(props: {
  searchParams: Promise<{ claim?: string }>;
}) {
  const { claim } = await props.searchParams;
  const supabase = await createServerClient();
  const { data: { user } } = await supabase.auth.getUser();

  if (!user) {
    const back = claim ? `/instructor?claim=${encodeURIComponent(claim)}` : "/instructor";
    return (
      <div className="light flex min-h-screen flex-col bg-slate-50 text-slate-900">
        <Navbar />
        <main className="mx-auto w-full max-w-lg px-4 pb-20 pt-24">
          <div className="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm sm:p-8">
            <ShieldCheck className="h-8 w-8 text-blue-600" />
            <h1 className="mt-4 text-2xl font-black tracking-tight text-slate-950">
              Instructor sign-in
            </h1>
            <p className="mt-3 text-sm leading-relaxed text-slate-600">
              Sign in to confirm the online hours your students earned. Your school sends you a link
              the first time; after that this page is all you need.
            </p>
            <div className="mt-6 space-y-3">
              <Link
                href={`/login?redirect=${encodeURIComponent(back)}`}
                className="flex w-full items-center justify-center gap-2 rounded-xl bg-blue-600 px-5 py-3 text-sm font-black text-white hover:bg-blue-700"
              >
                <LogIn className="h-4 w-4" />
                Sign in
              </Link>
              <Link
                href={`/membership/professionals${claim ? `?claim=${encodeURIComponent(claim)}&src=school-instructor` : "?src=school-instructor"}`}
                className="flex w-full items-center justify-center gap-2 rounded-xl border-2 border-slate-200 px-5 py-3 text-sm font-black text-slate-700 hover:bg-slate-50"
              >
                I don&apos;t have an account yet
              </Link>
            </div>
          </div>
        </main>
      </div>
    );
  }

  const me = await instructorForUser(user.id);

  if (!me) {
    return (
      <div className="light flex min-h-screen flex-col bg-slate-50 text-slate-900">
        <Navbar />
        <main className="mx-auto w-full max-w-lg px-4 pb-20 pt-24">
          <ClaimInstructor presetToken={claim ?? ""} />
        </main>
      </div>
    );
  }

  const school = await firstSchool();
  const myBlocks = await blocksForInstructor(me.id);

  const queue =
    school && myBlocks.length
      ? await pendingValidation(school.id, 500, { blockIds: myBlocks })
      : [];

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
    blockLabel: q.blockLabel,
    ageDays: Math.max(0, Math.floor((today - new Date(q.punchedOutAt).getTime()) / 86_400_000)),
    evidence: participation({
      clockedMinutes: q.minutes,
      minuteStamps: minutes[q.punchId]?.minutes ?? [],
      activitySections: minutes[q.punchId]?.sections ?? [],
      // Empty on purpose: a session has no total. See the note in
      // app/school/validation/page.tsx — sectionsTotal must not be rendered.
      sections: [],
      progress,
      punchId: q.punchId,
    }),
  }));

  return (
    <div className="light flex min-h-screen flex-col bg-slate-50 text-slate-900">
      <Navbar />
      <main className="mx-auto w-full max-w-3xl flex-1 px-4 pb-32 pt-24 sm:px-6">
        <h1 className="text-3xl font-black tracking-tight text-slate-950">Your classes</h1>
        <p className="mt-3 max-w-2xl text-sm leading-relaxed text-slate-600">
          Online sessions your students have finished, waiting for you to confirm they took part.
          Campus hours are not here — you were in the room for those. Each one shows how many of its
          minutes had somebody actually working and what coursework came out of them.
        </p>
        <p className="mt-2 max-w-2xl text-xs leading-relaxed text-slate-500">
          The supported and thin labels are your school&apos;s own thresholds, not a regulator&apos;s.
          They sort what deserves a closer look. A thin session is a reason to ask the student, not a
          reason to refuse it.
        </p>

        <div className="mt-8">
          <InstructorQueue
            name={me.name}
            rows={rows}
            teachesNothing={myBlocks.length === 0}
          />
        </div>
      </main>
    </div>
  );
}
