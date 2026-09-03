"use client";

import { useEffect, useRef, useState } from "react";
import { CheckCircle2, Clock, Delete, Loader2, XCircle } from "lucide-react";

/**
 * The kiosk at the door.
 *
 * DESIGNED FOR A WALL, NOT A DESK. Big type, a numeric pad, and one action.
 * The student is standing up, often holding something, frequently in a queue —
 * every interaction that needs a second look is one that produces a queue at
 * 8:55am and a cohort of students who stop bothering.
 *
 * IT ASKS FOR NOTHING BUT THE CODE. No dropdown for what kind of hour this is:
 * the schedule already knows, and a student choosing their own hour type is
 * both a burden and an invitation. The screen's whole job is to say what
 * happened in a sentence a person can read from four feet away.
 *
 * IT CLEARS ITSELF. A result stays up for a few seconds and then resets, so the
 * next student never sees the last one's name — the closest thing a shared
 * screen has to logging out.
 */

type Result =
  | { ok: true; action: "in"; firstName: string; block: { label: string; window: string }; totalHours: number; programHours: number; headroomHours: number | null }
  | { ok: true; action: "out"; firstName: string; sessionMinutes: number; totalHours: number; programHours: number }
  | { ok: false; message: string };

const RESET_AFTER_MS = 6000;

export function Kiosk() {
  const [code, setCode] = useState("");
  const [pending, setPending] = useState(false);
  const [result, setResult] = useState<Result | null>(null);
  const timer = useRef<ReturnType<typeof setTimeout> | null>(null);

  useEffect(() => () => { if (timer.current) clearTimeout(timer.current); }, []);

  const reset = () => {
    setResult(null);
    setCode("");
  };

  const submit = async (value: string) => {
    if (!value || pending) return;
    setPending(true);
    try {
      const res = await fetch("/api/school/clock", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ code: value }),
      });
      setResult(await res.json());
    } catch {
      setResult({ ok: false, message: "The kiosk is offline. Tell the front desk." });
    } finally {
      setPending(false);
      setCode("");
      if (timer.current) clearTimeout(timer.current);
      timer.current = setTimeout(reset, RESET_AFTER_MS);
    }
  };

  const press = (d: string) => {
    if (result) reset();
    setCode((c) => (c.length >= 8 ? c : c + d));
  };

  if (result) {
    const good = result.ok;
    return (
      <button
        onClick={reset}
        className={`w-full rounded-3xl border-4 p-10 text-center transition-colors ${
          good ? "border-emerald-300 bg-emerald-50" : "border-amber-300 bg-amber-50"
        }`}
      >
        {good ? (
          <CheckCircle2 className="mx-auto h-16 w-16 text-emerald-600" />
        ) : (
          <XCircle className="mx-auto h-16 w-16 text-amber-600" />
        )}

        {result.ok && result.action === "in" && (
          <>
            <p className="mt-5 text-4xl font-black text-emerald-900">
              You&apos;re in, {result.firstName}.
            </p>
            <p className="mt-3 text-xl font-bold text-emerald-800">{result.block.label}</p>
            <p className="mt-1 text-lg text-emerald-700">{result.block.window}</p>
            <p className="mt-5 text-base text-emerald-800">
              {result.totalHours} of {result.programHours} hours so far
            </p>
            {result.headroomHours !== null && (
              <p className="mx-auto mt-4 max-w-md rounded-xl bg-amber-100 px-4 py-3 text-sm font-bold text-amber-900">
                Heads up — {result.headroomHours} hours left before you hit a limit. Talk to your
                instructor about the rest.
              </p>
            )}
          </>
        )}

        {result.ok && result.action === "out" && (
          <>
            <p className="mt-5 text-4xl font-black text-emerald-900">
              You&apos;re out, {result.firstName}.
            </p>
            <p className="mt-3 text-xl font-bold text-emerald-800">
              {Math.floor(result.sessionMinutes / 60)}h {result.sessionMinutes % 60}m this session
            </p>
            <p className="mt-5 text-base text-emerald-800">
              {result.totalHours} of {result.programHours} hours so far
            </p>
          </>
        )}

        {!result.ok && (
          <p className="mx-auto mt-5 max-w-lg text-2xl font-black leading-snug text-amber-900">
            {result.message}
          </p>
        )}

        <p className="mt-8 text-sm font-bold uppercase tracking-widest text-slate-400">
          Tap anywhere for the next student
        </p>
      </button>
    );
  }

  return (
    <div className="w-full">
      {/* The code, shown as dots — a queue behind you can read a screen. */}
      <div className="mb-8 flex h-24 items-center justify-center rounded-3xl border-4 border-slate-200 bg-white">
        {code.length === 0 ? (
          <span className="text-2xl font-bold text-slate-300">Enter your code</span>
        ) : (
          <div className="flex gap-3">
            {code.split("").map((_, i) => (
              <span key={i} className="h-5 w-5 rounded-full bg-slate-800" />
            ))}
          </div>
        )}
      </div>

      <div className="grid grid-cols-3 gap-4">
        {["1", "2", "3", "4", "5", "6", "7", "8", "9"].map((d) => (
          <button
            key={d}
            onClick={() => press(d)}
            className="h-24 rounded-2xl border-2 border-slate-200 bg-white text-4xl font-black text-slate-900 transition-colors active:bg-slate-100"
          >
            {d}
          </button>
        ))}
        <button
          onClick={() => setCode((c) => c.slice(0, -1))}
          className="flex h-24 items-center justify-center rounded-2xl border-2 border-slate-200 bg-white text-slate-500 transition-colors active:bg-slate-100"
          aria-label="Delete"
        >
          <Delete className="h-8 w-8" />
        </button>
        <button
          onClick={() => press("0")}
          className="h-24 rounded-2xl border-2 border-slate-200 bg-white text-4xl font-black text-slate-900 transition-colors active:bg-slate-100"
        >
          0
        </button>
        <button
          onClick={() => submit(code)}
          disabled={!code || pending}
          className="flex h-24 items-center justify-center gap-2 rounded-2xl bg-blue-600 text-xl font-black text-white transition-colors active:bg-blue-700 disabled:opacity-30"
        >
          {pending ? <Loader2 className="h-8 w-8 animate-spin" /> : <Clock className="h-8 w-8" />}
        </button>
      </div>

      <p className="mt-8 text-center text-sm leading-relaxed text-slate-500">
        One button. The timetable decides what kind of hours you&apos;re earning —
        you don&apos;t have to pick.
      </p>
    </div>
  );
}
