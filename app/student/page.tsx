import type { Metadata } from "next";
import Link from "next/link";
import {
  BookOpen, CalendarClock, CheckCircle2, Clock, GraduationCap, LogIn, Monitor, UserPlus,
} from "lucide-react";

import { Navbar } from "@/components/layout/navbar";
import { createServerClient } from "@/lib/supabase/server";
import { blockAt, distanceCaps, ledger, localWallClock, toHours } from "@/lib/school/hours";
import { lessonStanding } from "@/lib/school/learning";
import {
  lessonsForProgram,
  openSessionFor,
  progressFor,
  sectionIndexFor,
  studentForUser,
} from "@/lib/school/learning-store";
import { firstSchool, programById, punchesFor, scheduleFor } from "@/lib/school/store";
import { ClaimPanel } from "./claim-panel";
import { SessionBanner } from "./session-banner";

/**
 * The student's own view of their record.
 *
 * SHOWS THEM THE SAME NUMBERS THE SCHOOL SEES, computed by the same engine.
 * Two figures that disagree — one on a transcript and one on a student's phone
 * — is how a school ends up arguing with a student about hours a week before
 * an exam application.
 *
 * NEVER STATIC. Per-student state, noindex, and excluded from the public route
 * map for the same reason /account is.
 */
export const metadata: Metadata = {
  title: "Your hours and lessons",
  robots: { index: false, follow: false },
};

export const dynamic = "force-dynamic";

const DAYS = ["Sunday", "Monday", "Tuesday", "Wednesday", "Thursday", "Friday", "Saturday"];
const hhmm = (m: number) =>
  `${((Math.floor(m / 60) + 11) % 12) + 1}:${String(m % 60).padStart(2, "0")}${Math.floor(m / 60) < 12 ? "am" : "pm"}`;

function Meter({ used, cap, label, hint }: { used: number; cap: number; label: string; hint: string }) {
  const pct = cap > 0 ? Math.min(100, (used / cap) * 100) : 0;
  const left = Math.max(0, cap - used);
  return (
    <div>
      <div className="flex items-baseline justify-between">
        <span className="text-xs font-black uppercase tracking-wide text-slate-500">{label}</span>
        <span className="text-xs font-bold tabular-nums text-slate-600">
          {used.toFixed(1)} / {cap}
        </span>
      </div>
      <div className="mt-1.5 h-2 overflow-hidden rounded-full bg-slate-100">
        <div
          className={`h-full rounded-full ${left <= 0 ? "bg-rose-500" : left < 40 ? "bg-amber-500" : "bg-sky-500"}`}
          style={{ width: `${pct}%` }}
        />
      </div>
      <p className="mt-1.5 text-[11px] leading-relaxed text-slate-500">
        {left <= 0 ? "No online hours left in this part of your program. " : `${left.toFixed(1)} online hours left. `}
        {hint}
      </p>
    </div>
  );
}

