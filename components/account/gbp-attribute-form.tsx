"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { AlertTriangle, ArrowRight, Check, Loader2, Lock, X } from "lucide-react";
import { groupQuestions, type Questionnaire, type Question } from "@/lib/gbp-attribute-questionnaire";

/**
 * The attribute questionnaire.
 *
 * Three deliberate choices, all for the same reason — these answers are
 * published to customers as statements of fact about the business:
 *
 *  • Nothing is pre-selected. A default of "yes" would put claims on a listing
 *    that the owner never made.
 *  • Skipping is a first-class answer, not a failure to complete. An unanswered
 *    attribute stays unanswered; it is never submitted as "no".
 *  • "No" is offered explicitly, because for some attributes it's the useful
 *    answer — a customer filtering for wheelchair access is better served by an
 *    honest no than by silence.
 */

type Answer = boolean | null;

export function GbpAttributeForm() {
  const [data, setData] = useState<Questionnaire | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [answers, setAnswers] = useState<Record<string, Answer>>({});
  const [saving, setSaving] = useState(false);
  const [saved, setSaved] = useState<number | null>(null);

  const load = async () => {
    setLoading(true);
    setError(null);
    try {
      const res = await fetch("/api/account/gbp-attributes", { cache: "no-store" });
      const json = await res.json();
      if (!json.success) setError(json.error || "Could not load your attributes.");
      else setData(json.questionnaire);
    } catch {
      setError("Could not load your attributes.");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { load(); }, []);

  const answeredNow = Object.values(answers).filter((v) => v === true || v === false).length;

  const submit = async () => {
    setSaving(true);
    setError(null);
    try {
      const res = await fetch("/api/account/gbp-attributes", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ answers }),
      });
      const json = await res.json();
      if (!json.success) { setError(json.error || "Could not save."); return; }
      setSaved(json.saved);
      setAnswers({});
      setData(json.questionnaire);
    } catch {
      setError("Could not save.");
    } finally {
      setSaving(false);
    }
  };

  if (loading) {
    return (
      <div className="flex items-center gap-2 text-sm text-slate-500">
        <Loader2 className="h-4 w-4 animate-spin" /> Loading what Google offers for your business…
      </div>
    );
  }

  if (error && !data) {
    return (
      <div className="rounded-2xl border border-amber-200 bg-amber-50 p-5">
        <p className="text-sm font-semibold text-amber-900">{error}</p>
        <Link href="/account/gbp-audit" className="mt-3 inline-block text-sm font-bold text-primary hover:underline">
          Back to my audit
        </Link>
      </div>
    );
  }

  if (!data) return null;

  const grouped = groupQuestions(data.askable);
  const pct = data.totalAvailable ? Math.round((data.answeredCount / data.totalAvailable) * 100) : 0;

  return (
    <div>
      {/* Where they stand */}
      <div className="rounded-2xl border border-slate-200 bg-white p-5">
        <div className="flex items-baseline justify-between gap-3">
          <span className="text-sm font-bold text-slate-900">
            {data.answeredCount} of {data.totalAvailable} answered
          </span>
          <span className="text-xs text-slate-500">{pct}%</span>
        </div>
        <div className="mt-2 h-2 overflow-hidden rounded bg-slate-100">
          <div className="h-full bg-primary transition-all" style={{ width: `${pct}%` }} />
        </div>
        <p className="mt-3 text-xs leading-relaxed text-slate-500">
          Google decides which attributes exist for your category — we can&apos;t invent them, and we
          can&apos;t answer them for you. Several are filters customers use on Maps, so an unanswered
          one can leave you out of results entirely.
        </p>
      </div>

      {saved !== null && (
        <p className="mt-4 rounded-xl border border-emerald-200 bg-emerald-50 px-4 py-3 text-sm font-semibold text-emerald-800">
          Saved {saved} answer{saved === 1 ? "" : "s"} to your Google profile. Google may take a short
          while to show them publicly.
        </p>
      )}
      {error && (
        <p className="mt-4 rounded-xl border border-rose-200 bg-rose-50 px-4 py-3 text-sm font-semibold text-rose-700">
          {error}
        </p>
      )}

      {/* The questions */}
      {grouped.length === 0 ? (
        <p className="mt-6 rounded-2xl border border-slate-200 bg-white p-5 text-sm text-slate-600">
          Every yes/no attribute Google offers for your category is answered. Nothing to do here.
        </p>
      ) : (
        <>
          {grouped.map((g) => (
            <section key={g.group} className="mt-6">
              <h2 className="text-xs font-black uppercase tracking-widest text-slate-400">{g.group}</h2>
              <div className="mt-2 divide-y divide-slate-100 rounded-2xl border border-slate-200 bg-white">
                {g.questions.map((q) => (
                  <Row
                    key={q.name}
                    question={q}
                    value={answers[q.name] ?? null}
                    onChange={(v) => setAnswers((a) => ({ ...a, [q.name]: v }))}
                  />
                ))}
              </div>
            </section>
          ))}

          <div className="sticky bottom-4 mt-6">
            <div className="flex items-center justify-between gap-4 rounded-2xl border border-slate-200 bg-white/95 p-4 shadow-lg backdrop-blur">
              <p className="text-sm text-slate-600">
                {answeredNow === 0
                  ? "Answer what you know — skip anything you're unsure about."
                  : `${answeredNow} answer${answeredNow === 1 ? "" : "s"} ready to save`}
              </p>
              <button
                onClick={submit}
                disabled={saving || answeredNow === 0}
                className="inline-flex shrink-0 items-center gap-2 rounded-xl bg-primary px-5 py-2.5 text-sm font-black uppercase tracking-wide text-primary-foreground transition-colors hover:bg-primary/90 disabled:opacity-50"
              >
                {saving && <Loader2 className="h-4 w-4 animate-spin" />}
                Save to Google
              </button>
            </div>
          </div>
        </>
      )}

      {/* Already answered */}
      {data.answered.length > 0 && (
        <section className="mt-8">
          <h2 className="text-xs font-black uppercase tracking-widest text-slate-400">
            Already on your profile
          </h2>
          <div className="mt-2 flex flex-wrap gap-2">
            {data.answered.map((q) => (
              <span
                key={q.name}
                className={`inline-flex items-center gap-1.5 rounded-lg border px-2.5 py-1 text-xs font-semibold ${
                  q.currentValue
                    ? "border-emerald-200 bg-emerald-50 text-emerald-800"
                    : "border-slate-200 bg-slate-50 text-slate-500"
                }`}
              >
                {q.currentValue ? <Check className="h-3 w-3" /> : <X className="h-3 w-3" />}
                {q.label}
              </span>
            ))}
          </div>
        </section>
      )}

      {/* Honest about what this screen can't do yet */}
      {data.unsupported.length > 0 && (
        <section className="mt-8 rounded-2xl border border-slate-200 bg-slate-50 p-5">
          <h2 className="flex items-center gap-2 text-sm font-black text-slate-900">
            <Lock className="h-3.5 w-3.5 text-slate-400" />
            {data.unsupported.length} more need a different kind of answer
          </h2>
          <p className="mt-2 text-xs leading-relaxed text-slate-500">
            Links, payment types and chat preferences aren&apos;t yes/no questions, so they aren&apos;t
            on this screen yet. They&apos;re counted above so your total matches Google&apos;s.
          </p>
          <p className="mt-3 flex flex-wrap gap-x-3 gap-y-1 text-xs text-slate-500">
            {data.unsupported.slice(0, 8).map((u) => (
              <span key={u.name}>{u.label}</span>
            ))}
            {data.unsupported.length > 8 && <span>and {data.unsupported.length - 8} more</span>}
          </p>
        </section>
      )}

      <p className="mt-8 flex items-start gap-2 text-xs leading-relaxed text-slate-400">
        <AlertTriangle className="mt-0.5 h-3.5 w-3.5 shrink-0" />
        Your answers are published to customers as statements about your business. We record what
        your profile looked like before every change, so anything here can be put back.
      </p>

      <p className="mt-4">
        <Link href="/account/gbp-audit" className="inline-flex items-center gap-1.5 text-sm font-bold text-primary hover:underline">
          Back to my audit <ArrowRight className="h-3.5 w-3.5" />
        </Link>
      </p>
    </div>
  );
}

function Row({
  question, value, onChange,
}: { question: Question; value: Answer; onChange: (v: Answer) => void }) {
  const btn = (v: Answer, label: string, active: string) =>
    `rounded-lg border px-3 py-1.5 text-xs font-bold transition-colors ${
      value === v ? active : "border-slate-200 bg-white text-slate-500 hover:bg-slate-50"
    }`;

  return (
    <div className="flex items-center justify-between gap-4 px-4 py-3">
      <span className="text-sm text-slate-700">{question.label}</span>
      <div className="flex shrink-0 gap-1.5">
        <button onClick={() => onChange(true)} className={btn(true, "Yes", "border-emerald-500 bg-emerald-500 text-white")}>
          Yes
        </button>
        <button onClick={() => onChange(false)} className={btn(false, "No", "border-slate-700 bg-slate-700 text-white")}>
          No
        </button>
        <button onClick={() => onChange(null)} className={btn(null, "Skip", "border-slate-300 bg-slate-100 text-slate-600")}>
          Skip
        </button>
      </div>
    </div>
  );
}
