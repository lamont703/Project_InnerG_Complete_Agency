"use client";

import { useState, useMemo } from "react";
import Link from "next/link";
import {
  ShieldCheck, AlertTriangle, XCircle, CheckCircle2, FileText, ArrowRight, Printer, Info,
} from "lucide-react";
import {
  DEMO_STUDENTS, DEMO_AS_OF, runChecks, totals, worstSeverity,
  CORE_DISTANCE_CAP, SPECIALTY_DISTANCE_CAP, MAX_BUSINESS_DAYS_BETWEEN_CAMPUS, MONTHLY_HOUR_CAP,
  type Student, type Severity,
} from "@/lib/compliance-binder";

/**
 * The binder, made tangible.
 *
 * The point of the screen is the moment a school owner sees a student who is at
 * exactly 50% distance hours and still in breach, because the breach is against
 * the core-700 ceiling rather than the percentage. Everything else on the page
 * is in service of that.
 *
 * Roster first, one student at a time second — an inspector asks about a
 * student, not a cohort, and the whole argument is that the answer should take
 * ten seconds rather than a week.
 */

const TONE: Record<Severity, { chip: string; ring: string; Icon: typeof CheckCircle2; word: string }> = {
  pass: { chip: "bg-emerald-100 text-emerald-800", ring: "border-emerald-200", Icon: CheckCircle2, word: "Clear" },
  warn: { chip: "bg-amber-100 text-amber-800", ring: "border-amber-300", Icon: AlertTriangle, word: "Close to a limit" },
  fail: { chip: "bg-rose-100 text-rose-800", ring: "border-rose-300", Icon: XCircle, word: "Exposed" },
};

