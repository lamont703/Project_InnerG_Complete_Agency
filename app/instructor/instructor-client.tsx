"use client";

import { useMemo, useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { CheckCircle2, Loader2, PenLine, ShieldCheck } from "lucide-react";
import type { Participation } from "@/lib/school/learning";
import { claimInstructorAction, signAsSelfAction } from "./actions";

export interface QueueRow {
  punchId: string;
  studentName: string;
  studentId: string;
  date: string;
  window: string;
  minutes: number;
  blockLabel: string | null;
  ageDays: number;
  evidence: Participation;
}

const hm = (m: number) => `${Math.floor(m / 60)}h ${String(m % 60).padStart(2, "0")}m`;

const GRADE: Record<Participation["grade"], { label: string; className: string }> = {
  supported: { label: "supported", className: "bg-emerald-100 text-emerald-900" },
  thin: { label: "thin", className: "bg-amber-100 text-amber-900" },
  "no-coursework": { label: "no coursework", className: "bg-rose-100 text-rose-900" },
  "too-short": { label: "very short", className: "bg-slate-100 text-slate-600" },
};

export function ClaimInstructor({ presetToken }: { presetToken: string }) {
  const router = useRouter();
  const [pending, startTransition] = useTransition();
  const [value, setValue] = useState(presetToken);
  const [error, setError] = useState<string | null>(null);

  const submit = (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    let token = value.trim();
    const m = token.match(/[?&]claim=([^&\s]+)/);
    if (m) token = decodeURIComponent(m[1]);
    startTransition(async () => {
      const res = await claimInstructorAction(token);
      if (res.ok) router.refresh();
      else setError(res.error ?? "That did not work.");
    });
  };

  return (
    <div className="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm sm:p-8">
      <ShieldCheck className="h-8 w-8 text-blue-600" />
      <h1 className="mt-4 text-2xl font-black tracking-tight text-slate-950">
        Link your instructor record
      </h1>
      <p className="mt-3 text-sm leading-relaxed text-slate-600">
        You&apos;re signed in, but this account isn&apos;t connected to an instructor record yet.
        Paste the link your school sent you. Once it is linked, hours you sign are recorded as
        signed by you rather than asserted on your behalf.
      </p>
      <form onSubmit={submit} className="mt-6 space-y-3">
        <input
          autoFocus={!presetToken}
          value={value}
          onChange={(e) => setValue(e.target.value)}
          placeholder="Paste your link here"
          className="w-full rounded-xl border-2 border-slate-200 px-4 py-3 text-sm font-semibold outline-none focus:border-blue-500"
        />
        {error && <p className="text-sm font-bold text-rose-700">{error}</p>}
        <button
          type="submit"
          disabled={pending || !value.trim()}
          className="flex w-full items-center justify-center gap-2 rounded-xl bg-blue-600 px-5 py-3 text-sm font-black text-white hover:bg-blue-700 disabled:opacity-40"
        >
          {pending && <Loader2 className="h-4 w-4 animate-spin" />}
          Link my record
        </button>
      </form>
    </div>
  );
}

/**
 * An instructor's own sign-off queue.
 *
 * SCOPED TO THE CLASSES THEY TEACH. You sign for what you taught — an
 * instructor handed the whole school's queue is being asked to vouch for
 * sessions they were never in.
 *
 * NOTHING IS PRE-SELECTED, same as the admin queue. A page that arrives with
 * everything ticked and a Sign button turns a signature into one click of
 * agreement with something nobody read.
 */
export function InstructorQueue({
  name,
  rows,
  teachesNothing,
}: {
  name: string;
  rows: QueueRow[];
  teachesNothing: boolean;
}) {
  const router = useRouter();
  const [pending, startTransition] = useTransition();
  const [selected, setSelected] = useState<Set<string>>(new Set());
  const [error, setError] = useState<string | null>(null);
  const [signed, setSigned] = useState<number | null>(null);

  const groups = useMemo(() => {
    const m = new Map<string, QueueRow[]>();
    for (const r of rows) {
      const l = m.get(r.studentId);
      if (l) l.push(r); else m.set(r.studentId, [r]);
    }
    return [...m.values()];
  }, [rows]);

  const toggle = (id: string) =>
    setSelected((s) => {
      const n = new Set(s);
      n.has(id) ? n.delete(id) : n.add(id);
      return n;
    });

  const selectedMinutes = rows
    .filter((r) => selected.has(r.punchId))
    .reduce((n, r) => n + r.minutes, 0);

  const sign = () => {
    setError(null);
    startTransition(async () => {
      const res = await signAsSelfAction([...selected]);
      if (res.ok) { setSigned(res.signed ?? 0); setSelected(new Set()); router.refresh(); }
      else setError(res.error ?? "Could not record the signature.");
    });
  };

  if (teachesNothing) {
    return (
      <div className="rounded-2xl border-2 border-amber-200 bg-amber-50 p-6">
        <p className="font-black text-amber-900">You&apos;re not down to teach any classes yet.</p>
        <p className="mt-1.5 max-w-2xl text-sm leading-relaxed text-amber-900">
          Your queue shows the online sessions for classes on your timetable, so until the school
          assigns you one there is nothing here to sign. Ask them to put you on the timetable.
        </p>
      </div>
    );
  }

  return (
    <div className="space-y-5">
      <p className="flex items-center gap-2 rounded-xl border border-emerald-200 bg-emerald-50 px-4 py-3 text-sm font-bold text-emerald-900">
        <ShieldCheck className="h-4 w-4" />
        Signed in as {name} — anything you sign here is recorded as yours.
      </p>

      {signed !== null && (
        <div className="rounded-2xl border-2 border-emerald-300 bg-emerald-50 p-5">
          <p className="flex items-center gap-2 font-black text-emerald-900">
            <CheckCircle2 className="h-5 w-5" />
            {signed} {signed === 1 ? "session" : "sessions"} signed.
          </p>
        </div>
      )}

      {rows.length === 0 ? (
        <div className="rounded-2xl border border-emerald-200 bg-emerald-50 p-6">
          <p className="font-black text-emerald-900">Nothing waiting.</p>
          <p className="mt-1.5 text-sm leading-relaxed text-emerald-800">
            Every finished online session in your classes has your signature against it. New ones
            appear as soon as a student clocks out.
          </p>
        </div>
      ) : (
        <>
          {groups.map((g) => (
            <section key={g[0].studentId} className="rounded-2xl border border-slate-200 bg-white shadow-sm">
              <header className="border-b border-slate-100 px-5 py-4">
                <p className="font-black text-slate-900">{g[0].studentName}</p>
                <p className="mt-0.5 text-xs text-slate-500">
                  {g.length} {g.length === 1 ? "session" : "sessions"} ·{" "}
                  {hm(g.reduce((n, r) => n + r.minutes, 0))} unsigned
                </p>
              </header>
              <ul className="divide-y divide-slate-100">
                {g.map((r) => {
                  const grade = GRADE[r.evidence.grade];
                  return (
                    <li key={r.punchId}>
                      <label className="flex cursor-pointer items-start gap-3 px-5 py-3 hover:bg-slate-50">
                        <input
                          type="checkbox"
                          checked={selected.has(r.punchId)}
                          onChange={() => toggle(r.punchId)}
                          className="mt-1 h-4 w-4 shrink-0 rounded border-slate-300"
                        />
                        <span className="min-w-0 flex-1">
                          <span className="block text-sm font-bold tabular-nums text-slate-900">
                            {r.date} · {r.window}
                            <span className="ml-2">{hm(r.minutes)}</span>
                          </span>
                          <span className="mt-1 flex flex-wrap items-center gap-x-2 gap-y-1 text-[11px] text-slate-500">
                            <span className={`rounded-full px-2 py-0.5 font-black ${grade.className}`}>
                              {grade.label}
                            </span>
                            <span className="tabular-nums">
                              {hm(r.evidence.engagedMinutes)} active of {hm(r.evidence.clockedMinutes)}
                              {r.evidence.engagementRatio !== null &&
                                ` (${Math.round(r.evidence.engagementRatio * 100)}%)`}
                            </span>
                            <span>·</span>
                            <span className="tabular-nums">
                              {r.evidence.sectionsWorked > 0
                                ? `${r.evidence.sectionsWorked} worked`
                                : "no section recorded"}
                              {r.evidence.sectionsCompleted > 0 && `, ${r.evidence.sectionsCompleted} new`}
                            </span>
                            {r.evidence.checksAnswered > 0 && (
                              <>
                                <span>·</span>
                                <span className="tabular-nums">
                                  {r.evidence.checksCorrect}/{r.evidence.checksAnswered} checks right
                                </span>
                              </>
                            )}
                          </span>
                        </span>
                        {r.ageDays >= 14 && (
                          <span className="shrink-0 rounded-full bg-amber-100 px-2 py-0.5 text-[11px] font-black text-amber-900">
                            {r.ageDays}d
                          </span>
                        )}
                      </label>
                    </li>
                  );
                })}
              </ul>
            </section>
          ))}

          {error && <p className="text-sm font-bold text-rose-700">{error}</p>}

          <div className="sticky bottom-4 z-10 flex flex-wrap items-center gap-3 rounded-2xl bg-slate-900 px-5 py-4 shadow-xl">
            <p className="flex-1 text-sm font-bold text-white">
              {selected.size === 0
                ? "Nothing selected."
                : `${selected.size} selected · ${hm(selectedMinutes)}`}
            </p>
            <button
              onClick={sign}
              disabled={pending || selected.size === 0}
              className="inline-flex items-center gap-2 rounded-xl bg-white px-5 py-2.5 text-sm font-black text-slate-900 hover:bg-slate-100 disabled:opacity-40"
            >
              {pending ? <Loader2 className="h-4 w-4 animate-spin" /> : <PenLine className="h-4 w-4" />}
              Sign for these hours
            </button>
          </div>
        </>
      )}
    </div>
  );
}
