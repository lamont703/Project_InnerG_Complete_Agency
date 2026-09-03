"use client";

import { useState, useTransition } from "react";
import Link from "next/link";
import { CheckCircle2, Loader2, Radio, UserPlus } from "lucide-react";
import { enrollStudentAction } from "./actions";

export interface RosterRow {
  id: string;
  name: string;
  clockCode: string;
  programName: string;
  status: string;
  hours: number;
  programHours: number;
  coreDistanceHours: number;
  coreDistanceCap: number;
  onClockSince: string | null;
}

/**
 * The roster, as a front desk uses it.
 *
 * WHO IS ON THE CLOCK RIGHT NOW IS THE FIRST THING SHOWN, above totals and
 * progress. An administrator opening this at 10am is almost always answering
 * "is everyone in?" — the cumulative figures matter at the end of a term, and
 * the live one matters every single morning.
 *
 * DISTANCE HEADROOM SITS NEXT TO PROGRESS because they are read together. A
 * student at 60% of their program with 12 core distance hours left is a
 * scheduling problem this week, and a school that only sees the 60% finds out
 * about it when the kiosk starts refusing people.
 */

const STATUS: Record<string, string> = {
  active: "bg-emerald-50 text-emerald-800 border-emerald-200",
  on_leave: "bg-amber-50 text-amber-900 border-amber-200",
  withdrawn: "bg-slate-100 text-slate-600 border-slate-200",
  graduated: "bg-sky-50 text-sky-800 border-sky-200",
};

function since(iso: string): string {
  const mins = Math.max(0, Math.round((Date.now() - new Date(iso).getTime()) / 60000));
  return `${Math.floor(mins / 60)}h ${mins % 60}m`;
}

