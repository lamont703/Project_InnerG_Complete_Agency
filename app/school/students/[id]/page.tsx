import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { isAdmin } from "@/app/admin/ad-campaigns/auth";
import { AlertTriangle, ArrowLeft, CalendarClock, GraduationCap } from "lucide-react";

import { Navbar } from "@/components/layout/navbar";
import {
  campusGaps, distanceCaps, ledger, localWallClock, toHours,
  writtenExamEligible, MAX_BUSINESS_DAYS_BETWEEN_CAMPUS,
} from "@/lib/school/hours";
import { signaturesFor, studentDetail } from "@/lib/school/store";
import { LedgerClient, type LedgerRow } from "./ledger-client";

/**
 * One student's ledger — the page an inspector reads over your shoulder.
 *
 * THE ROSTER ANSWERS "HOW IS THIS STUDENT DOING". THIS ANSWERS "PROVE IT".
 * Every figure at the top is computed from the rows underneath it by
 * lib/school/hours.ts, so the totals and the evidence cannot disagree — and
 * somebody who does not trust the summary can add up the trail themselves.
 *
 * VOIDS ARE SHOWN, not filtered. See the note in ledger-client.tsx: the
 * correction belongs beside the thing it corrected.
 */
export const metadata: Metadata = {
  title: "Student ledger",
  robots: { index: false, follow: false },
};

export const dynamic = "force-dynamic";

function Meter({ used, cap, label }: { used: number; cap: number; label: string }) {
  const pct = cap > 0 ? Math.min((used / cap) * 100, 100) : 0;
  const over = used > cap;
  return (
    <div>
      <div className="flex items-baseline justify-between">
        <span className="text-[11px] font-black uppercase tracking-widest text-slate-500">{label}</span>
        <span className={`text-sm font-black tabular-nums ${over ? "text-rose-700" : "text-slate-900"}`}>
          {used.toFixed(1)} <span className="font-bold text-slate-400">/ {cap}</span>
        </span>
      </div>
      <div className="mt-1.5 h-2 overflow-hidden rounded-full bg-slate-100">
        <div className={`h-full rounded-full ${over ? "bg-rose-500" : pct > 85 ? "bg-amber-500" : "bg-emerald-500"}`}
          style={{ width: `${pct}%` }} />
      </div>
    </div>
  );
}

