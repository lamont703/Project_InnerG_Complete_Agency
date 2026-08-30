"use client";

import { useMemo, useState } from "react";
import Link from "next/link";
import {
  AlertTriangle, CalendarClock, CheckCircle2, Lock, Monitor, PhoneCall, Users, XCircle,
} from "lucide-react";
import {
  CORE_DISTANCE_CAP, SPECIALTY_DISTANCE_CAP, DEMO_AS_OF, DEMO_STUDENTS,
  campusGaps, runChecks, totals, worstSeverity,
  type Severity, type Student,
} from "@/lib/compliance-binder";

/**
 * The hybrid program console, as a school would operate it.
 *
 * WHAT THIS DEMO IS ARGUING, and why it is not another compliance report:
 * /tools/distance-education-audit-binder already audits. An audit tells a
 * school what went wrong last term. This shows the same rules applied at the
 * moment a student tries to book the next online block — which is the only
 * point at which a breach can still be prevented rather than explained.
 *
 * THE ONE THING TO SHOW ON A CALL is Alicia Moreno. She sits at exactly 50%
 * distance overall, which is the number every LMS checks and every school
 * quotes, and she is in breach — because 360 of those hours landed in core
 * against a 350 ceiling. A school owner watching a percentage go green while
 * the penalty accrues is the entire pitch, and it takes about eight seconds.
 *
 * THE ENGINE IS NOT MOCKED. runChecks, totals and campusGaps are the same pure
 * functions the audit tool uses, from lib/compliance-binder.ts. Only the roster
 * is invented, and it is labelled on screen — a demo that quietly reimplements
 * the rules would be a demo of nothing.
 */

const TONE: Record<Severity, { chip: string; dot: string; label: string }> = {
  pass: { chip: "bg-emerald-50 text-emerald-800 border-emerald-200", dot: "bg-emerald-500", label: "Compliant" },
  warn: { chip: "bg-amber-50 text-amber-900 border-amber-200", dot: "bg-amber-500", label: "Close to a ceiling" },
  fail: { chip: "bg-rose-50 text-rose-800 border-rose-200", dot: "bg-rose-500", label: "In breach" },
};

function Meter({ used, cap, label }: { used: number; cap: number; label: string }) {
  const pct = Math.min((used / cap) * 100, 100);
  const over = used > cap;
  return (
    <div>
      <div className="flex items-baseline justify-between">
        <span className="text-xs font-black uppercase tracking-widest text-slate-500">{label}</span>
        <span className={`text-sm font-black tabular-nums ${over ? "text-rose-700" : "text-slate-900"}`}>
          {used} <span className="font-bold text-slate-400">/ {cap}</span>
        </span>
      </div>
      <div className="mt-2 h-2.5 overflow-hidden rounded-full bg-slate-100">
        <div
          className={`h-full rounded-full transition-all ${over ? "bg-rose-500" : pct > 85 ? "bg-amber-500" : "bg-emerald-500"}`}
          style={{ width: `${pct}%` }}
        />
      </div>
      {over && (
        <p className="mt-1.5 text-[11px] font-bold text-rose-700">
          Over by {used - cap} hours — every hour past the ceiling is the breach.
        </p>
      )}
    </div>
  );
}

