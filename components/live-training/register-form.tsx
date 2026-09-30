"use client";

import { useState } from "react";
import { CalendarPlus, Check, Loader2 } from "lucide-react";

/**
 * The LIVE training sign-up (/live-training). Name, email and mobile number
 * are required. Texts are opt-in only: the box starts unticked and shows the
 * exact consent words stored with the registration (lib/live-training/store.ts).
 */
export function RegisterForm({ consentText, audiences, source, via = null }: { consentText: string; audiences: { id: string; label: string }[]; source: string | null; via?: string | null }) {
  const [firstName, setFirstName] = useState("");
  const [email, setEmail] = useState("");
  const [phone, setPhone] = useState("");
  const [audience, setAudience] = useState("");
  const [sms, setSms] = useState(false);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [done, setDone] = useState<{ when: string; calendar: string } | null>(null);

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    setBusy(true); setError(null);
    try {
      const r = await fetch("/api/live-training/register", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ firstName, email, phone, smsConsent: sms, audience: audience || undefined, source, via }),
      });
      const j = await r.json();
      if (!j.ok) throw new Error(j.error || "Couldn't register.");
      const start = new Date(j.startsAt);
      const end = new Date(start.getTime() + 60 * 60_000);
      const fmt = (d: Date) => d.toISOString().replace(/[-:]/g, "").replace(/\.\d{3}/, "");
      const calendar = `https://calendar.google.com/calendar/render?action=TEMPLATE&text=${encodeURIComponent("LIVE: AI Barber Beauty Business Training")}&dates=${fmt(start)}/${fmt(end)}&details=${encodeURIComponent("Your Google Meet link arrives by email 24 hours before. No camera needed. https://shearquery.com/live-training")}`;
      setDone({ when: j.when, calendar });
      (window as any).innerG?.track?.("live_training_registered", { session: j.sessionDate, sms: sms, audience: audience || null, source, via });
    } catch (err: any) {
      setError(err.message);
    } finally {
      setBusy(false);
    }
  };

  if (done) {
    return (
      <div className="text-center">
        <div className="mx-auto flex h-12 w-12 items-center justify-center rounded-full bg-emerald-100"><Check className="h-6 w-6 text-emerald-700" /></div>
        <p className="mt-3 text-xl font-black">You&apos;re registered!</p>
        <p className="mt-1 text-sm text-slate-600">{done.when}. Check your email — your Google Meet link arrives 24 hours before we go live.</p>
        <a href={done.calendar} target="_blank" rel="noopener noreferrer" className="mt-4 inline-flex items-center gap-2 rounded-xl border border-slate-300 bg-white px-4 py-2.5 text-sm font-bold">
          <CalendarPlus className="h-4 w-4" /> Add to Google Calendar
        </a>
      </div>
    );
  }

  const box = "mt-1 w-full rounded-xl border-2 border-slate-100 bg-white px-4 py-3 text-sm font-semibold outline-none focus:border-blue-500";
  return (
    <form onSubmit={submit} className="space-y-3">
      <label className="block text-xs font-black uppercase tracking-wide text-slate-500">First name
        <input required value={firstName} onChange={(e) => setFirstName(e.target.value)} autoComplete="given-name" className={box} />
      </label>
      <label className="block text-xs font-black uppercase tracking-wide text-slate-500">Email
        <input required type="email" value={email} onChange={(e) => setEmail(e.target.value)} autoComplete="email" className={box} />
      </label>
      <label className="block text-xs font-black uppercase tracking-wide text-slate-500">I&apos;m a…
        <select value={audience} onChange={(e) => setAudience(e.target.value)} className={box}>
          <option value="">Choose one (optional)</option>
          {audiences.map((a) => <option key={a.id} value={a.id}>{a.label}</option>)}
        </select>
      </label>
      <label className="block text-xs font-black uppercase tracking-wide text-slate-500">Mobile number
        <input required type="tel" value={phone} onChange={(e) => setPhone(e.target.value)} autoComplete="tel" inputMode="tel" className={box} />
      </label>
      <label className="flex items-start gap-2.5 rounded-xl bg-slate-50 p-3 text-xs leading-relaxed text-slate-600">
        <input type="checkbox" checked={sms} onChange={(e) => setSms(e.target.checked)} className="mt-0.5 h-4 w-4 shrink-0" />
        <span>{consentText}</span>
      </label>
      {error && <p className="text-sm font-semibold text-rose-700">{error}</p>}
      <button disabled={busy} className="flex w-full items-center justify-center gap-2 rounded-xl bg-red-600 px-5 py-4 text-sm font-black uppercase tracking-wide text-white hover:bg-red-700 disabled:opacity-60">
        {busy ? <><Loader2 className="h-4 w-4 animate-spin" /> Saving your seat…</> : "Save my free seat"}
      </button>
      <p className="text-center text-[11px] text-slate-400">Free. We&apos;ll email you the join link and reminders. Unsubscribe anytime.</p>
    </form>
  );
}