export default async function StudentLedgerPage(props: { params: Promise<{ id: string }> }) {
  // Gated in middleware AND here. This page renders one named person's full
  // attendance history and offers to void it — and the middleware fails open.
  if (!(await isAdmin())) notFound();

  const { id } = await props.params;
  const d = await studentDetail(id);
  if (!d) notFound();

  const tz = d.school.timezone;
  const now = new Date();
  const l = ledger(d.punches);
  const caps = distanceCaps(d.program);
  const gaps = campusGaps(d.punches, {
    enrolledOn: d.enrolledOn,
    asOf: localWallClock(now, tz).date,
    timeZone: tz,
  });

  const fmtTime = (iso: string) =>
    new Intl.DateTimeFormat("en-US", { timeZone: tz, hour: "numeric", minute: "2-digit" }).format(new Date(iso));

  const signatures = await signaturesFor(d.student.id);

  const rows: LedgerRow[] = d.punches
    .map((p: any) => ({
      id: p.id,
      date: localWallClock(new Date(p.punchedInAt), tz).date,
      inAt: fmtTime(p.punchedInAt),
      outAt: p.punchedOutAt ? fmtTime(p.punchedOutAt) : null,
      minutes: p.punchedOutAt
        ? Math.round((new Date(p.punchedOutAt).getTime() - new Date(p.punchedInAt).getTime()) / 60000)
        : 0,
      kind: p.kind, modality: p.modality, segment: p.segment,
      blockLabel: p.scheduleBlockId ? d.blockLabels[p.scheduleBlockId] ?? null : null,
      source: p.source ?? "kiosk",
      validated: Boolean(p.validatedAt),
      validatedBy: signatures[p.id]?.name ?? null,
      validatedAt: p.validatedAt ?? null,
      voidedAt: p.voidedAt, voidedBy: p.voidedBy ?? null, voidReason: p.voidReason ?? null,
    }))
    .reverse(); // newest first: a correction is nearly always to a recent punch

  const total = toHours(l.totalMinutes);
  const toExam = Math.max(0, d.program.totalHours * 0.9 - total);

  return (
    <div className="flex min-h-screen flex-col bg-slate-50 light text-slate-900">
      <Navbar />
      <main className="mx-auto w-full max-w-4xl flex-1 px-4 pb-20 pt-24 sm:px-6">
        <Link href="/school/roster" className="inline-flex items-center gap-1.5 text-sm font-bold text-blue-700 hover:underline">
          <ArrowLeft className="h-4 w-4" /> Roster
        </Link>

        <header className="mt-4">
          <h1 className="text-3xl font-black tracking-tight text-slate-950">
            {d.student.firstName} {d.student.lastName}
          </h1>
          <p className="mt-1 text-sm text-slate-500">
            {d.programName} · enrolled {d.enrolledOn} · {d.student.status.replace("_", " ")}
          </p>
        </header>

        {/* Totals, every one computed from the rows below. */}
        <section className="mt-6 grid grid-cols-2 gap-4 sm:grid-cols-4">
          {[
            ["Total", `${total.toFixed(1)}`, `of ${d.program.totalHours}`],
            ["Theory", `${toHours(l.theoryMinutes).toFixed(1)}`, "hours"],
            ["Practical", `${toHours(l.practicalMinutes).toFixed(1)}`, "hours"],
            ["Online", `${toHours(l.distanceMinutes).toFixed(1)}`, "hours"],
          ].map(([k, v, sub]) => (
            <div key={k} className="rounded-xl border border-slate-200 bg-white p-4">
              <div className="text-2xl font-black tabular-nums text-slate-900">{v}</div>
              <div className="text-[11px] font-bold uppercase tracking-wide text-slate-500">{k}</div>
              <div className="text-[11px] text-slate-400">{sub}</div>
            </div>
          ))}
        </section>

        <section className="mt-5 grid grid-cols-1 gap-5 rounded-2xl border border-slate-200 bg-white p-5 sm:grid-cols-2">
          <Meter used={toHours(l.coreDistanceMinutes)} cap={caps.core} label="Core distance" />
          <Meter used={toHours(l.specialtyDistanceMinutes)} cap={caps.specialty} label="Specialty distance" />
        </section>

        {/* The things a school needs to see coming. */}
        <section className="mt-5 space-y-3">
          {l.unvalidatedDistanceMinutes > 0 && (
            <div className="flex items-start gap-3 rounded-xl border border-amber-200 bg-amber-50 p-4">
              <AlertTriangle className="mt-0.5 h-4 w-4 shrink-0 text-amber-600" />
              <p className="text-sm leading-relaxed text-amber-900">
                <strong>{toHours(l.unvalidatedDistanceMinutes).toFixed(1)} online hours have no instructor validation.</strong>{" "}
                NACCAS VI.02 wants measurable, instructor-validated participation for distance hours
                specifically — so these are a compliance question, not a bookkeeping one.{" "}
                <Link href="/school/validation" className="font-black underline underline-offset-2">
                  Sign for them
                </Link>
                .
              </p>
            </div>
          )}

          {gaps.length > 0 && (
            <div className="rounded-xl border border-amber-200 bg-amber-50 p-4">
              <p className="flex items-center gap-2 text-sm font-black text-amber-900">
                <CalendarClock className="h-4 w-4" />
                {gaps.length} {gaps.length === 1 ? "gap" : "gaps"} over {MAX_BUSINESS_DAYS_BETWEEN_CAMPUS} business days
              </p>
              <ul className="mt-2 space-y-1">
                {gaps.slice(0, 5).map((g, i) => (
                  <li key={i} className="text-sm text-amber-800">
                    {g.from} → {g.to} · <strong>{g.businessDays} business days</strong>
                  </li>
                ))}
              </ul>
              <p className="mt-2 text-[11px] leading-relaxed text-amber-700">
                Federal holidays excluded. This is a calculation over attendance, not a stored
                field — which is why a school with perfect records still cannot answer it from a
                spreadsheet.
              </p>
            </div>
          )}

          <div className="flex items-start gap-3 rounded-xl border border-slate-200 bg-white p-4">
            <GraduationCap className="mt-0.5 h-4 w-4 shrink-0 text-slate-400" />
            <p className="text-sm leading-relaxed text-slate-600">
              {writtenExamEligible(l, d.program) ? (
                <><strong className="text-slate-900">Eligible to sit the written exam.</strong>{" "}
                TDLR allows it at 90% of the program — {(d.program.totalHours * 0.9).toFixed(0)} hours.</>
              ) : (
                <><strong className="text-slate-900">{toExam.toFixed(1)} hours</strong> to written-exam
                eligibility at {(d.program.totalHours * 0.9).toFixed(0)}, and{" "}
                {(d.program.totalHours - total).toFixed(1)} to completion.</>
              )}
            </p>
          </div>
        </section>

        <h2 className="mt-8 mb-3 text-sm font-black uppercase tracking-widest text-slate-500">
          Every punch — {rows.length}
        </h2>
        <LedgerClient rows={rows} />
      </main>
    </div>
  );
}
