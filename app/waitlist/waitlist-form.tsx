"use client";

import { useState } from "react";
import { Loader2, CheckCircle2 } from "lucide-react";
import { joinWaitlistAction } from "./actions";

/**
 * The waitlist form. Name and email are required; phone, profession and the
 * free-text answer are not.
 *
 * THE FREE TEXT IS THE POINT, so it is not buried under an "optional" heading at
 * the bottom of the form. What people say they want to do with this is the only
 * evidence we have for what to build, and a question people actually answer is
 * worth more than a dropdown we wrote before anybody replied.
 *
 * THE SOURCE COMES FROM THE URL (?src=), because the YouTube redirects already
 * stamp one. It is passed through to the row rather than guessed at.
 */
export function WaitlistForm({ source }: { source?: string }) {
  const [busy, setBusy] = useState(false);
  const [done, setDone] = useState(false);
  const [error, setError] = useState<string | null>(null);

  if (done) {
    return (
      <div
        id="join"
        className="flex items-start gap-3 rounded-xl border border-emerald-200 bg-emerald-50 p-5"
      >
        <CheckCircle2 className="mt-0.5 h-5 w-5 shrink-0 text-emerald-600" />
        <div className="text-sm text-emerald-900">
          <p className="font-black">You&apos;re on the list.</p>
          <p className="mt-1">
            I&apos;ll write to you when it opens, and I&apos;ll tell you what it is before I ask you
            for anything. In the meantime the videos keep coming, and everything I work out I put
            in them.
          </p>
        </div>
      </div>
    );
  }

  return (
    <form
      id="join"
      className="space-y-3 scroll-mt-24"
      onSubmit={async (e) => {
        e.preventDefault();
        setBusy(true);
        setError(null);
        const f = new FormData(e.currentTarget as HTMLFormElement);
        const res = await joinWaitlistAction({
          fullName: String(f.get("fullName") || ""),
          email: String(f.get("email") || ""),
          phone: String(f.get("phone") || ""),
          profession: String(f.get("profession") || ""),
          asiIntent: String(f.get("asiIntent") || ""),
          website: String(f.get("website") || ""),
          source,
        });
        setBusy(false);
        if (res.ok) setDone(true);
        else setError(res.error ?? "Something went wrong.");
      }}
    >
      <div className="grid gap-3 sm:grid-cols-2">
        <Field name="fullName" label="Your name" required />
        <Field name="email" label="Email" type="email" required />
        <Field name="phone" label="Mobile (so I can text you)" type="tel" />
        <Field name="profession" label="What do you do?" placeholder="Barber, stylist, owner, student…" />
      </div>

      <label className="block">
        <span className="text-xs font-black uppercase tracking-wide text-slate-500">
          How are you aiming to use artificial super intelligence in your business?
        </span>
        <textarea
          name="asiIntent"
          rows={4}
          maxLength={2000}
          placeholder="However you'd say it. What you want it to do for you, or what you're stuck on."
          className="mt-1 w-full rounded-lg border border-slate-300 px-3 py-2 text-sm text-slate-900 outline-none focus:border-slate-500"
        />
      </label>

      {/* Honeypot: hidden from people, irresistible to bots. */}
      <input
        type="text"
        name="website"
        tabIndex={-1}
        autoComplete="off"
        aria-hidden="true"
        className="hidden"
      />

      {error && <p className="text-xs font-bold text-rose-600">{error}</p>}

      <button
        type="submit"
        disabled={busy}
        className="inline-flex w-full items-center justify-center gap-2 rounded-xl bg-slate-900 px-5 py-3 text-sm font-black text-white transition hover:bg-slate-800 disabled:opacity-50"
      >
        {busy && <Loader2 className="h-4 w-4 animate-spin" />}
        Join the ShearQuery waitlist
      </button>
      <p className="text-[11px] leading-relaxed text-slate-500">
        This is a waitlist, not a purchase. Nothing is for sale on this page and there is no date
        promised. I&apos;ll email or text you when it opens, and you can leave the list whenever you
        want.
      </p>
    </form>
  );
}

function Field({
  name, label, type = "text", required, placeholder,
}: { name: string; label: string; type?: string; required?: boolean; placeholder?: string }) {
  return (
    <label className="block">
      <span className="text-xs font-black uppercase tracking-wide text-slate-500">
        {label}
        {required && <span className="text-rose-500"> *</span>}
      </span>
      <input
        name={name}
        type={type}
        required={required}
        placeholder={placeholder}
        className="mt-1 w-full rounded-lg border border-slate-300 px-3 py-2 text-sm text-slate-900 outline-none focus:border-slate-500"
      />
    </label>
  );
}
