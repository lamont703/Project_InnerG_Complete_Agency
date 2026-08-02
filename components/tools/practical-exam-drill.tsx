"use client";

import { useState } from "react";
import { Clock, CheckCircle2, Circle, RotateCcw, AlertTriangle } from "lucide-react";
import type { SpecialtyExam } from "@/lib/texas-specialty-exams";
import { formatDuration } from "@/lib/texas-specialty-exams";

/**
 * A drill built from the exam's own scoring rubric.
 *
 * The barber and cosmetology pages carry a written practice deck. These four
 * specialties have no question bank, and writing plausible licensure questions
 * would be inventing exam content — so this tool does something different and
 * honest: it hands the candidate the ACTUAL scored criteria, in the order an
 * evaluator marks them, with the real per-section time limits, and lets them
 * tick through it as a rehearsal.
 *
 * Every line is transcribed from the Candidate Information Bulletin. Nothing is
 * generated. A candidate can check it against their own copy, which is the
 * point — the value here is completeness and order, not novelty.
 *
 * The running score is the real one: 1 point per criterion, 70% to pass.
 */
export function PracticalExamDrill({ exam }: { exam: SpecialtyExam }) {
  const [done, setDone] = useState<Set<string>>(new Set());
  const [openSection, setOpenSection] = useState<number>(0);

  const total = exam.sections.reduce((n, s) => n + s.procedure.length + s.safety.length, 0);
  const earned = done.size;
  const pct = total ? (earned / total) * 100 : 0;
  const passing = earned >= exam.passPoints;

  const toggle = (id: string) =>
    setDone((prev) => {
      const next = new Set(prev);
      next.has(id) ? next.delete(id) : next.add(id);
      return next;
    });

  return (
    <section className="mb-16">
      <div className="mb-6">
        <span className="inline-flex items-center gap-1.5 text-[10px] font-black uppercase tracking-widest text-indigo-700 bg-indigo-50 border border-indigo-100 rounded-full px-3 py-1 mb-3">
          Free practical drill
        </span>
        <h2 className="text-2xl font-black tracking-tight text-slate-900 mb-2">
          Run the {exam.label.toLowerCase()} practical, criterion by criterion
        </h2>
        <p className="text-slate-600 leading-relaxed max-w-2xl">
          Every item an evaluator marks, in the order they mark it, with the real time limit for each
          section. Work through it the way you will on the day — {total} scored criteria, {exam.passPoints}{" "}
          needed to pass.
        </p>
      </div>

      <div className="sticky top-20 z-10 mb-5 rounded-2xl border border-slate-200 bg-white/95 backdrop-blur px-5 py-4 shadow-sm">
        <div className="flex items-center justify-between gap-4 mb-2">
          <div>
            <p className="text-2xl font-black tabular-nums text-slate-900">
              {earned}
              <span className="text-base font-bold text-slate-400"> / {total}</span>
            </p>
            <p className="text-xs font-semibold text-slate-500">
              {passing ? "Above the passing mark" : `${Math.max(0, exam.passPoints - earned)} more to pass`}
            </p>
          </div>
          <button
            onClick={() => setDone(new Set())}
            className="inline-flex items-center gap-1.5 rounded-lg border border-slate-200 px-3 py-1.5 text-xs font-bold text-slate-600 hover:bg-slate-50"
          >
            <RotateCcw className="h-3 w-3" />
            Reset
          </button>
        </div>
        <div className="h-2 w-full overflow-hidden rounded-full bg-slate-100">
          <div
            className={`h-full rounded-full transition-all ${passing ? "bg-emerald-500" : "bg-indigo-500"}`}
            style={{ width: `${pct}%` }}
          />
        </div>
      </div>

      <div className="space-y-3">
        {exam.sections.map((section, i) => {
          const items = [
            ...section.procedure.map((t, n) => ({ id: `${i}-p-${n}`, text: t, kind: "Procedure" as const })),
            ...section.safety.map((t, n) => ({ id: `${i}-s-${n}`, text: t, kind: "Safety" as const })),
          ];
          const sectionDone = items.filter((it) => done.has(it.id)).length;
          const open = openSection === i;
          return (
            <div key={section.name} className="overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-sm">
              <button
                onClick={() => setOpenSection(open ? -1 : i)}
                className="flex w-full items-center justify-between gap-3 px-5 py-4 text-left hover:bg-slate-50"
                aria-expanded={open}
              >
                <span className="min-w-0">
                  <span className="block text-sm font-black text-slate-900">
                    {i + 1}. {section.name}
                  </span>
                  <span className="block text-xs text-slate-500">
                    {sectionDone} of {items.length} criteria
                  </span>
                </span>
                <span className="inline-flex shrink-0 items-center gap-1.5 whitespace-nowrap rounded-full border border-indigo-100 bg-indigo-50 px-2.5 py-0.5 text-xs font-bold text-indigo-700">
                  <Clock className="h-3 w-3" />
                  {section.minutes} min
                </span>
              </button>

              {open && (
                <ul className="border-t border-slate-100 px-5 py-3">
                  {items.map((it) => {
                    const checked = done.has(it.id);
                    return (
                      <li key={it.id}>
                        <button
                          onClick={() => toggle(it.id)}
                          className="flex w-full items-start gap-2.5 py-2 text-left"
                          aria-pressed={checked}
                        >
                          {checked ? (
                            <CheckCircle2 className="mt-0.5 h-4 w-4 shrink-0 text-emerald-600" />
                          ) : (
                            <Circle className="mt-0.5 h-4 w-4 shrink-0 text-slate-300" />
                          )}
                          <span className={`text-sm leading-relaxed ${checked ? "text-slate-400 line-through" : "text-slate-700"}`}>
                            {it.text}
                            <span className="ml-2 text-[10px] font-black uppercase tracking-wider text-slate-400">
                              {it.kind}
                            </span>
                          </span>
                        </button>
                      </li>
                    );
                  })}
                </ul>
              )}
            </div>
          );
        })}
      </div>

      <p className="mt-5 flex items-start gap-2 rounded-2xl border border-amber-200 bg-amber-50 px-5 py-4 text-sm leading-relaxed text-amber-900">
        <AlertTriangle className="mt-0.5 h-4 w-4 shrink-0" />
        <span>
          Criteria must be performed in this order to score. The {formatDuration(exam.practicalMinutes)}{" "}
          total includes setup and cleanup, and you cannot leave the exam area once you have signed in.
          Transcribed from {exam.source} — confirm against your own bulletin before your exam date.
        </span>
      </p>
    </section>
  );
}