export function HybridDemoConsole() {
  const [selectedId, setSelectedId] = useState(DEMO_STUDENTS[0].id);
  const student = DEMO_STUDENTS.find((s) => s.id === selectedId)!;

  const view = useMemo(() => {
    const t = totals(student);
    const checks = runChecks(student, DEMO_AS_OF);
    const gaps = campusGaps(student, DEMO_AS_OF);
    const coreLeft = CORE_DISTANCE_CAP - t.coreDistance;
    const specialtyLeft = SPECIALTY_DISTANCE_CAP - t.specialtyDistance;
    return { t, checks, gaps, coreLeft, specialtyLeft, severity: worstSeverity(checks) };
  }, [student]);

  const { t, checks, gaps, coreLeft, severity } = view;
  const blocked = coreLeft <= 0;

  return (
    <div className="space-y-6">
      {/* Roster */}
      <section className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm sm:p-6">
        <h2 className="mb-4 flex items-center gap-2 text-sm font-black uppercase tracking-widest text-slate-500">
          <Users className="h-4 w-4" />
          Cohort — {DEMO_STUDENTS.length} students
        </h2>
        <div className="grid grid-cols-1 gap-2 sm:grid-cols-2 lg:grid-cols-3">
          {DEMO_STUDENTS.map((s: Student) => {
            const st = totals(s);
            const sev = worstSeverity(runChecks(s, DEMO_AS_OF));
            const pct = Math.round((st.total / s.courseHours) * 100);
            return (
              <button
                key={s.id}
                onClick={() => setSelectedId(s.id)}
                className={`rounded-xl border-2 p-4 text-left transition-colors ${
                  s.id === selectedId ? "border-blue-500 bg-blue-50/50" : "border-slate-200 hover:bg-slate-50"
                }`}
              >
                <div className="flex items-center gap-2">
                  <span className={`h-2.5 w-2.5 shrink-0 rounded-full ${TONE[sev].dot}`} />
                  <span className="truncate text-sm font-black text-slate-900">{s.name}</span>
                </div>
                <p className="mt-1 text-xs text-slate-500">{s.course}</p>
                <p className="mt-2 text-xs font-bold tabular-nums text-slate-600">
                  {st.total} / {s.courseHours} hrs · {pct}%
                </p>
              </button>
            );
          })}
        </div>
      </section>

      {/* The selected student */}
      <section className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm sm:p-6">
        <div className="flex flex-wrap items-start justify-between gap-3">
          <div>
            <h2 className="text-xl font-black tracking-tight text-slate-950">{student.name}</h2>
            <p className="mt-0.5 text-sm text-slate-500">
              {student.course} · enrolled {student.enrolledOn} · {student.id}
            </p>
          </div>
          <span className={`rounded-full border px-3 py-1 text-xs font-black ${TONE[severity].chip}`}>
            {TONE[severity].label}
          </span>
        </div>

        {/* Hours */}
        <div className="mt-6 grid grid-cols-2 gap-4 sm:grid-cols-4">
          {[
            ["Total hours", `${t.total}`],
            ["Theory (online)", `${t.distance}`],
            ["Practical (campus)", `${t.inPerson}`],
            ["Distance share", `${t.distancePct.toFixed(0)}%`],
          ].map(([k, v]) => (
            <div key={k} className="rounded-xl border border-slate-200 p-3">
              <div className="text-lg font-black tabular-nums text-slate-900">{v}</div>
              <div className="text-[11px] font-bold uppercase tracking-wide text-slate-500">{k}</div>
            </div>
          ))}
        </div>

        {/* The two ceilings — the part a percentage hides. */}
        <div className="mt-6 grid grid-cols-1 gap-5 sm:grid-cols-2">
          <Meter used={t.coreDistance} cap={CORE_DISTANCE_CAP} label="Core distance" />
          <Meter used={t.specialtyDistance} cap={SPECIALTY_DISTANCE_CAP} label="Specialty distance" />
        </div>

        {t.distancePct <= 50 && severity === "fail" && (
          <div className="mt-5 flex items-start gap-3 rounded-xl border-2 border-rose-300 bg-rose-50 p-4">
            <AlertTriangle className="mt-0.5 h-5 w-5 shrink-0 text-rose-600" />
            <p className="text-sm leading-relaxed text-rose-900">
              <strong>This is the case a percentage check misses.</strong> Distance share reads{" "}
              {t.distancePct.toFixed(0)}% — inside the headline 50% — and this student is still in
              breach, because the hours landed on the wrong side of the core ceiling. An LMS
              reporting one number would show green all year.
            </p>
          </div>
        )}
      </section>

      {/* The functional bit: booking the next online block. */}
      <section className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm sm:p-6">
        <h2 className="mb-1 flex items-center gap-2 text-sm font-black uppercase tracking-widest text-slate-500">
          <Monitor className="h-4 w-4" />
          Next online theory block
        </h2>
        <p className="mb-4 text-sm leading-relaxed text-slate-600">
          This is where a hybrid program either protects a school or does not. The check runs when a
          student tries to book, not when an inspector arrives.
        </p>
        {blocked ? (
          <div className="flex items-start gap-3 rounded-xl border-2 border-rose-300 bg-rose-50 p-4">
            <Lock className="mt-0.5 h-5 w-5 shrink-0 text-rose-600" />
            <div>
              <p className="text-sm font-black text-rose-900">Blocked — core distance ceiling reached</p>
              <p className="mt-1 text-sm leading-relaxed text-rose-800">
                {student.name} cannot be scheduled into another online core block. Remaining core
                hours have to be delivered on campus. The system refuses the booking rather than
                recording a breach.
              </p>
            </div>
          </div>
        ) : coreLeft <= 40 ? (
          <div className="flex items-start gap-3 rounded-xl border-2 border-amber-300 bg-amber-50 p-4">
            <AlertTriangle className="mt-0.5 h-5 w-5 shrink-0 text-amber-600" />
            <div>
              <p className="text-sm font-black text-amber-900">
                {coreLeft} core distance hours left
              </p>
              <p className="mt-1 text-sm leading-relaxed text-amber-800">
                Roughly {Math.max(1, Math.floor(coreLeft / 36))} more online block
                {Math.floor(coreLeft / 36) === 1 ? "" : "s"} before the ceiling. Plan the rest on
                campus now, while there is still schedule to move.
              </p>
            </div>
          </div>
        ) : (
          <div className="flex items-start gap-3 rounded-xl border-2 border-emerald-300 bg-emerald-50 p-4">
            <CheckCircle2 className="mt-0.5 h-5 w-5 shrink-0 text-emerald-600" />
            <div>
              <p className="text-sm font-black text-emerald-900">Clear to schedule</p>
              <p className="mt-1 text-sm leading-relaxed text-emerald-800">
                {coreLeft} core distance hours of headroom. The block can be booked online.
              </p>
            </div>
          </div>
        )}
      </section>

      {/* Campus clock */}
      <section className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm sm:p-6">
        <h2 className="mb-1 flex items-center gap-2 text-sm font-black uppercase tracking-widest text-slate-500">
          <CalendarClock className="h-4 w-4" />
          Campus presence
        </h2>
        <p className="mb-4 text-sm leading-relaxed text-slate-600">
          A calendar computation over attendance, not a stored field — which is why a school with
          perfect records still cannot answer it from a spreadsheet.
        </p>
        {gaps.length === 0 ? (
          <p className="rounded-xl bg-emerald-50 px-4 py-3 text-sm font-bold text-emerald-800">
            On campus at least every 10 business days. No gaps.
          </p>
        ) : (
          <ul className="space-y-2">
            {gaps.slice(0, 4).map((g, i) => (
              <li key={i} className="rounded-xl border border-amber-200 bg-amber-50 px-4 py-3 text-sm text-amber-900">
                <strong>{g.businessDays} business days</strong> between {g.from} and {g.to}
              </li>
            ))}
            {gaps.length > 4 && (
              <li className="text-xs text-slate-500">and {gaps.length - 4} more</li>
            )}
          </ul>
        )}
      </section>

      {/* Every check, with its citation. */}
      <section className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm sm:p-6">
        <h2 className="mb-4 text-sm font-black uppercase tracking-widest text-slate-500">
          Every check, with the rule behind it
        </h2>
        <div className="space-y-2">
          {checks.map((c) => (
            <div key={c.id} className="flex items-start gap-3 rounded-xl border border-slate-200 p-4">
              {c.severity === "pass" ? (
                <CheckCircle2 className="mt-0.5 h-4 w-4 shrink-0 text-emerald-600" />
              ) : c.severity === "warn" ? (
                <AlertTriangle className="mt-0.5 h-4 w-4 shrink-0 text-amber-600" />
              ) : (
                <XCircle className="mt-0.5 h-4 w-4 shrink-0 text-rose-600" />
              )}
              <div className="min-w-0">
                <p className="text-sm font-black text-slate-900">{c.label}</p>
                <p className="mt-0.5 text-sm leading-relaxed text-slate-600">{c.detail}</p>
                <p className="mt-1 text-[11px] font-bold uppercase tracking-wide text-slate-400">
                  {c.authority} · {c.citation}
                  {c.violation ? ` · ${c.violation}` : ""}
                </p>
              </div>
            </div>
          ))}
        </div>
      </section>

      <div className="rounded-2xl border border-blue-200 bg-blue-50 p-6 text-center">
        <p className="text-sm font-black text-blue-950">This is a sketch, not your school.</p>
        <p className="mx-auto mt-2 max-w-xl text-sm leading-relaxed text-blue-900">
          What we build depends on your course mix, what you already run, and what you are trying to
          fix. The fastest way to find out what it would look like for you is a call.
        </p>
        <Link
          href="/texas-hybrid-barber-cosmetology-program#callback"
          className="mt-5 inline-flex items-center gap-2 rounded-xl bg-blue-600 px-6 py-3.5 text-sm font-black text-white transition-colors hover:bg-blue-700"
        >
          <PhoneCall className="h-4 w-4" />
          Request Callback or Demo
        </Link>
      </div>
    </div>
  );
}
