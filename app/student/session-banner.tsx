"use client";

import { useEffect, useState, useTransition } from "react";
import { Loader2, Radio } from "lucide-react";
import { endSessionAction } from "./actions";

/**
 * "You are still clocked in."
 *
 * SHOWN ON THE DASHBOARD, not only inside the lesson. The failure this prevents
 * is a student closing the lesson tab, going to bed, and returning to a session
 * that ran for eleven hours — which is a punch somebody then has to void and
 * explain. Seeing it on the first page they land on is the cheapest possible
 * reminder.
 */
export function SessionBanner({ startedAt }: { startedAt: string }) {
  const [pending, startTransition] = useTransition();
  const [now, setNow] = useState(() => Date.now());

  useEffect(() => {
    const t = setInterval(() => setNow(Date.now()), 30_000);
    return () => clearInterval(t);
  }, []);

  const mins = Math.max(0, Math.round((now - new Date(startedAt).getTime()) / 60000));

  return (
    <div className="mt-5 flex flex-wrap items-center gap-3 rounded-2xl border-2 border-emerald-300 bg-emerald-50 p-4">
      <Radio className="h-5 w-5 shrink-0 animate-pulse text-emerald-600" />
      <p className="flex-1 text-sm font-bold text-emerald-900">
        You&apos;re still in a session — {Math.floor(mins / 60)}h {mins % 60}m so far.
      </p>
      <button
        onClick={() => startTransition(async () => { await endSessionAction(); })}
        disabled={pending}
        className="inline-flex items-center gap-2 rounded-xl bg-emerald-700 px-4 py-2 text-sm font-black text-white hover:bg-emerald-800 disabled:opacity-50"
      >
        {pending && <Loader2 className="h-4 w-4 animate-spin" />}
        Finish now
      </button>
    </div>
  );
}
