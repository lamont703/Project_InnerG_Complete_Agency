"use client";

import { useMemo, useState, useTransition } from "react";
import Link from "next/link";
import { CheckCircle2, Loader2, PenLine, Plus, ShieldAlert } from "lucide-react";
import type { Participation } from "@/lib/school/learning";
import { addInstructorAction, validateAction } from "./actions";

export interface QueueRow {
  punchId: string;
  studentId: string;
  studentName: string;
  date: string;
  window: string;
  minutes: number;
  segment: string;
  blockLabel: string | null;
  ageDays: number;
  evidence: Participation;
}

export interface InstructorOption {
  id: string;
  name: string;
  licenseNumber: string | null;
}

const hm = (m: number) => `${Math.floor(m / 60)}h ${String(m % 60).padStart(2, "0")}m`;

const GRADE: Record<Participation["grade"], { label: string; className: string }> = {
  supported:      { label: "supported",     className: "bg-emerald-100 text-emerald-900" },
  thin:           { label: "thin",          className: "bg-amber-100 text-amber-900" },
  "no-coursework":{ label: "no coursework", className: "bg-rose-100 text-rose-900" },
  "too-short":    { label: "very short",    className: "bg-slate-100 text-slate-600" },
};

/**
 * What actually happened in a session, under the times.
 *
 * SHOWS BOTH NUMBERS AND NEVER MERGES THEM. The punch is the hour record and
 * stays it; the engaged minutes are how much of that hour had somebody at the
 * keyboard. An instructor who only saw one of them would be signing blind — and
 * one who saw a single blended figure would be signing for a number nobody
 * measured.
 *
 * The grade is a school policy, not a regulator's threshold, and the queue says
 * so above. It sorts attention; it decides nothing.
 */
function Evidence({ e }: { e: Participation }) {
  const g = GRADE[e.grade];
  return (
    <span className="mt-1 flex flex-wrap items-center gap-x-2 gap-y-1 text-[11px] text-slate-500">
      <span className={`rounded-full px-2 py-0.5 font-black ${g.className}`}>{g.label}</span>
      <span className="tabular-nums">
        {hm(e.engagedMinutes)} active of {hm(e.clockedMinutes)}
        {e.engagementRatio !== null && ` (${Math.round(e.engagementRatio * 100)}%)`}
      </span>
      <span>·</span>
      {/*
        WORKED IS THE PARTICIPATION FIGURE and completed is the progress one.
        Shown separately because they answer different questions: a student
        revising a lesson they finished last week works everything and completes
        nothing, and collapsing the two into one number made that session look
        empty. "4 worked" and "0 new" is the honest reading.
      */}
      <span className="tabular-nums">
        {e.sectionsWorked > 0
          ? `${e.sectionsWorked} ${e.sectionsWorked === 1 ? "section" : "sections"} worked`
          : "no section recorded"}
        {e.sectionsCompleted > 0 && `, ${e.sectionsCompleted} new`}
      </span>
      {e.checksAnswered > 0 && (
        <>
          <span>·</span>
          <span className="tabular-nums">
            {e.checksCorrect}/{e.checksAnswered} checks right
          </span>
        </>
      )}
    </span>
  );
}

/**
 * The distance-hours signature queue.
 *
 * GROUPED BY STUDENT, NOT BY DATE. An instructor signing off remembers a
 * person — "did Marcus actually turn up to Monday theory" is a question they
 * can answer; "was there participation at 18:00 on the 12th" is not.
 *
 * SELECTION IS EXPLICIT AND STARTS EMPTY. A queue that arrives with everything
 * pre-ticked and a Sign button turns a compliance signature into one click of
 * agreement with something nobody read. Selecting a whole student is one tap
 * for the common case; selecting nothing is the default.
 *
 * OLDEST FIRST, AND THE AGE IS SHOWN. An hour signed for six weeks late is
 * signed by somebody who cannot possibly remember it, and the number saying so
 * is the strongest argument the page can make for signing weekly.
 */
