"use client";

import React from "react";
import { Loader2, MessageSquare, Check } from "lucide-react";
import { submitConsent } from "@/app/sms-consent/[token]/actions";

/**
 * The opt-in form.
 *
 * THE CHECKBOX IS NOT PRE-TICKED, and the submit button stays disabled until it
 * is. Consent that arrives by default is not consent, and a pre-ticked box is
 * the single most common way an opt-in flow is found non-compliant. This is
 * enforced in the markup rather than trusted to copy.
 *
 * The full disclosure is rendered on the page, not hidden behind a link, so the
 * thing they agreed to is the thing they could see.
 */
export function ConsentForm({ token, consentText }: { token: string; consentText: string }) {
  const [phone, setPhone] = React.useState("");
  const [agreed, setAgreed] = React.useState(false);
  const [busy, setBusy] = React.useState(false);
  const [error, setError] = React.useState<string | null>(null);
  const [sent, setSent] = React.useState(false);

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    setBusy(true);
    setError(null);
    const r = await submitConsent({ token, phone });
    setBusy(false);
    if (r.ok) setSent(true);
    else setError(r.error);
  }

  if (sent) {
    return (
      <div className="bg-emerald-50 border border-emerald-200 rounded-xl px-4 py-4">
        <p className="font-bold text-emerald-900 text-[15px] flex items-center gap-1.5 mb-1">
          <Check className="w-4 h-4" />
          Check your phone
        </p>
        <p className="text-[13px] text-emerald-800">
          I&apos;ve sent you a text. <strong>Reply YES</strong> to confirm and you&apos;re done.
        </p>
      </div>
    );
  }

  return (
    <form onSubmit={submit} className="space-y-4">
      <label className="block">
        <span className="block text-[13px] font-bold text-slate-700 mb-1">Mobile number</span>
        <input
          type="tel"
          required
          autoComplete="tel"
          inputMode="tel"
          value={phone}
          onChange={(e) => setPhone(e.target.value)}
          placeholder="(404) 555-0142"
          className="w-full text-[16px] border border-slate-300 rounded-lg px-3 py-2.5 focus:outline-none focus:ring-2 focus:ring-slate-900/10"
        />
      </label>

      <label className="flex gap-2.5 items-start cursor-pointer">
        <input
          type="checkbox"
          checked={agreed}
          onChange={(e) => setAgreed(e.target.checked)}
          className="mt-1 shrink-0"
        />
        <span className="text-[12px] leading-relaxed text-slate-600 whitespace-pre-wrap">
          {consentText}
        </span>
      </label>

      {error && (
        <p className="text-[13px] text-red-700 bg-red-50 border border-red-200 rounded-lg px-3 py-2">
          {error}
        </p>
      )}

      <button
        type="submit"
        disabled={!agreed || busy || phone.trim().length < 7}
        className="w-full inline-flex items-center justify-center gap-2 text-[14px] font-bold text-white bg-slate-900 hover:bg-slate-800 rounded-lg px-4 py-3 disabled:opacity-40 disabled:cursor-not-allowed"
      >
        {busy ? <Loader2 className="w-4 h-4 animate-spin" /> : <MessageSquare className="w-4 h-4" />}
        Send me a confirmation text
      </button>
    </form>
  );
}
