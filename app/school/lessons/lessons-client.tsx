"use client";

import { useState, useTransition } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { BookOpen, Eye, EyeOff, Loader2, Plus } from "lucide-react";
import { createLessonAction } from "./actions";

export interface LessonRow {
  id: string;
  title: string;
  summary: string | null;
  published: boolean;
  sectionCount: number;
  estimatedMinutes: number;
  blockLabel: string;
  programName: string;
}

export interface ProgramOption {
  id: string;
  name: string;
  blocks: { id: string; label: string; when: string }[];
}

/**
 * The lesson list.
 *
 * ONLY DISTANCE BLOCKS ARE OFFERED, and when a program has none the form says
 * so instead of showing an empty dropdown. A school whose timetable has no
 * online class has nothing to attach a lesson to, and that is a timetable
 * problem — telling them that is more useful than letting them fill in a form
 * that cannot be submitted.
 */
export function LessonsClient({
  rows,
  programs,
}: {
  rows: LessonRow[];
  programs: ProgramOption[];
}) {
  const router = useRouter();
  const [pending, startTransition] = useTransition();
  const [open, setOpen] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [f, setF] = useState({
    programId: programs[0]?.id ?? "",
    scheduleBlockId: programs[0]?.blocks[0]?.id ?? "",
    title: "",
    summary: "",
    estimatedMinutes: 60,
  });

  const program = programs.find((p) => p.id === f.programId);

  const submit = (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    startTransition(async () => {
      const res = await createLessonAction(f);
      if (res.ok && res.id) router.push(`/school/lessons/${res.id}`);
      else setError(res.error ?? "Could not create that lesson.");
    });
  };

  return (
    <div className="space-y-6">
      <section className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
        {!open ? (
          <button
            onClick={() => setOpen(true)}
            className="inline-flex items-center gap-2 rounded-xl bg-slate-900 px-5 py-2.5 text-sm font-black text-white hover:bg-slate-800"
          >
            <Plus className="h-4 w-4" />
            New lesson
          </button>
        ) : (
          <form onSubmit={submit} className="space-y-4">
            <h2 className="text-lg font-black text-slate-900">New lesson</h2>

            <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
              <select
                value={f.programId}
                onChange={(e) => {
                  const p = programs.find((x) => x.id === e.target.value);
                  setF({ ...f, programId: e.target.value, scheduleBlockId: p?.blocks[0]?.id ?? "" });
                }}
                className="rounded-xl border-2 border-slate-200 px-4 py-2.5 text-sm font-semibold outline-none focus:border-blue-500"
              >
                {programs.map((p) => <option key={p.id} value={p.id}>{p.name}</option>)}
              </select>

              {program && program.blocks.length > 0 ? (
                <select
                  value={f.scheduleBlockId}
                  onChange={(e) => setF({ ...f, scheduleBlockId: e.target.value })}
                  className="rounded-xl border-2 border-slate-200 px-4 py-2.5 text-sm font-semibold outline-none focus:border-blue-500"
                >
                  {program.blocks.map((b) => (
                    <option key={b.id} value={b.id}>{b.label} — {b.when}</option>
                  ))}
                </select>
              ) : (
                <p className="rounded-xl border-2 border-amber-200 bg-amber-50 px-4 py-2.5 text-xs font-bold leading-relaxed text-amber-900">
                  This program has no online class on its timetable, so there is nothing to attach a
                  lesson to. Add a distance block first.
                </p>
              )}

              <input
                required placeholder="Lesson title" value={f.title}
                onChange={(e) => setF({ ...f, title: e.target.value })}
                className="rounded-xl border-2 border-slate-200 px-4 py-2.5 text-sm font-semibold outline-none focus:border-blue-500 sm:col-span-2"
              />
              <input
                placeholder="One line describing it (optional)" value={f.summary}
                onChange={(e) => setF({ ...f, summary: e.target.value })}
                className="rounded-xl border-2 border-slate-200 px-4 py-2.5 text-sm font-semibold outline-none focus:border-blue-500 sm:col-span-2"
              />
              <label className="flex items-center gap-3 text-sm font-bold text-slate-600">
                About
                <input
                  type="number" min={5} max={600} value={f.estimatedMinutes}
                  onChange={(e) => setF({ ...f, estimatedMinutes: Number(e.target.value) })}
                  className="w-24 rounded-xl border-2 border-slate-200 px-3 py-2 text-sm font-semibold outline-none focus:border-blue-500"
                />
                minutes
              </label>
            </div>

            {error && <p className="text-sm font-bold text-rose-700">{error}</p>}
            <div className="flex gap-2">
              <button
                type="submit"
                disabled={pending || !f.scheduleBlockId}
                className="inline-flex items-center gap-2 rounded-xl bg-blue-600 px-5 py-2.5 text-sm font-black text-white hover:bg-blue-700 disabled:opacity-40"
              >
                {pending && <Loader2 className="h-4 w-4 animate-spin" />}
                Create and add sections
              </button>
              <button
                type="button" onClick={() => setOpen(false)}
                className="rounded-xl border-2 border-slate-200 px-5 py-2.5 text-sm font-black text-slate-600 hover:bg-slate-50"
              >
                Cancel
              </button>
            </div>
          </form>
        )}
      </section>

      {rows.length === 0 ? (
        <p className="rounded-2xl border border-slate-200 bg-white p-6 text-sm leading-relaxed text-slate-600">
          No lessons yet. Until there is at least one published lesson, the Monday online block has
          nothing in it — students can clock in at the door but have no way to earn distance hours.
        </p>
      ) : (
        <div className="space-y-3">
          {rows.map((r) => (
            <Link
              key={r.id}
              href={`/school/lessons/${r.id}`}
              className="flex flex-wrap items-start justify-between gap-3 rounded-2xl border border-slate-200 bg-white p-5 shadow-sm transition-colors hover:border-blue-300"
            >
              <div className="min-w-0">
                <h3 className="flex items-center gap-2 font-black text-slate-900">
                  <BookOpen className="h-4 w-4 text-blue-500" />
                  {r.title}
                </h3>
                {r.summary && <p className="mt-1 text-sm text-slate-600">{r.summary}</p>}
                <p className="mt-1.5 text-xs text-slate-500">
                  {r.programName} · {r.blockLabel} · {r.sectionCount}{" "}
                  {r.sectionCount === 1 ? "section" : "sections"} · about {r.estimatedMinutes} min
                </p>
              </div>
              <span
                className={`inline-flex shrink-0 items-center gap-1.5 rounded-full px-3 py-1 text-xs font-black ${
                  r.published ? "bg-emerald-100 text-emerald-800" : "bg-slate-100 text-slate-600"
                }`}
              >
                {r.published ? <Eye className="h-3 w-3" /> : <EyeOff className="h-3 w-3" />}
                {r.published ? "Live" : "Draft"}
              </span>
            </Link>
          ))}
        </div>
      )}
    </div>
  );
}
