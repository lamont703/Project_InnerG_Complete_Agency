"use client";

import { useCallback, useEffect, useRef, useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import {
  AlertCircle, ArrowLeft, CheckCircle2, Circle, Loader2, PlayCircle, Radio, XCircle,
} from "lucide-react";
import Link from "next/link";
import { completeSectionAction, endSessionAction, startSessionAction } from "@/app/student/actions";

export interface ClientSection {
  id: string;
  title: string;
  body: string;
  question: string | null;
  options: string[] | null;
  /** Whether this student has already finished it, and how they answered. */
  doneAt: string | null;
  answeredIndex: number | null;
  wasCorrect: boolean | null;
}

/** How often the page says "somebody is still here". */
const HEARTBEAT_MS = 20_000;
/** No pointer, key or scroll for this long and the heartbeat stops. */
const IDLE_AFTER_MS = 120_000;

/**
 * A self-paced lesson, and the session that earns hours for it.
 *
 * ONE SECTION AT A TIME. A single scrolling page lets a student reach the end
 * in four seconds, and there is then nothing to distinguish reading from
 * scrolling. Stepping through means each section is a deliberate act with a
 * timestamp, which is what the school is signing for.
 *
 * THE HEARTBEAT STOPS WHEN THE STUDENT DOES. It fires on a timer, but only if
 * there has been a pointer, key or scroll event in the last two minutes, and
 * only while the tab is visible. A heartbeat that runs regardless of the person
 * is a heartbeat that measures the browser, and the whole point of the number
 * is that it does not.
 *
 * REVISION COUNTS. The heartbeat reports which section is open, so a student
 * working back through a lesson they already finished produces real evidence
 * even though they complete nothing new. Grading on completions alone made a
 * genuine three-hour session look empty for anybody who had read ahead — which
 * is the well-behaved thing to do, and was being punished for it.
 *
 * IT IS EVIDENCE, NOT ENFORCEMENT. Nothing here blocks, locks or logs anybody
 * out. Idle time simply stops accruing engaged minutes, the punch keeps running
 * until the student finishes it, and an instructor sees both figures. The
 * system is not entitled to decide somebody was not paying attention.
 */
export function LessonClient({
  lessonId,
  sections,
  openPunchId,
  windowOpen,
  windowLabel,
}: {
  lessonId: string;
  sections: ClientSection[];
  openPunchId: string | null;
  windowOpen: boolean;
  windowLabel: string;
}) {
  const router = useRouter();
  const [pending, startTransition] = useTransition();
  const [error, setError] = useState<string | null>(null);

  const firstUndone = Math.max(0, sections.findIndex((s) => !s.doneAt));
  const [i, setI] = useState(firstUndone === -1 ? 0 : firstUndone);
  const [state, setState] = useState(sections);
  const [choice, setChoice] = useState<number | null>(null);
  const [result, setResult] = useState<boolean | null>(null);

  const inSession = Boolean(openPunchId);
  const section = state[i];

  // ---- heartbeat -----------------------------------------------------------
  const lastActive = useRef(Date.now());
  useEffect(() => {
    const bump = () => { lastActive.current = Date.now(); };
    const events = ["pointerdown", "keydown", "scroll", "pointermove"];
    events.forEach((e) => window.addEventListener(e, bump, { passive: true }));
    return () => events.forEach((e) => window.removeEventListener(e, bump));
  }, []);

  /*
   * The section the heartbeat reports, held in a ref so changing section does
   * not tear down and restart the interval — a student stepping through six
   * sections would otherwise reset the timer six times and post far fewer
   * minutes than they actually worked.
   */
  const currentSection = useRef<string | null>(null);
  currentSection.current = state[i]?.id ?? null;

  useEffect(() => {
    if (!inSession) return;
    const beat = () => {
      if (document.visibilityState !== "visible") return;
      if (Date.now() - lastActive.current > IDLE_AFTER_MS) return;
      // Deliberately unawaited and unreported: a dropped heartbeat costs one
      // minute of evidence, and an error message about it would be noise in
      // the middle of a lesson.
      fetch("/api/school/activity", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ sectionId: currentSection.current }),
      }).catch(() => {});
    };
    beat();
    const t = setInterval(beat, HEARTBEAT_MS);
    return () => clearInterval(t);
  }, [inSession]);

  // ---- actions -------------------------------------------------------------
  const start = () => {
    setError(null);
    startTransition(async () => {
      const res = await startSessionAction(lessonId);
      if (res.ok) router.refresh();
      else setError(
        res.error === "outside_window"
          ? `Your online class runs ${windowLabel}. You can read ahead now, but hours only count during class.`
          : res.error ?? "Could not start."
      );
    });
  };

  const finish = () => {
    startTransition(async () => {
      await endSessionAction();
      router.push("/student");
    });
  };

  const markDone = useCallback(() => {
    if (!section) return;
    setError(null);
    startTransition(async () => {
      const res = await completeSectionAction({
        sectionId: section.id,
        answerIndex: section.question ? choice : null,
      });
      if (!res.ok) { setError(res.error ?? "Could not save that."); return; }

      setResult(res.correct ?? null);
      setState((prev) =>
        prev.map((s, idx) =>
          idx === i
            ? { ...s, doneAt: new Date().toISOString(), answeredIndex: choice, wasCorrect: res.correct ?? null }
            : s
        )
      );
    });
  }, [section, choice, i]);

  const next = () => {
    setChoice(null);
    setResult(null);
    if (i < state.length - 1) setI(i + 1);
  };

  if (!section) {
    return (
      <p className="rounded-2xl border border-slate-200 bg-white p-6 text-sm leading-relaxed text-slate-600">
        This lesson has no content in it yet. Your school is still writing it — nothing is missing
        on your side.
      </p>
    );
  }

  const done = Boolean(section.doneAt);
  const answeredThisTime = result !== null;
  const finishedAll = state.every((s) => s.doneAt);

  return (
    <div className="space-y-5">
      {/* Session state, always at the top */}
      {inSession ? (
        <div className="flex flex-wrap items-center gap-3 rounded-2xl border-2 border-emerald-300 bg-emerald-50 px-4 py-3">
          <Radio className="h-4 w-4 shrink-0 animate-pulse text-emerald-600" />
          <p className="flex-1 text-sm font-bold text-emerald-900">
            Your hours are counting. Keep this tab open while you work.
          </p>
          <button
            onClick={finish}
            disabled={pending}
            className="rounded-lg bg-emerald-700 px-4 py-2 text-xs font-black text-white hover:bg-emerald-800 disabled:opacity-50"
          >
            Finish session
          </button>
        </div>
      ) : (
        <div className="rounded-2xl border-2 border-slate-200 bg-white px-4 py-4">
          <p className="text-sm font-bold text-slate-900">
            {windowOpen ? "Your class is running now." : `Your online class runs ${windowLabel}.`}
          </p>
          <p className="mt-1 text-xs leading-relaxed text-slate-500">
            {windowOpen
              ? "Start a session and the time you spend here counts toward your program."
              : "You can read this any time, and reading ahead is a good idea. It just doesn't earn hours — those only count during your scheduled class. Come back then and work through it again; going over it a second time counts in full, so nothing is wasted by reading now."}
          </p>
          {windowOpen && (
            <button
              onClick={start}
              disabled={pending}
              className="mt-3 inline-flex items-center gap-2 rounded-xl bg-blue-600 px-5 py-2.5 text-sm font-black text-white hover:bg-blue-700 disabled:opacity-50"
            >
              {pending ? <Loader2 className="h-4 w-4 animate-spin" /> : <PlayCircle className="h-4 w-4" />}
              Start my session
            </button>
          )}
        </div>
      )}

      {error && (
        <p className="flex items-start gap-2 rounded-xl border border-amber-200 bg-amber-50 px-4 py-3 text-sm leading-relaxed text-amber-900">
          <AlertCircle className="mt-0.5 h-4 w-4 shrink-0" />
          {error}
        </p>
      )}

      {/* Step markers */}
      <div className="flex flex-wrap gap-1.5">
        {state.map((s, idx) => (
          <button
            key={s.id}
            onClick={() => { setI(idx); setChoice(null); setResult(null); }}
            aria-label={`Section ${idx + 1}`}
            className={`h-1.5 flex-1 rounded-full transition-colors ${
              s.doneAt ? "bg-emerald-500" : idx === i ? "bg-blue-500" : "bg-slate-200"
            }`}
          />
        ))}
      </div>

      {/* The section */}
      <article className="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm sm:p-8">
        <p className="text-xs font-black uppercase tracking-widest text-slate-400">
          Section {i + 1} of {state.length}
        </p>
        <h2 className="mt-2 text-2xl font-black tracking-tight text-slate-950">{section.title}</h2>
        <div className="mt-4 space-y-4 text-[15px] leading-relaxed text-slate-700">
          {section.body.split(/\n{2,}/).map((para, n) => (
            <p key={n}>{para}</p>
          ))}
        </div>

        {section.question && (
          <div className="mt-8 rounded-2xl border-2 border-slate-200 bg-slate-50 p-5">
            <p className="font-black text-slate-900">{section.question}</p>
            <div className="mt-3 space-y-2">
              {(section.options ?? []).map((opt, idx) => {
                const picked = (done ? section.answeredIndex : choice) === idx;
                const settled = done || answeredThisTime;
                return (
                  <button
                    key={idx}
                    disabled={settled}
                    onClick={() => setChoice(idx)}
                    className={`flex w-full items-start gap-3 rounded-xl border-2 px-4 py-3 text-left text-sm font-semibold transition-colors ${
                      picked
                        ? settled
                          ? section.wasCorrect
                            ? "border-emerald-400 bg-emerald-50 text-emerald-900"
                            : "border-rose-300 bg-rose-50 text-rose-900"
                          : "border-blue-500 bg-blue-50 text-blue-900"
                        : "border-slate-200 bg-white text-slate-700 hover:border-slate-300"
                    } ${settled ? "cursor-default" : ""}`}
                  >
                    {picked ? (
                      settled ? (
                        section.wasCorrect ? <CheckCircle2 className="mt-0.5 h-4 w-4 shrink-0" /> : <XCircle className="mt-0.5 h-4 w-4 shrink-0" />
                      ) : (
                        <CheckCircle2 className="mt-0.5 h-4 w-4 shrink-0" />
                      )
                    ) : (
                      <Circle className="mt-0.5 h-4 w-4 shrink-0 text-slate-300" />
                    )}
                    {opt}
                  </button>
                );
              })}
            </div>

            {/*
              Says what happened and moves on. No score, no retry: the answer is
              a record of what the student understood at the time, and letting
              it be retried until right would turn a measurement into a
              formality. Getting it wrong is not a penalty — the section still
              counts as done.
            */}
            {(done || answeredThisTime) && (
              <p className={`mt-3 text-sm font-bold ${section.wasCorrect ? "text-emerald-800" : "text-slate-700"}`}>
                {section.wasCorrect
                  ? "That's right."
                  : "Not quite — worth bringing to your instructor. This section still counts as done."}
              </p>
            )}
          </div>
        )}

        <div className="mt-8 flex flex-wrap items-center gap-3 border-t border-slate-100 pt-6">
          {!done ? (
            <button
              onClick={markDone}
              disabled={pending || (section.question !== null && choice === null)}
              className="inline-flex items-center gap-2 rounded-xl bg-slate-900 px-5 py-2.5 text-sm font-black text-white hover:bg-slate-800 disabled:opacity-40"
            >
              {pending && <Loader2 className="h-4 w-4 animate-spin" />}
              {section.question ? "Submit and continue" : "Mark as read"}
            </button>
          ) : i < state.length - 1 ? (
            <button
              onClick={next}
              className="inline-flex items-center gap-2 rounded-xl bg-blue-600 px-5 py-2.5 text-sm font-black text-white hover:bg-blue-700"
            >
              Next section
            </button>
          ) : (
            <p className="text-sm font-black text-emerald-800">
              {finishedAll ? "You've finished this lesson." : "Section done — go back for the ones you skipped."}
            </p>
          )}

          {i > 0 && (
            <button
              onClick={() => { setI(i - 1); setChoice(null); setResult(null); }}
              className="inline-flex items-center gap-1.5 text-sm font-bold text-slate-500 hover:text-slate-800"
            >
              <ArrowLeft className="h-3.5 w-3.5" />
              Back
            </button>
          )}
        </div>
      </article>

      {finishedAll && !inSession && !windowOpen && (
        <div className="rounded-2xl border border-slate-200 bg-white p-5">
          <p className="font-black text-slate-900">You&apos;ve read the whole lesson.</p>
          <p className="mt-1 text-sm leading-relaxed text-slate-600">
            None of it earned hours, because your class wasn&apos;t running. Come back{" "}
            {windowLabel} and go through it again — a second pass during class counts fully, and
            your instructor sees the work either way.
          </p>
        </div>
      )}

      {finishedAll && inSession && (
        <div className="rounded-2xl border-2 border-emerald-300 bg-emerald-50 p-5">
          <p className="font-black text-emerald-900">That&apos;s the whole lesson.</p>
          <p className="mt-1 text-sm leading-relaxed text-emerald-800">
            Go back over anything you want — time spent revising counts the same. When you&apos;re
            done, finish your session so your hours are recorded. Leaving the tab open does not add
            more: your school sees how long you were actually working.
          </p>
          <button
            onClick={finish}
            disabled={pending}
            className="mt-3 inline-flex items-center gap-2 rounded-xl bg-emerald-700 px-5 py-2.5 text-sm font-black text-white hover:bg-emerald-800 disabled:opacity-50"
          >
            {pending && <Loader2 className="h-4 w-4 animate-spin" />}
            Finish session
          </button>
        </div>
      )}

      <Link href="/student" className="inline-flex items-center gap-1.5 text-sm font-bold text-slate-500 hover:text-slate-800">
        <ArrowLeft className="h-3.5 w-3.5" />
        All lessons
      </Link>
    </div>
  );
}