export function RosterClient({
  rows,
  programs,
}: {
  rows: RosterRow[];
  programs: { id: string; name: string }[];
}) {
  const [pending, startTransition] = useTransition();
  const [open, setOpen] = useState(false);
  const [issued, setIssued] = useState<{ name: string; code: string; claimUrl: string | null } | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [f, setF] = useState({ programId: programs[0]?.id ?? "", firstName: "", lastName: "", email: "", phone: "" });

  const onClock = rows.filter((r) => r.onClockSince);

  const submit = (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    startTransition(async () => {
      const res = await enrollStudentAction(f);
      if (res.ok && res.clockCode) {
        setIssued({
          name: `${f.firstName} ${f.lastName}`.trim(),
          code: res.clockCode,
          claimUrl: res.claimToken ? `${window.location.origin}/student?claim=${res.claimToken}` : null,
        });
        setF({ ...f, firstName: "", lastName: "", email: "", phone: "" });
        setOpen(false);
      } else setError(res.error ?? "Could not enroll.");
    });
  };

  return (
    <div className="space-y-6">
      {/* On the clock now */}
      <section className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
        <h2 className="mb-3 flex items-center gap-2 text-sm font-black uppercase tracking-widest text-slate-500">
          <Radio className="h-4 w-4 text-emerald-500" />
          On the clock now — {onClock.length}
        </h2>
        {onClock.length === 0 ? (
          <p className="text-sm text-slate-500">Nobody is clocked in.</p>
        ) : (
          <div className="flex flex-wrap gap-2">
            {onClock.map((r) => (
              <span key={r.id} className="rounded-full border border-emerald-200 bg-emerald-50 px-3 py-1.5 text-sm font-bold text-emerald-800">
                {r.name} · {since(r.onClockSince!)}
              </span>
            ))}
          </div>
        )}
      </section>

      {issued && (
        <div className="rounded-2xl border-2 border-emerald-300 bg-emerald-50 p-5">
          <p className="font-black text-emerald-900">{issued.name} is enrolled.</p>
          <p className="mt-2 text-sm text-emerald-800">
            Their clock code is{" "}
            <span className="rounded-lg bg-white px-2.5 py-1 font-mono text-lg font-black tracking-widest text-emerald-900">
              {issued.code}
            </span>
          </p>
          {/* Shown once, on purpose: it is a credential, and a list of every
              student's code sitting on a screen at the front desk is the least
              secure place it could live. */}
          <p className="mt-2 text-xs leading-relaxed text-emerald-700">
            Write it down or give it to them now — this is the only time it is shown here.
          </p>

          {/* Two credentials, two jobs, and saying which is which here saves a
              student trying their four-digit code on the website and a member of
              staff concluding the site is broken. */}
          {issued.claimUrl && (
            <div className="mt-4 border-t border-emerald-200 pt-4">
              <p className="text-sm font-black text-emerald-900">And their account link</p>
              <p className="mt-1 text-xs leading-relaxed text-emerald-800">
                Text or email this to them. It sets up their student account so they can see their
                own hours and work through the online lessons. The clock code above is only for the
                screen at the door.
              </p>
              <code className="mt-2 block overflow-x-auto rounded-lg bg-white px-3 py-2 text-xs text-emerald-900">
                {issued.claimUrl}
              </code>
              <p className="mt-2 text-xs text-emerald-700">
                It is on their student page too, if you need it again.
              </p>
            </div>
          )}
        </div>
      )}

      {/* Enroll */}
      <section className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
        {!open ? (
          <button
            onClick={() => { setOpen(true); setIssued(null); }}
            className="inline-flex items-center gap-2 rounded-xl bg-slate-900 px-5 py-2.5 text-sm font-black text-white hover:bg-slate-800"
          >
            <UserPlus className="h-4 w-4" />
            Enroll a student
          </button>
        ) : (
          <form onSubmit={submit} className="space-y-4">
            <h2 className="text-lg font-black text-slate-900">Enroll a student</h2>
            <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
              <input required placeholder="First name" value={f.firstName}
                onChange={(e) => setF({ ...f, firstName: e.target.value })}
                className="rounded-xl border-2 border-slate-200 px-4 py-2.5 text-sm font-semibold outline-none focus:border-blue-500" />
              <input required placeholder="Last name" value={f.lastName}
                onChange={(e) => setF({ ...f, lastName: e.target.value })}
                className="rounded-xl border-2 border-slate-200 px-4 py-2.5 text-sm font-semibold outline-none focus:border-blue-500" />
              <input type="email" placeholder="Email (optional)" value={f.email}
                onChange={(e) => setF({ ...f, email: e.target.value })}
                className="rounded-xl border-2 border-slate-200 px-4 py-2.5 text-sm font-semibold outline-none focus:border-blue-500" />
              <input type="tel" placeholder="Phone (optional)" value={f.phone}
                onChange={(e) => setF({ ...f, phone: e.target.value })}
                className="rounded-xl border-2 border-slate-200 px-4 py-2.5 text-sm font-semibold outline-none focus:border-blue-500" />
              <select value={f.programId} onChange={(e) => setF({ ...f, programId: e.target.value })}
                className="rounded-xl border-2 border-slate-200 px-4 py-2.5 text-sm font-semibold outline-none focus:border-blue-500 sm:col-span-2">
                {programs.map((p) => <option key={p.id} value={p.id}>{p.name}</option>)}
              </select>
            </div>
            {error && <p className="text-sm font-semibold text-rose-700">{error}</p>}
            <div className="flex gap-2">
              <button type="submit" disabled={pending}
                className="inline-flex items-center gap-2 rounded-xl bg-blue-600 px-5 py-2.5 text-sm font-black text-white hover:bg-blue-700 disabled:opacity-50">
                {pending && <Loader2 className="h-4 w-4 animate-spin" />}
                Enroll and issue a code
              </button>
              <button type="button" onClick={() => setOpen(false)}
                className="rounded-xl border-2 border-slate-200 px-5 py-2.5 text-sm font-black text-slate-600 hover:bg-slate-50">
                Cancel
              </button>
            </div>
          </form>
        )}
      </section>

      {/* The roster */}
      <section className="rounded-2xl border border-slate-200 bg-white shadow-sm">
        {rows.length === 0 ? (
          <p className="p-6 text-sm leading-relaxed text-slate-600">
            Nobody is enrolled yet. That is the correct state for a school that has not opened —
            a student record is a real person, so none were invented to fill this table.
          </p>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left text-sm">
              <thead className="border-b border-slate-200 bg-slate-50">
                <tr>
                  <th className="px-5 py-3 font-black text-slate-700">Student</th>
                  <th className="px-5 py-3 font-black text-slate-700">Program</th>
                  <th className="px-5 py-3 text-right font-black text-slate-700">Hours</th>
                  <th className="px-5 py-3 text-right font-black text-slate-700">Core distance</th>
                  <th className="px-5 py-3 font-black text-slate-700">Status</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 tabular-nums">
                {rows.map((r) => {
                  const pct = Math.round((r.hours / r.programHours) * 100);
                  const left = r.coreDistanceCap - r.coreDistanceHours;
                  return (
                    <tr key={r.id} className="hover:bg-slate-50">
                      <td className="px-5 py-3">
                        <Link href={`/school/students/${r.id}`} className="font-black text-slate-900 hover:text-blue-700 hover:underline">
                          {r.name}
                        </Link>
                        {r.onClockSince && (
                          <span className="ml-2 inline-flex items-center gap-1 text-[11px] font-black text-emerald-700">
                            <Radio className="h-3 w-3" /> in
                          </span>
                        )}
                      </td>
                      <td className="px-5 py-3 text-slate-600">{r.programName}</td>
                      <td className="px-5 py-3 text-right text-slate-900">
                        {r.hours.toFixed(1)}
                        <span className="text-slate-400"> / {r.programHours}</span>
                        <span className="ml-2 text-xs text-slate-500">{pct}%</span>
                      </td>
                      <td className={`px-5 py-3 text-right font-bold ${left <= 0 ? "text-rose-700" : left < 40 ? "text-amber-700" : "text-slate-600"}`}>
                        {r.coreDistanceHours.toFixed(1)}
                        <span className="font-normal text-slate-400"> / {r.coreDistanceCap}</span>
                      </td>
                      <td className="px-5 py-3">
                        <span className={`rounded-full border px-2.5 py-0.5 text-[11px] font-black ${STATUS[r.status] ?? STATUS.withdrawn}`}>
                          {r.status.replace("_", " ")}
                        </span>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
      </section>
    </div>
  );
}
