"use client";

import { useState } from "react";
import { CheckCircle2, Loader2, PhoneCall } from "lucide-react";

/**
 * The callback request.
 *
 * FIVE FIELDS, ALL REQUIRED, AND NOTHING ELSE. Every extra question on a form
 * aimed at a school owner is a reason to close the tab, and none of the
 * obvious extras — enrollment size, which courses, current LMS — is needed to
 * make the call. They are better answered ON the call, by someone who can ask
 * follow-ups, than guessed at in a text box.
 *
 * IT PROMISES A PHONE CALL, so it must not read like a signup. No password, no
 * account, no "get instant access". The button says what happens next.
 */

const STATES = [
  "TX", "AL", "AK", "AZ", "AR", "CA", "CO", "CT", "DE", "FL", "GA", "HI", "ID", "IL", "IN",
  "IA", "KS", "KY", "LA", "ME", "MD", "MA", "MI", "MN", "MS", "MO", "MT", "NE", "NV", "NH",
  "NJ", "NM", "NY", "NC", "ND", "OH", "OK", "OR", "PA", "RI", "SC", "SD", "TN", "UT", "VT",
  "VA", "WA", "WV", "WI", "WY", "DC",
];

const FIELD =
  "w-full rounded-xl border-2 border-slate-200 bg-white px-4 py-3 text-sm font-semibold text-slate-900 outline-none transition-colors focus:border-blue-500";
const LABEL = "ml-1 text-[10px] font-black uppercase tracking-widest text-slate-500";

export function HybridLeadForm() {
  const [pending, setPending] = useState(false);
  const [done, setDone] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const [schoolName, setSchoolName] = useState("");
  const [state, setState] = useState("TX");
  const [contactName, setContactName] = useState("");
  const [email, setEmail] = useState("");
  const [phone, setPhone] = useState("");

  if (done) {
    return (
      <div className="rounded-2xl border border-emerald-200 bg-emerald-50 p-6 sm:p-8">
        <CheckCircle2 className="h-8 w-8 text-emerald-600" />
        <h3 className="mt-4 text-xl font-black text-emerald-900">
          Got it — you&apos;ll hear from us within 24 hours.
        </h3>
        <p className="mt-3 text-sm leading-relaxed text-emerald-800">
          A ShearQuery rep will call <strong>{phone}</strong> to talk through what a hybrid
          program would look like at {schoolName}.
        </p>
        <p className="mt-3 text-sm leading-relaxed text-emerald-800">
          On that call you&apos;ll get a live demo of a possible hybrid interface for your school.
          It is built around your data and your goals, so it takes shape as we talk rather than
          being a canned slideshow — come with your course mix and what you are trying to fix.
          No two of these are the same, which is why we scope before we quote.
        </p>
      </div>
    );
  }

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    setPending(true);
    try {
      const res = await fetch("/api/hybrid-program-leads", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ schoolName, state, contactName, email, phone }),
      });
      const json = await res.json();
      if (json.ok) setDone(true);
      else setError(json.error || "Something went wrong. Please try again.");
    } catch {
      setError("We couldn't reach the server. Please try again.");
    } finally {
      setPending(false);
    }
  };

  return (
    <form onSubmit={submit} className="space-y-4 rounded-2xl border border-slate-200 bg-white p-6 shadow-sm sm:p-8">
      <div>
        <h3 className="text-xl font-black tracking-tight text-slate-950">
          Talk to a ShearQuery rep
        </h3>
        <p className="mt-1.5 text-sm leading-relaxed text-slate-600">
          We&apos;ll call you back within 24 hours and show you, live on the call, what a hybrid
          interface could look like for your school.
        </p>
      </div>

      <div className="space-y-1.5">
        <label htmlFor="hp-school" className={LABEL}>School name</label>
        <input id="hp-school" required value={schoolName} onChange={(e) => setSchoolName(e.target.value)}
          className={FIELD} placeholder="Lone Star Barber College" />
      </div>

      <div className="grid grid-cols-1 gap-4 sm:grid-cols-3">
        <div className="space-y-1.5">
          <label htmlFor="hp-state" className={LABEL}>State</label>
          <select id="hp-state" required value={state} onChange={(e) => setState(e.target.value)} className={FIELD}>
            {STATES.map((s) => <option key={s} value={s}>{s}</option>)}
          </select>
        </div>
        <div className="space-y-1.5 sm:col-span-2">
          <label htmlFor="hp-name" className={LABEL}>Your name</label>
          <input id="hp-name" required value={contactName} onChange={(e) => setContactName(e.target.value)}
            className={FIELD} placeholder="Jordan Ellis" />
        </div>
      </div>

      <div className="space-y-1.5">
        <label htmlFor="hp-email" className={LABEL}>Email</label>
        <input id="hp-email" type="email" required value={email} onChange={(e) => setEmail(e.target.value)}
          className={FIELD} placeholder="you@school.edu" />
      </div>

      <div className="space-y-1.5">
        <label htmlFor="hp-phone" className={LABEL}>Phone</label>
        <input id="hp-phone" type="tel" required value={phone} onChange={(e) => setPhone(e.target.value)}
          className={FIELD} placeholder="(713) 555-0142" />
        <p className="ml-1 text-[11px] leading-relaxed text-slate-500">
          This is the number we&apos;ll call. All five fields are required.
        </p>
      </div>

      {error && (
        <p className="rounded-xl border border-rose-200 bg-rose-50 px-4 py-3 text-sm font-semibold text-rose-800">
          {error}
        </p>
      )}

      <button type="submit" disabled={pending}
        className="inline-flex w-full items-center justify-center gap-2 rounded-xl bg-blue-600 px-5 py-3.5 text-sm font-black text-white transition-colors hover:bg-blue-700 disabled:opacity-50">
        {pending ? <><Loader2 className="h-4 w-4 animate-spin" /> Sending…</> : <><PhoneCall className="h-4 w-4" /> Request Callback or Demo</>}
      </button>
      <p className="text-center text-[11px] leading-relaxed text-slate-500">
        One phone call. We scope the work to your school before anyone talks numbers.
      </p>
    </form>
  );
}
