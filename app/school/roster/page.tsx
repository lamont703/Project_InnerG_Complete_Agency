import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { isAdmin } from "@/app/admin/ad-campaigns/auth";
import Link from "next/link";
import { Clock, PenLine } from "lucide-react";

import { Navbar } from "@/components/layout/navbar";
import { distanceCaps, ledger, toHours } from "@/lib/school/hours";
import { firstSchool, pendingValidation, programsFor, roster } from "@/lib/school/store";
import { RosterClient, type RosterRow } from "./roster-client";

/**
 * The roster.
 *
 * TOTALS COME FROM lib/school/hours.ts, the same engine the kiosk decides with
 * and the ledger renders from. It would be faster to sum minutes in SQL, and
 * that is exactly the shortcut that lets a roster figure disagree with a
 * transcript. One definition of an hour, used everywhere, is worth more than
 * the query time.
 *
 * GATED TWICE, ON PURPOSE. middleware.ts lists /school/roster among the
 * internal tools behind the password screen, and this page re-checks isAdmin()
 * — because that middleware FAILS OPEN on an auth exception, which is exactly
 * the condition under which a page listing every student would otherwise be
 * served to anybody.
 *
 * The kiosk next door is deliberately NOT gated and the two must never be
 * confused: /school/clock can only clock somebody in or out, while this page
 * lists every student and creates people.
 */
export const metadata: Metadata = {
  title: "Roster",
  robots: { index: false, follow: false },
};

export const dynamic = "force-dynamic";

export default async function RosterPage() {
  // 404 rather than 403: an unauthorised visitor learns nothing about whether
  // this page exists.
  if (!(await isAdmin())) notFound();

  const school = await firstSchool();

  if (!school) {
    return (
      <div className="flex min-h-screen flex-col bg-slate-50 light text-slate-900">
        <Navbar />
        <main className="mx-auto max-w-3xl px-4 pb-20 pt-24">
          <h1 className="text-2xl font-black tracking-tight text-slate-950">No school set up</h1>
          <p className="mt-3 text-sm leading-relaxed text-slate-600">
            Run <code className="rounded bg-slate-100 px-1.5 py-0.5">node scripts/seed_shearquery_school.js --write</code>{" "}
            once the SIS migrations are pushed.
          </p>
        </main>
      </div>
    );
  }

  const [entries, programs, unsigned] = await Promise.all([
    roster(school.id),
    programsFor(school.id),
    pendingValidation(school.id),
  ]);

  const rows: RosterRow[] = entries.map((e) => {
    const l = ledger(e.punches);
    const caps = distanceCaps(e.program);
    return {
      id: e.student.id,
      name: `${e.student.firstName} ${e.student.lastName}`,
      clockCode: e.student.clockCode,
      programName: e.programName,
      status: e.student.status,
      hours: toHours(l.totalMinutes),
      programHours: e.program.totalHours,
      coreDistanceHours: toHours(l.coreDistanceMinutes),
      coreDistanceCap: caps.core,
      onClockSince: e.onClockSince,
    };
  });

  return (
    <div className="flex min-h-screen flex-col bg-slate-50 light text-slate-900">
      <Navbar />
      <main className="mx-auto w-full max-w-5xl flex-1 px-4 pb-20 pt-24 sm:px-6">
        <header className="mb-6 flex flex-wrap items-end justify-between gap-3">
          <div>
            <h1 className="text-3xl font-black tracking-tight text-slate-950">Roster</h1>
            <p className="mt-1 text-sm text-slate-500">
              {school.name} · {rows.length} {rows.length === 1 ? "student" : "students"}
            </p>
          </div>
          <div className="flex flex-wrap gap-2">
            {/* Shown only when there is something to do. A permanent "Sign-off"
                button reading zero teaches people to ignore it, which is the
                one thing a compliance queue cannot afford. */}
            {unsigned.length > 0 && (
              <Link
                href="/school/validation"
                className="inline-flex items-center gap-2 rounded-xl border-2 border-amber-300 bg-amber-50 px-4 py-2.5 text-sm font-black text-amber-900 hover:bg-amber-100"
              >
                <PenLine className="h-4 w-4" />
                {unsigned.length} online {unsigned.length === 1 ? "session" : "sessions"} to sign
              </Link>
            )}
            <Link
              href="/school/clock"
              className="inline-flex items-center gap-2 rounded-xl border-2 border-slate-200 bg-white px-4 py-2.5 text-sm font-black text-slate-700 hover:bg-slate-50"
            >
              <Clock className="h-4 w-4" />
              Open the clock
            </Link>
          </div>
        </header>

        <RosterClient rows={rows} programs={programs} />
      </main>
    </div>
  );
}
