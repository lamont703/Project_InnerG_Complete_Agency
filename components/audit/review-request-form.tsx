"use client";

import { useState } from "react";

/** "Request a free profile review" on a shared audit page. The consent line is shown verbatim and stored with the request. */
export function ReviewRequestForm({ via, entityType, slug, consentText }: { via: string; entityType: string; slug: string; consentText: string }) {
  const [f, setF] = useState({ name: "", phone: "", email: "", message: "" });
  const [consent, setConsent] = useState(false);
  const [state, setState] = useState<"idle" | "busy" | "done">("idle");
  const [error, setError] = useState<string | null>(null);
  if (state === "done") return <p className="rounded-xl bg-emerald-50 p-4 text-sm font-bold text-emerald-800">Thanks — they&apos;ll be in touch about your review.</p>;
  const input = "w-full rounded-xl border border-slate-200 px-4 py-2.5 text-sm";
  return (
    <form
      className="space-y-3"
      onSubmit={async (e) => {
        e.preventDefault();
        setState("busy");
        setError(null);
        const r = await fetch("/api/audit-request", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ ...f, consent, via, entityType, slug }) });
        const j = await r.json().catch(() => ({}));
        if (j.ok) setState("done");
        else { setError(j.error || "Something went wrong."); setState("idle"); }
      }}
    >
      <input className={input} placeholder="Your name" aria-label="Your name" value={f.name} onChange={(e) => setF({ ...f, name: e.target.value })} />
      <div className="grid gap-3 sm:grid-cols-2">
        <input className={input} placeholder="Phone" aria-label="Phone" inputMode="tel" value={f.phone} onChange={(e) => setF({ ...f, phone: e.target.value })} />
        <input className={input} placeholder="Email" aria-label="Email" inputMode="email" value={f.email} onChange={(e) => setF({ ...f, email: e.target.value })} />
      </div>
      <textarea className={input} rows={2} placeholder="Anything they should know? (optional)" aria-label="Message" value={f.message} onChange={(e) => setF({ ...f, message: e.target.value })} />
      <label className="flex items-start gap-2 text-xs text-slate-600">
        <input type="checkbox" checked={consent} onChange={(e) => setConsent(e.target.checked)} className="mt-0.5 h-4 w-4" />
        <span>{consentText}</span>
      </label>
      {error && <p className="text-sm text-rose-700">{error}</p>}
      <button disabled={state === "busy" || !consent} className="rounded-xl bg-slate-900 px-5 py-2.5 text-sm font-black text-white disabled:opacity-50">
        {state === "busy" ? "Sending…" : "Request my free review"}
      </button>
    </form>
  );
}