export default async function StudentPage(props: {
  searchParams: Promise<{ claim?: string; claimed?: string }>;
}) {
  const { claim, claimed } = await props.searchParams;
  const supabase = await createServerClient();
  const { data: { user } } = await supabase.auth.getUser();

  /*
   * SIGNED OUT WITH A CLAIM LINK IS THE COMMON CASE — a student taps a link in
   * a text on a phone they have never signed in on. Both routes out carry the
   * token, so it survives whichever one they need. Redirecting to a signup page
   * and dropping the token is the exact bug the credit-report invites had.
   */
  if (!user) {
    const back = claim ? `/student?claim=${encodeURIComponent(claim)}` : "/student";
    return (
      <div className="light flex min-h-screen flex-col bg-slate-50 text-slate-900">
        <Navbar />
        <main className="mx-auto w-full max-w-lg px-4 pb-20 pt-24">
          <div className="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm sm:p-8">
            <GraduationCap className="h-8 w-8 text-blue-600" />
            <h1 className="mt-4 text-2xl font-black tracking-tight text-slate-950">
              {claim ? "Set up your student account" : "Your student account"}
            </h1>
            <p className="mt-3 text-sm leading-relaxed text-slate-600">
              {claim
                ? "Sign in and this links to your enrollment — your hours, your online lessons, and how much of your program you have left."
                : "Sign in to see your hours and your online lessons. If your school has enrolled you, they sent you a link."}
            </p>
            <div className="mt-6 space-y-3">
              {/* Sign in first: most people arriving here already have an
                  account, and being offered "create one" when you have one is
                  how you reach a duplicate-email error instead of your hours. */}
              <Link
                href={`/login?redirect=${encodeURIComponent(back)}`}
                className="flex w-full items-center justify-center gap-2 rounded-xl bg-blue-600 px-5 py-3 text-sm font-black text-white hover:bg-blue-700"
              >
                <LogIn className="h-4 w-4" />
                Sign in
              </Link>
              <Link
                href={`/membership/students${claim ? `?claim=${encodeURIComponent(claim)}&src=school-enrollment` : "?src=school-enrollment"}`}
                className="flex w-full items-center justify-center gap-2 rounded-xl border-2 border-slate-200 px-5 py-3 text-sm font-black text-slate-700 hover:bg-slate-50"
              >
                <UserPlus className="h-4 w-4" />
                I don&apos;t have an account yet
              </Link>
            </div>
          </div>
        </main>
      </div>
    );
  }

  const student = await studentForUser(user.id);

  if (!student) {
    return (
      <div className="light flex min-h-screen flex-col bg-slate-50 text-slate-900">
        <Navbar />
        <main className="mx-auto w-full max-w-lg px-4 pb-20 pt-24">
          <ClaimPanel presetToken={claim ?? ""} />
        </main>
      </div>
    );
  }

  const school = await firstSchool();
  const [program, punches, blocks, lessons, open] = await Promise.all([
    programById(student.programId),
    punchesFor(student.id),
    scheduleFor(student.programId),
    lessonsForProgram(student.programId),
    openSessionFor(student.id),
  ]);
  if (!school || !program) {
    return (
      <div className="light flex min-h-screen flex-col bg-slate-50 text-slate-900">
        <Navbar />
        <main className="mx-auto max-w-lg px-4 pb-20 pt-24">
          <p className="text-sm text-slate-600">
            Your enrollment is missing its program record. Tell the school — this is theirs to fix,
            not yours.
          </p>
        </main>
      </div>
    );
  }

  const now = new Date();
  const l = ledger(punches, now);
  const caps = distanceCaps(program);
  const total = toHours(l.totalMinutes);

  // Standing per lesson, and whether its class window is open right now.
  const { all: allSections, byLesson } = await sectionIndexFor(lessons.map((x) => x.id));
  const progress = await progressFor(student.id, allSections.map((s) => s.id));

  const blockById = new Map(blocks.map((b) => [b.id, b]));
  const liveBlock = blockAt(blocks, now, school.timezone);
  const wall = localWallClock(now, school.timezone);

  const cards = lessons.map((lesson) => {
    const secs = byLesson.get(lesson.id) ?? [];
    const mine = new Set(secs.map((x) => x.id));
    return {
      lesson,
      standing: lessonStanding(secs, progress.filter((p) => mine.has(p.sectionId))),
      block: blockById.get(lesson.blockId),
      openNow: liveBlock?.id === lesson.blockId,
    };
  });

  return (
    <div className="light flex min-h-screen flex-col bg-slate-50 text-slate-900">
      <Navbar />
      <main className="mx-auto w-full max-w-3xl flex-1 px-4 pb-24 pt-24 sm:px-6">
        <header>
          <h1 className="text-3xl font-black tracking-tight text-slate-950">
            Hi, {student.firstName}
          </h1>
          <p className="mt-1 text-sm text-slate-500">
            {program.totalHours}-hour program · {school.name}
            {student.status !== "active" && ` · ${student.status.replace("_", " ")}`}
          </p>
        </header>

        {claimed && (
          <p className="mt-4 flex items-center gap-2 rounded-xl border border-emerald-200 bg-emerald-50 px-4 py-3 text-sm font-bold text-emerald-900">
            <CheckCircle2 className="h-4 w-4" />
            Your account is linked. Everything below is your own record.
          </p>
        )}

        {open && <SessionBanner startedAt={open.punchedInAt} />}

        {/* Hours */}
        <section className="mt-6 rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
          <div className="flex items-baseline justify-between">
            <h2 className="text-sm font-black uppercase tracking-widest text-slate-500">
              Your hours
            </h2>
            <span className="text-xs font-bold text-slate-500">
              {Math.round((total / program.totalHours) * 100)}% of the program
            </span>
          </div>
          <p className="mt-2 text-4xl font-black tabular-nums text-slate-950">
            {total.toFixed(1)}
            <span className="text-xl text-slate-400"> / {program.totalHours}</span>
          </p>
          <div className="mt-3 h-2.5 overflow-hidden rounded-full bg-slate-100">
            <div
              className="h-full rounded-full bg-emerald-500"
              style={{ width: `${Math.min(100, (total / program.totalHours) * 100)}%` }}
            />
          </div>
          <div className="mt-4 grid grid-cols-3 gap-3 border-t border-slate-100 pt-4 text-center">
            {[
              ["Theory", toHours(l.theoryMinutes)],
              ["Practical", toHours(l.practicalMinutes)],
              ["Online", toHours(l.distanceMinutes)],
            ].map(([k, v]) => (
              <div key={k as string}>
                <div className="text-lg font-black tabular-nums text-slate-900">
                  {(v as number).toFixed(1)}
                </div>
                <div className="text-[11px] font-bold uppercase tracking-wide text-slate-500">{k}</div>
              </div>
            ))}
          </div>
        </section>

        {/* Distance headroom */}
        <section className="mt-5 rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
          <h2 className="mb-4 flex items-center gap-2 text-sm font-black uppercase tracking-widest text-slate-500">
            <Monitor className="h-4 w-4 text-sky-500" />
            How much you can do online
          </h2>
          <div className="grid grid-cols-1 gap-5 sm:grid-cols-2">
            <Meter
              used={toHours(l.coreDistanceMinutes)} cap={caps.core} label="Core"
              hint="The rest of your core hours have to be earned on campus."
            />
            <Meter
              used={toHours(l.specialtyDistanceMinutes)} cap={caps.specialty} label="Specialty"
              hint="Practical work is never online, wherever you are in this."
            />
          </div>
          <p className="mt-4 border-t border-slate-100 pt-3 text-xs leading-relaxed text-slate-500">
            Texas caps how much of a program can be taught at a distance, and the cap applies to
            each part separately rather than to your total — so running out of online core hours
            does not free up the specialty ones.
          </p>
        </section>

        {/* Lessons */}
        <section className="mt-5">
          <h2 className="mb-3 flex items-center gap-2 text-sm font-black uppercase tracking-widest text-slate-500">
            <BookOpen className="h-4 w-4 text-blue-500" />
            Your online lessons
          </h2>

          {cards.length === 0 ? (
            <p className="rounded-2xl border border-slate-200 bg-white p-6 text-sm leading-relaxed text-slate-600">
              Your school has not published any online lessons yet. When they do, they appear here
              and you can work through them during your scheduled online class time.
            </p>
          ) : (
            <div className="space-y-3">
              {cards.map(({ lesson, standing, block, openNow }) => (
                <Link
                  key={lesson.id}
                  href={`/student/lesson/${lesson.id}`}
                  className="block rounded-2xl border border-slate-200 bg-white p-5 shadow-sm transition-colors hover:border-blue-300"
                >
                  <div className="flex flex-wrap items-start justify-between gap-3">
                    <div className="min-w-0">
                      <h3 className="font-black text-slate-900">{lesson.title}</h3>
                      {lesson.summary && (
                        <p className="mt-1 text-sm leading-relaxed text-slate-600">{lesson.summary}</p>
                      )}
                      <p className="mt-2 flex flex-wrap items-center gap-x-2 text-xs text-slate-500">
                        <CalendarClock className="h-3 w-3" />
                        {block
                          ? `${DAYS[block.weekday]} ${hhmm(block.startsMinute)}–${hhmm(block.endsMinute)}`
                          : lesson.blockLabel}
                        <span>·</span>
                        <Clock className="h-3 w-3" />
                        about {lesson.estimatedMinutes} min
                      </p>
                    </div>
                    {openNow ? (
                      <span className="shrink-0 rounded-full bg-emerald-100 px-3 py-1 text-xs font-black text-emerald-800">
                        Open now
                      </span>
                    ) : (
                      <span className="shrink-0 rounded-full bg-slate-100 px-3 py-1 text-xs font-bold text-slate-500">
                        {block ? DAYS[block.weekday] : "Not scheduled"}
                      </span>
                    )}
                  </div>

                  {lesson.sectionCount > 0 && (
                    <div className="mt-3 flex items-center gap-3">
                      <div className="h-1.5 flex-1 overflow-hidden rounded-full bg-slate-100">
                        <div
                          className="h-full rounded-full bg-blue-500"
                          style={{ width: `${(standing.sectionsCompleted / lesson.sectionCount) * 100}%` }}
                        />
                      </div>
                      <span className="shrink-0 text-xs font-bold tabular-nums text-slate-500">
                        {standing.sectionsCompleted} / {lesson.sectionCount}
                      </span>
                    </div>
                  )}
                </Link>
              ))}
            </div>
          )}

          {/*
            Says WHY a lesson is closed rather than just showing it greyed out.
            "Not now" with no reason reads as a broken button; naming the day and
            time reads as a timetable, which is what it is.
          */}
          {cards.length > 0 && !liveBlock && (
            <p className="mt-4 rounded-xl border border-slate-200 bg-white px-4 py-3 text-xs leading-relaxed text-slate-500">
              It is {DAYS[wall.weekday]} and none of your classes are running, so opening a lesson
              now will let you read it but will not earn hours. Hours only count during your
              scheduled class time — that is the rule your school reports against, not ours.{" "}
              <strong className="text-slate-700">
                Reading ahead costs you nothing:
              </strong>{" "}
              a lesson you have already finished still counts in full when you go back through it
              during class, so a full progress bar is not a reason to stay away.
            </p>
          )}
        </section>
      </main>
    </div>
  );
}
