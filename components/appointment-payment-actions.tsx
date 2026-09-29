"use client";

import { useState } from "react";

/**
 * Money actions on a client's appointment link: finishing a payment that's
 * holding their time, and tipping the pro. Both hand off to Stripe's page on
 * the pro's own account (lib/calendar/payments.ts).
 */

async function go(path: string, body: Record<string, unknown>): Promise<string> {
  const r = await fetch(path, { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify(body) });
  const j = await r.json().catch(() => ({}));
  if (!j.ok) throw new Error(j.error || "Something went wrong.");
  return j.url as string;
}

export function PayNowButton({ token, label }: { token: string; label: string }) {
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  return (
    <div>
      <button
        disabled={busy}
        onClick={async () => {
          setBusy(true); setError(null);
          try { window.location.href = await go("/api/calendar/public/pay", { token }); }
          catch (e: any) { setError(e.message); setBusy(false); }
        }}
        className="rounded-xl bg-slate-900 px-4 py-2.5 text-sm font-black text-white disabled:opacity-50"
      >
        {busy ? "Opening…" : label}
      </button>
      {error && <p className="mt-2 text-sm font-semibold text-rose-700">{error}</p>}
    </div>
  );
}

export function TipForm({ token, priceCents }: { token: string; priceCents: number | null }) {
  const presets = priceCents ? [15, 20, 25].map((p) => Math.max(100, Math.round((priceCents * p) / 100))) : [500, 1000, 1500];
  const [cents, setCents] = useState<number | null>(null);
  const [custom, setCustom] = useState("");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const amount = custom ? Math.round(Number(custom) * 100) : cents;
  const dollars = (c: number) => `$${(c / 100).toFixed(c % 100 ? 2 : 0)}`;
  return (
    <div className="space-y-2">
      <p className="text-sm font-bold">Leave a tip</p>
      <div className="flex flex-wrap gap-2">
        {presets.map((c) => (
          <button
            key={c}
            onClick={() => { setCents(c); setCustom(""); }}
            className={`rounded-full border px-3 py-1.5 text-xs font-bold ${cents === c && !custom ? "border-slate-900 bg-slate-900 text-white" : "border-slate-200 bg-white"}`}
          >
            {dollars(c)}
          </button>
        ))}
        <input
          value={custom}
          onChange={(e) => setCustom(e.target.value.replace(/[^\d.]/g, "").slice(0, 7))}
          placeholder="Other $"
          inputMode="decimal"
          className="w-24 rounded-full border border-slate-200 px-3 py-1.5 text-xs"
        />
      </div>
      <button
        disabled={busy || !amount || amount < 50}
        onClick={async () => {
          setBusy(true); setError(null);
          try { window.location.href = await go("/api/calendar/public/tip", { token, cents: amount }); }
          catch (e: any) { setError(e.message); setBusy(false); }
        }}
        className="rounded-xl border border-slate-900 px-4 py-2 text-sm font-black disabled:opacity-40"
      >
        {busy ? "Opening…" : amount && amount >= 50 ? `Tip ${dollars(amount)}` : "Tip"}
      </button>
      {error && <p className="text-sm font-semibold text-rose-700">{error}</p>}
    </div>
  );
}
