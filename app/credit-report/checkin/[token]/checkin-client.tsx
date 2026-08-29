"use client";

import { useState, useTransition } from "react";
import { Check, Loader2, UserMinus, UserCheck } from "lucide-react";
import type { PaymentStatus } from "@/lib/credit-report/model";
import { weekLabel } from "@/lib/credit-report/weeks";
import { recordWeekAction, setPresenceAction, finishCheckinAction } from "./actions";

export interface CheckinWorker {
  id: string;
  name: string;
  outstanding: string[];
  answered: Record<string, PaymentStatus>;
  stale: boolean;
  lastReportedAt: string | null;
}

/**
 * The one-tap check-in.
 *
 * FOUR BUTTONS, NOT A DROPDOWN. This is answered on a phone, one-handed, by
 * somebody with a client in the chair. A select needs a tap to open, a scroll
 * and a tap to choose; a row of buttons is the one tap the text promised.
 *
 * THERE IS NO "SKIP" AND NO SUBMIT. A week left untouched stays blank — never
 * marked paid, never marked missed — so closing the page halfway through is a
 * valid way to use it. Requiring a submit would turn a partial answer into no
 * answer at all.
 */

const CHOICES: { value: PaymentStatus; label: string; on: string; off: string }[] = [
  { value: "on_time", label: "Paid", on: "bg-emerald-600 text-white border-emerald-600", off: "border-slate-200 text-slate-700 hover:bg-emerald-50" },
  { value: "late", label: "Late", on: "bg-amber-500 text-white border-amber-500", off: "border-slate-200 text-slate-700 hover:bg-amber-50" },
  { value: "missed", label: "Didn't pay", on: "bg-rose-600 text-white border-rose-600", off: "border-slate-200 text-slate-700 hover:bg-rose-50" },
  { value: "excused", label: "Week off", on: "bg-slate-600 text-white border-slate-600", off: "border-slate-200 text-slate-700 hover:bg-slate-50" },
];

function WeekRow({
  token,
  rosterId,
  weekStart,
  initial,
}: {
  token: string;
  rosterId: string;
  weekStart: string;
  initial: PaymentStatus | undefined;
}) {
  const [status, setStatus] = useState<PaymentStatus | undefined>(initial);
  const [pending, startTransition] = useTransition();
  const [error, setError] = useState<string | null>(null);

  const pick = (next: PaymentStatus) => {
    const previous = status;
    setStatus(next);
    setError(null);
    startTransition(async () => {
      const res = await recordWeekAction(token, rosterId, weekStart, next);
      // Roll back rather than leave a button lit for something that was never
      // saved — a check-in that lies is worse than one that errors.
      if (!res.ok) {
        setStatus(previous);
        setError(res.error ?? "Could not save.");
      }
    });
  };

  return (
    <div className="py-3">
      <div className="mb-2 flex items-center gap-2">
        <span className="text-xs font-black uppercase tracking-widest text-slate-400">
          Week of {weekLabel(weekStart)}
        </span>
        {pending && <Loader2 className="h-3 w-3 animate-spin text-slate-400" />}
        {!pending && status && <Check className="h-3.5 w-3.5 text-emerald-600" />}
      </div>
      <div className="grid grid-cols-2 gap-2 sm:grid-cols-4">
        {CHOICES.map((c) => (
          <button
            key={c.value}
            onClick={() => pick(c.value)}
            disabled={pending}
            className={`rounded-xl border-2 px-3 py-3 text-sm font-black transition-colors disabled:opacity-60 ${
              status === c.value ? c.on : c.off
            }`}
          >
            {c.label}
          </button>
        ))}
      </div>
      {error && <p className="mt-2 text-xs font-bold text-rose-700">{error}</p>}
    </div>
  );
}

function PresencePrompt({ token, worker }: { token: string; worker: CheckinWorker }) {
  const [answered, setAnswered] = useState<null | boolean>(null);
  const [pending, startTransition] = useTransition();

  if (answered !== null) {
    return (
      <div className="mt-3 rounded-xl bg-slate-50 px-4 py-3 text-xs font-bold text-slate-600">
        {answered
          ? `Thanks — ${worker.name} stays on your roster.`
          : `${worker.name} moved to past renters. Every week they did pay stays on their record.`}
      </div>
    );
  }

  return (
    <div className="mt-3 rounded-xl border border-amber-200 bg-amber-50 p-4">
      <p className="text-sm font-black text-amber-900">
        Is {worker.name} still renting a chair here?
      </p>
      <p className="mt-1 text-xs leading-relaxed text-amber-800">
        {worker.lastReportedAt
          ? `Nothing recorded for them since ${weekLabel(worker.lastReportedAt.slice(0, 10))}.`
          : "Nothing has ever been recorded for them."}{" "}
        Saying no does not delete anything — the weeks they paid stay on their record.
      </p>
      <div className="mt-3 flex gap-2">
        <button
          onClick={() => startTransition(async () => {
            const res = await setPresenceAction(token, worker.id, true);
            if (res.ok) setAnswered(true);
          })}
          disabled={pending}
          className="inline-flex items-center gap-1.5 rounded-xl bg-emerald-600 px-4 py-2.5 text-sm font-black text-white hover:bg-emerald-700 disabled:opacity-50"
        >
          <UserCheck className="h-4 w-4" />
          Still here
        </button>
        <button
          onClick={() => startTransition(async () => {
            const res = await setPresenceAction(token, worker.id, false);
            if (res.ok) setAnswered(false);
          })}
          disabled={pending}
          className="inline-flex items-center gap-1.5 rounded-xl border-2 border-slate-200 bg-white px-4 py-2.5 text-sm font-black text-slate-700 hover:bg-slate-50 disabled:opacity-50"
        >
          <UserMinus className="h-4 w-4" />
          They&apos;ve left
        </button>
      </div>
    </div>
  );
}

export function CheckinClient({
  token,
  workers,
}: {
  token: string;
  workers: CheckinWorker[];
}) {
  const [done, setDone] = useState(false);
  const [pending, startTransition] = useTransition();

  return (
    <div className="space-y-4">
      {workers.map((w) => (
        <section key={w.id} className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
          <h2 className="text-lg font-black text-slate-900">{w.name}</h2>

          {w.outstanding.length === 0 ? (
            <p className="mt-2 text-sm text-slate-500">All caught up for this period.</p>
          ) : (
            <div className="mt-1 divide-y divide-slate-100">
              {w.outstanding.map((week) => (
                <WeekRow key={week} token={token} rosterId={w.id} weekStart={week} initial={w.answered[week]} />
              ))}
            </div>
          )}

          {w.stale && <PresencePrompt token={token} worker={w} />}
        </section>
      ))}

      {/* Optional, and labelled as such. Nothing is lost by leaving without
          it — every tap above already saved. */}
      {done ? (
        <p className="rounded-2xl border border-emerald-200 bg-emerald-50 p-5 text-sm font-bold text-emerald-800">
          Done — thanks. Next check-in in two weeks.
        </p>
      ) : (
        <button
          onClick={() => startTransition(async () => { await finishCheckinAction(token); setDone(true); })}
          disabled={pending}
          className="w-full rounded-xl bg-slate-900 px-5 py-3.5 text-sm font-black text-white transition-colors hover:bg-slate-800 disabled:opacity-50"
        >
          {pending ? "Saving…" : "That's everything"}
        </button>
      )}
    </div>
  );
}