export function ValidationClient({
  rows,
  instructors,
}: {
  rows: QueueRow[];
  instructors: InstructorOption[];
}) {
  const [pending, startTransition] = useTransition();
  const [selected, setSelected] = useState<Set<string>>(new Set());
  const [instructorId, setInstructorId] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [signed, setSigned] = useState<number | null>(null);
  const [addingOpen, setAddingOpen] = useState(false);
  const [nf, setNf] = useState({ name: "", licenseNumber: "", email: "" });

  const groups = useMemo(() => {
    const m = new Map<string, QueueRow[]>();
    for (const r of rows) {
      const list = m.get(r.studentId);
      if (list) list.push(r);
      else m.set(r.studentId, [r]);
    }
    return [...m.values()];
  }, [rows]);

  const toggle = (id: string) =>
    setSelected((s) => {
      const next = new Set(s);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });

  const toggleGroup = (g: QueueRow[]) =>
    setSelected((s) => {
      const next = new Set(s);
      const all = g.every((r) => next.has(r.punchId));
      for (const r of g) {
        if (all) next.delete(r.punchId);
        else next.add(r.punchId);
      }
      return next;
    });

  const selectedMinutes = rows
    .filter((r) => selected.has(r.punchId))
    .reduce((n, r) => n + r.minutes, 0);

  const sign = () => {
    setError(null);
    startTransition(async () => {
      const res = await validateAction([...selected], instructorId);
      if (res.ok) {
        setSigned(res.signed ?? 0);
        setSelected(new Set());
      } else setError(res.error ?? "Could not record the signature.");
    });
  };

  const addPerson = (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    startTransition(async () => {
      const res = await addInstructorAction(nf);
      if (res.ok) {
        setNf({ name: "", licenseNumber: "", email: "" });
        setAddingOpen(false);
      } else setError(res.error ?? "Could not add that instructor.");
    });
  };

  if (instructors.length === 0) {
    return (
      <section className="rounded-2xl border-2 border-amber-200 bg-amber-50 p-6">
        <h2 className="flex items-center gap-2 text-lg font-black text-amber-900">
          <ShieldAlert className="h-5 w-5" />
          No instructors on file yet
        </h2>
        <p className="mt-2 max-w-2xl text-sm leading-relaxed text-amber-900">
          Distance hours are signed for by an instructor, so there has to be one to sign. Nobody
          was invented to fill this list — an instructor record names a real person with a real
          TDLR license, and a fabricated one would sit against every signature that follows.
        </p>
        <form onSubmit={addPerson} className="mt-5 grid max-w-2xl grid-cols-1 gap-3 sm:grid-cols-3">
          <input
            required
            placeholder="Full name"
            value={nf.name}
            onChange={(e) => setNf({ ...nf, name: e.target.value })}
            className="rounded-xl border-2 border-amber-200 bg-white px-4 py-2.5 text-sm font-semibold outline-none focus:border-amber-400"
          />
          <input
            placeholder="TDLR license no."
            value={nf.licenseNumber}
            onChange={(e) => setNf({ ...nf, licenseNumber: e.target.value })}
            className="rounded-xl border-2 border-amber-200 bg-white px-4 py-2.5 text-sm font-semibold outline-none focus:border-amber-400"
          />
          <input
            type="email"
            placeholder="Email"
            value={nf.email}
            onChange={(e) => setNf({ ...nf, email: e.target.value })}
            className="rounded-xl border-2 border-amber-200 bg-white px-4 py-2.5 text-sm font-semibold outline-none focus:border-amber-400"
          />
          {error && <p className="text-sm font-bold text-rose-700 sm:col-span-3">{error}</p>}
          <button
            type="submit"
            disabled={pending}
            className="inline-flex items-center justify-center gap-2 rounded-xl bg-amber-600 px-5 py-2.5 text-sm font-black text-white hover:bg-amber-700 disabled:opacity-50 sm:col-span-3 sm:justify-self-start"
          >
            {pending ? <Loader2 className="h-4 w-4 animate-spin" /> : <Plus className="h-4 w-4" />}
            Add this instructor
          </button>
        </form>
      </section>
    );
  }

  return (
    <div className="space-y-6">
      {signed !== null && (
        <div className="rounded-2xl border-2 border-emerald-300 bg-emerald-50 p-5">
          <p className="flex items-center gap-2 font-black text-emerald-900">
            <CheckCircle2 className="h-5 w-5" />
            {signed} {signed === 1 ? "session" : "sessions"} signed.
          </p>
          <p className="mt-1.5 text-sm leading-relaxed text-emerald-800">
            The signature is on the punch itself and shows on the student&apos;s ledger. It cannot
            be overwritten by a later one — the first signature given is the one that stands.
          </p>
        </div>
      )}

      {/* Who is signing. Above the queue on purpose: it is the question the
          page is actually asking, and a name picked after ticking fifty boxes
          is a name picked in a hurry. */}
      <section className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
        <label className="text-[11px] font-black uppercase tracking-widest text-slate-500">
          Signing as
        </label>
        <div className="mt-2 flex flex-wrap items-center gap-3">
          <select
            value={instructorId}
            onChange={(e) => setInstructorId(e.target.value)}
            className="min-w-[16rem] rounded-xl border-2 border-slate-200 px-4 py-2.5 text-sm font-bold outline-none focus:border-blue-500"
          >
            <option value="">Choose an instructor…</option>
            {instructors.map((i) => (
              <option key={i.id} value={i.id}>
                {i.name}
                {i.licenseNumber ? ` · ${i.licenseNumber}` : ""}
              </option>
            ))}
          </select>
          <button
            onClick={() => setAddingOpen((v) => !v)}
            className="inline-flex items-center gap-1.5 rounded-lg border border-slate-200 px-3 py-2 text-xs font-bold text-slate-600 hover:bg-slate-50"
          >
            <Plus className="h-3.5 w-3.5" />
            Add an instructor
          </button>
        </div>
        <p className="mt-2 max-w-2xl text-xs leading-relaxed text-slate-500">
          This records what the school asserts, not what the system proved. There are no separate
          instructor logins yet, so anyone with access to this console can sign as anyone on the
          list — worth knowing before treating a signature here as independent evidence.
        </p>

        {addingOpen && (
          <form onSubmit={addPerson} className="mt-4 grid grid-cols-1 gap-3 border-t border-slate-100 pt-4 sm:grid-cols-3">
            <input
              required
              placeholder="Full name"
              value={nf.name}
              onChange={(e) => setNf({ ...nf, name: e.target.value })}
              className="rounded-xl border-2 border-slate-200 px-4 py-2.5 text-sm font-semibold outline-none focus:border-blue-500"
            />
            <input
              placeholder="TDLR license no."
              value={nf.licenseNumber}
              onChange={(e) => setNf({ ...nf, licenseNumber: e.target.value })}
              className="rounded-xl border-2 border-slate-200 px-4 py-2.5 text-sm font-semibold outline-none focus:border-blue-500"
            />
            <input
              type="email"
              placeholder="Email"
              value={nf.email}
              onChange={(e) => setNf({ ...nf, email: e.target.value })}
              className="rounded-xl border-2 border-slate-200 px-4 py-2.5 text-sm font-semibold outline-none focus:border-blue-500"
            />
            <button
              type="submit"
              disabled={pending}
              className="inline-flex items-center justify-center gap-2 rounded-xl bg-slate-900 px-5 py-2.5 text-sm font-black text-white hover:bg-slate-800 disabled:opacity-50 sm:col-span-3 sm:justify-self-start"
            >
              {pending && <Loader2 className="h-4 w-4 animate-spin" />}
              Add
            </button>
          </form>
        )}
      </section>

      {rows.length === 0 ? (
        <section className="rounded-2xl border border-emerald-200 bg-emerald-50 p-6">
          <p className="flex items-center gap-2 font-black text-emerald-900">
            <CheckCircle2 className="h-5 w-5" />
            Nothing waiting.
          </p>
          <p className="mt-1.5 max-w-2xl text-sm leading-relaxed text-emerald-800">
            Every finished online session has a signature against it. New ones land here as soon as
            a student clocks out of a distance block.
          </p>
        </section>
      ) : (
        <>
          {groups.map((g) => {
            const all = g.every((r) => selected.has(r.punchId));
            const total = g.reduce((n, r) => n + r.minutes, 0);
            const oldest = Math.max(...g.map((r) => r.ageDays));
            return (
              <section key={g[0].studentId} className="rounded-2xl border border-slate-200 bg-white shadow-sm">
                <header className="flex flex-wrap items-center justify-between gap-3 border-b border-slate-100 px-5 py-4">
                  <div>
                    <Link
                      href={`/school/students/${g[0].studentId}`}
                      className="text-base font-black text-slate-900 hover:text-blue-700 hover:underline"
                    >
                      {g[0].studentName}
                    </Link>
                    <p className="mt-0.5 text-xs text-slate-500">
                      {g.length} {g.length === 1 ? "session" : "sessions"} · {hm(total)} unsigned ·
                      oldest {oldest === 0 ? "today" : `${oldest} days old`}
                    </p>
                  </div>
                  <button
                    onClick={() => toggleGroup(g)}
                    className="rounded-lg border border-slate-200 px-3 py-1.5 text-xs font-bold text-slate-600 hover:bg-slate-50"
                  >
                    {all ? "Clear" : "Select all"}
                  </button>
                </header>
                <ul className="divide-y divide-slate-100">
                  {g.map((r) => (
                    <li key={r.punchId}>
                      <label className="flex cursor-pointer items-center gap-3 px-5 py-3 hover:bg-slate-50">
                        <input
                          type="checkbox"
                          checked={selected.has(r.punchId)}
                          onChange={() => toggle(r.punchId)}
                          className="h-4 w-4 shrink-0 rounded border-slate-300"
                        />
                        <span className="min-w-0 flex-1 text-sm">
                          <span className="font-bold tabular-nums text-slate-900">
                            {r.date} · {r.window}
                          </span>
                          <span className="ml-2 font-bold tabular-nums text-slate-700">{hm(r.minutes)}</span>
                          <span className="ml-2 text-xs text-slate-500">
                            {r.segment} theory{r.blockLabel ? ` · ${r.blockLabel}` : ""}
                          </span>
                          <Evidence e={r.evidence} />
                        </span>
                        {r.ageDays >= 14 && (
                          <span className="shrink-0 rounded-full bg-amber-100 px-2 py-0.5 text-[11px] font-black text-amber-900">
                            {r.ageDays}d
                          </span>
                        )}
                      </label>
                    </li>
                  ))}
                </ul>
              </section>
            );
          })}

          {error && <p className="text-sm font-bold text-rose-700">{error}</p>}

          {/* Sticky, because the queue is long and the action belongs where the
              hands are, not scrolled past at the bottom. */}
          <div className="sticky bottom-4 z-10 flex flex-wrap items-center gap-3 rounded-2xl border-2 border-slate-900 bg-slate-900 px-5 py-4 shadow-xl">
            <p className="flex-1 text-sm font-bold text-white">
              {selected.size === 0
                ? "Nothing selected."
                : `${selected.size} selected · ${hm(selectedMinutes)}`}
            </p>
            <button
              onClick={sign}
              disabled={pending || selected.size === 0 || !instructorId}
              className="inline-flex items-center gap-2 rounded-xl bg-white px-5 py-2.5 text-sm font-black text-slate-900 hover:bg-slate-100 disabled:opacity-40"
            >
              {pending ? <Loader2 className="h-4 w-4 animate-spin" /> : <PenLine className="h-4 w-4" />}
              {instructorId ? "Sign for these hours" : "Choose who is signing"}
            </button>
          </div>
        </>
      )}
    </div>
  );
}