export function BinderClient() {
  const [selectedId, setSelectedId] = useState(DEMO_STUDENTS[0].id);
  const student = DEMO_STUDENTS.find((s) => s.id === selectedId)!;

  const roster = useMemo(
    () =>
      DEMO_STUDENTS.map((s) => {
        const checks = runChecks(s, DEMO_AS_OF);
        return { s, checks, sev: worstSeverity(checks), t: totals(s) };
      }),
    []
  );
  const current = roster.find((r) => r.s.id === selectedId)!;
  const exposedCount = roster.filter((r) => r.sev === "fail").length;

  return (
    <div className="space-y-8">
      {/* Roster summary — the ten-second answer. */}
      <section>
        <div className="mb-4 flex flex-wrap items-center gap-3">
          <div className="rounded-xl border border-slate-200 bg-white px-4 py-2.5 shadow-sm">
            <span className="text-lg font-black tabular-nums text-slate-900">{roster.length}</span>
            <span className="ml-2 text-xs font-semibold text-slate-500">students on distance education</span>
          </div>
          <div className={`rounded-xl border px-4 py-2.5 shadow-sm ${exposedCount ? "border-rose-300 bg-rose-50" : "border-emerald-200 bg-emerald-50"}`}>
            <span className={`text-lg font-black tabular-nums ${exposedCount ? "text-rose-700" : "text-emerald-700"}`}>{exposedCount}</span>
            <span className="ml-2 text-xs font-semibold text-slate-600">with an exposure right now</span>
          </div>
          <button
            type="button"
            onClick={() => window.print()}
            className="inline-flex items-center gap-2 rounded-xl border border-slate-300 bg-white px-4 py-2.5 text-xs font-black uppercase tracking-wider text-slate-700 shadow-sm transition-colors hover:bg-slate-50"
          >
            <Printer className="h-3.5 w-3.5" />
            Print the binder
          </button>
        </div>

        <div className="overflow-x-auto rounded-2xl border border-slate-200">
          <table className="w-full min-w-[720px] border-collapse bg-white">
            <thead>
              <tr className="border-b border-slate-200 bg-slate-50">
                <th className="px-4 py-3 text-left text-xs font-black uppercase tracking-wider text-slate-500">Student</th>
                <th className="px-4 py-3 text-left text-xs font-black uppercase tracking-wider text-slate-500">Course</th>
                <th className="px-4 py-3 text-left text-xs font-black uppercase tracking-wider text-slate-500">Distance / total</th>
                <th className="px-4 py-3 text-left text-xs font-black uppercase tracking-wider text-slate-500">Core distance</th>
                <th className="px-4 py-3 text-left text-xs font-black uppercase tracking-wider text-slate-500">Status</th>
              </tr>
            </thead>
            <tbody>
              {roster.map(({ s, sev, t }) => {
                const tone = TONE[sev];
                const active = s.id === selectedId;
                return (
                  <tr
                    key={s.id}
                    onClick={() => setSelectedId(s.id)}
                    className={`cursor-pointer border-b border-slate-100 last:border-0 transition-colors ${active ? "bg-indigo-50/70" : "hover:bg-slate-50"}`}
                  >
                    <td className="px-4 py-3.5">
                      <span className="block text-sm font-black text-slate-900">{s.name}</span>
                      <span className="text-xs text-slate-400">{s.id}</span>
                    </td>
                    <td className="px-4 py-3.5 text-sm text-slate-600">{s.course}</td>
                    <td className="px-4 py-3.5 text-sm tabular-nums text-slate-700">
                      {t.distance} / {t.total}
                      <span className="ml-1.5 text-xs text-slate-400">({t.distancePct.toFixed(0)}%)</span>
                    </td>
                    <td className="px-4 py-3.5 text-sm font-black tabular-nums">
                      <span className={t.coreDistance > CORE_DISTANCE_CAP ? "text-rose-700" : "text-slate-900"}>
                        {t.coreDistance}
                      </span>
                      <span className="text-xs font-medium text-slate-400"> / {CORE_DISTANCE_CAP}</span>
                    </td>
                    <td className="px-4 py-3.5">
                      <span className={`inline-flex items-center gap-1.5 rounded-lg px-2.5 py-1 text-xs font-black ${tone.chip}`}>
                        <tone.Icon className="h-3.5 w-3.5" />
                        {tone.word}
                      </span>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
        <p className="mt-3 flex items-start gap-2 text-xs leading-relaxed text-slate-500">
          <Info className="mt-0.5 h-3.5 w-3.5 shrink-0" />
          <span>
            Look at the first row. <strong className="text-slate-700">50% distance hours overall — and over
            the core ceiling.</strong> A tracker watching a single percentage reports that student as
            compliant.
          </span>
        </p>
      </section>

      {/* One student's binder. */}
      <section>
        <div className="mb-4 flex flex-wrap items-baseline justify-between gap-2 border-t border-slate-200 pt-8">
          <div>
            <h2 className="text-xl font-black text-slate-900">{student.name}</h2>
            <p className="text-sm text-slate-500">
              {student.id} &middot; {student.course} &middot; enrolled {student.enrolledOn} &middot; as of {DEMO_AS_OF}
            </p>
          </div>
          <span className={`inline-flex items-center gap-1.5 rounded-lg px-3 py-1.5 text-xs font-black ${TONE[current.sev].chip}`}>
            {TONE[current.sev].word}
          </span>
        </div>

        <div className="mb-6 grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
          {[
            { label: "In-person hours", value: current.t.inPerson, sub: "clinic floor" },
            { label: "Distance hours", value: current.t.distance, sub: `${current.t.distancePct.toFixed(0)}% of hours earned` },
            { label: "Core distance", value: `${current.t.coreDistance} / ${CORE_DISTANCE_CAP}`, sub: "16 TAC §83.202(e)", bad: current.t.coreDistance > CORE_DISTANCE_CAP },
            { label: "Specialty distance", value: `${current.t.specialtyDistance} / ${SPECIALTY_DISTANCE_CAP}`, sub: "second ceiling", bad: current.t.specialtyDistance > SPECIALTY_DISTANCE_CAP },
          ].map((c) => (
            <div key={c.label} className={`rounded-2xl border p-5 shadow-sm ${c.bad ? "border-rose-300 bg-rose-50" : "border-slate-200 bg-white"}`}>
              <p className="text-xs font-black uppercase tracking-wider text-slate-500">{c.label}</p>
              <p className={`mt-1 text-2xl font-black tabular-nums ${c.bad ? "text-rose-700" : "text-slate-900"}`}>{c.value}</p>
              <p className="mt-0.5 text-xs text-slate-400">{c.sub}</p>
            </div>
          ))}
        </div>

        <div className="space-y-3">
          {current.checks.map((c) => {
            const tone = TONE[c.severity];
            return (
              <div key={c.id} className={`rounded-2xl border bg-white p-5 shadow-sm ${tone.ring}`}>
                <div className="flex gap-4">
                  <tone.Icon className={`mt-0.5 h-5 w-5 shrink-0 ${c.severity === "fail" ? "text-rose-600" : c.severity === "warn" ? "text-amber-600" : "text-emerald-600"}`} />
                  <div className="min-w-0 flex-1">
                    <div className="flex flex-wrap items-center gap-2">
                      <p className="text-sm font-black text-slate-900">{c.label}</p>
                      <span className={`rounded px-1.5 py-0.5 text-[10px] font-black ${c.authority === "TDLR" ? "bg-indigo-100 text-indigo-800" : "bg-emerald-100 text-emerald-800"}`}>
                        {c.authority}
                      </span>
                      <span className="text-xs text-slate-400">{c.citation}</span>
                    </div>
                    <p className="mt-1.5 text-sm leading-relaxed text-slate-600">{c.detail}</p>
                    {c.severity === "fail" && c.violation ? (
                      <Link
                        href="/texas-school-penalties-distance-education"
                        className="mt-2 inline-flex items-center gap-1 text-xs font-black text-rose-700 hover:underline"
                      >
                        Maps to: &ldquo;{c.violation}&rdquo;
                        <ArrowRight className="h-3 w-3" />
                      </Link>
                    ) : null}
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      </section>
    </div>
  );
}

export function BinderLegend() {
  return (
    <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
      {[
        { n: `${CORE_DISTANCE_CAP} / ${SPECIALTY_DISTANCE_CAP}`, l: "Distance ceilings", d: "Core 700 and specialty 300, separately. Not one 50% figure." },
        { n: `${MAX_BUSINESS_DAYS_BETWEEN_CAMPUS}`, l: "Business days", d: "Maximum between full days on campus. NACCAS VI.02 element 3." },
        { n: `${MONTHLY_HOUR_CAP}`, l: "Hours per month", d: "Per student ceiling. Catches back-filled reporting." },
        { n: "0", l: "Ungraded exceptions", d: "Every GPA-bearing assessment on campus. No allowance." },
      ].map((x) => (
        <div key={x.l} className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
          <p className="text-2xl font-black tabular-nums text-slate-900">{x.n}</p>
          <p className="mt-0.5 text-xs font-black uppercase tracking-wider text-indigo-600">{x.l}</p>
          <p className="mt-1.5 text-xs leading-relaxed text-slate-500">{x.d}</p>
        </div>
      ))}
    </div>
  );
}
