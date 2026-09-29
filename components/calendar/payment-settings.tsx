"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";

/**
 * The pro's payment and cancellation settings on /account/calendar. The same
 * rules Claude sets with set_booking_payments_and_policy, saved through
 * /api/calendar/settings/payments (lib/calendar/payments.ts savePaymentRules),
 * which refuses deposits and full payment without the Manage plan and a Stripe
 * account that can take cards.
 */

export interface PaymentSettingsProps {
  stripe: "none" | "pending" | "ready";
  planAllowsPayments: boolean;
  notInEffect: string | null;
  /** What Stripe is still waiting for, in plain words ("a photo ID"). */
  stripeNeeds?: string[];
  initial: {
    payment_mode: "none" | "deposit" | "full";
    deposit_kind: "percent" | "fixed";
    deposit_value: number;
    tips_enabled: boolean;
    client_can_cancel: boolean;
    client_can_reschedule: boolean;
    change_cutoff_minutes: number;
    full_refund_minutes: number;
    late_cancel_refund_percent: number;
    no_show_refund_percent: number;
    max_reschedules: number | null;
    policy_note: string | null;
  };
  clientLines: string[];
}

const box = "mt-1 w-full rounded-xl border border-slate-300 px-3 py-2 text-sm";
const label = "text-xs font-black uppercase tracking-wide text-slate-500";

export function PaymentSettings({ stripe, planAllowsPayments, notInEffect, stripeNeeds = [], initial, clientLines }: PaymentSettingsProps) {
  const router = useRouter();
  const [mode, setMode] = useState(initial.payment_mode);
  const [depositKind, setDepositKind] = useState(initial.deposit_kind);
  const [depositValue, setDepositValue] = useState(
    initial.deposit_kind === "percent" ? String(initial.deposit_value) : (initial.deposit_value / 100).toFixed(2).replace(/\.00$/, "")
  );
  const [tips, setTips] = useState(initial.tips_enabled);
  const [canCancel, setCanCancel] = useState(initial.client_can_cancel);
  const [canMove, setCanMove] = useState(initial.client_can_reschedule);
  const [cutoff, setCutoff] = useState(String(initial.change_cutoff_minutes / 60));
  const [fullRefund, setFullRefund] = useState(String(initial.full_refund_minutes / 60));
  const [latePct, setLatePct] = useState(String(initial.late_cancel_refund_percent));
  const [noShowPct, setNoShowPct] = useState(String(initial.no_show_refund_percent));
  const [maxMoves, setMaxMoves] = useState(initial.max_reschedules == null ? "" : String(initial.max_reschedules));
  const [note, setNote] = useState(initial.policy_note ?? "");
  const [busy, setBusy] = useState<"save" | "stripe" | null>(null);
  const [msg, setMsg] = useState<{ ok: boolean; text: string } | null>(null);

  const connect = async () => {
    setBusy("stripe"); setMsg(null);
    const r = await fetch("/api/calendar/payments/setup", { method: "POST" });
    const j = await r.json().catch(() => ({}));
    if (j.ok && j.url) { window.location.href = j.url; return; }
    setMsg({ ok: false, text: j.error || "Couldn't open Stripe." });
    setBusy(null);
  };

  const save = async () => {
    setBusy("save"); setMsg(null);
    const body: Record<string, unknown> = {
      payment_mode: mode,
      tips_enabled: tips,
      client_can_cancel: canCancel,
      client_can_reschedule: canMove,
      change_cutoff_hours: cutoff,
      full_refund_hours: fullRefund,
      late_cancel_refund_percent: latePct,
      no_show_refund_percent: noShowPct,
      max_reschedules: maxMoves === "" ? "unlimited" : maxMoves,
      policy_note: note,
    };
    if (mode === "deposit") body[depositKind === "percent" ? "deposit_percent" : "deposit_dollars"] = depositValue;
    const r = await fetch("/api/calendar/settings/payments", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify(body) });
    const j = await r.json().catch(() => ({}));
    setBusy(null);
    if (!j.ok) return setMsg({ ok: false, text: j.error || "Not saved." });
    setMsg({ ok: true, text: j.notInEffect ? `Saved. ${j.notInEffect}` : "Saved." });
    router.refresh();
  };

  const paymentsLocked = !planAllowsPayments || stripe !== "ready";

  return (
    <section className="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm">
      <h2 className="text-sm font-black uppercase tracking-wide text-slate-500">Payments and cancellations</h2>

      <div className="mt-4 rounded-xl border border-slate-200 bg-slate-50 p-4 text-sm">
        <p className="font-bold">
          {stripe === "ready" ? "Stripe is connected — clients pay you directly." : stripe === "pending" ? "Stripe setup isn't finished." : "Connect your own Stripe account to take payments and tips."}
        </p>
        {stripe === "pending" && (
          <p className="mt-1 font-semibold text-amber-800">
            {stripeNeeds.length
              ? `Stripe still needs ${stripeNeeds.join(", ")}. Finish setup to start taking payments.`
              : "Stripe is checking your details. That usually takes a minute or two — refresh this page to see if it's done."}
          </p>
        )}
        <p className="mt-1 text-slate-600">
          Money goes straight to your Stripe account. ShearQuery takes no fee per booking; Stripe&apos;s own card fee applies. Refunds and disputes are in your Stripe Dashboard.
        </p>
        <div className="mt-3 flex flex-wrap gap-3">
          {stripe === "none" || stripeNeeds.length > 0 ? (
            <button onClick={connect} disabled={busy !== null} className="rounded-xl bg-slate-900 px-4 py-2 text-sm font-black text-white disabled:opacity-50">
              {busy === "stripe" ? "Opening Stripe…" : stripe === "pending" ? "Finish Stripe setup" : "Connect Stripe"}
            </button>
          ) : null}
          {stripe === "ready" && <a href="https://dashboard.stripe.com" target="_blank" rel="noreferrer" className="text-sm font-bold text-blue-700 underline">Open your Stripe Dashboard</a>}
        </div>
      </div>

      <div className="mt-5 space-y-5">
        <fieldset>
          <legend className={label}>When clients book</legend>
          <div className="mt-2 grid gap-2 sm:grid-cols-3">
            {([["none", "No payment"], ["deposit", "Take a deposit"], ["full", "Full payment"]] as const).map(([v, t]) => (
              <label key={v} className={`flex items-center gap-2 rounded-xl border px-3 py-2 text-sm ${mode === v ? "border-slate-900 font-bold" : "border-slate-200"} ${v !== "none" && paymentsLocked ? "opacity-50" : ""}`}>
                <input type="radio" name="mode" value={v} checked={mode === v} disabled={v !== "none" && paymentsLocked && mode !== v} onChange={() => setMode(v)} />
                {t}
              </label>
            ))}
          </div>
          {!planAllowsPayments && <p className="mt-2 text-xs text-slate-500">Deposits and full payment are on the Manage plan.</p>}
          {planAllowsPayments && stripe !== "ready" && <p className="mt-2 text-xs text-slate-500">Connect Stripe first to take a deposit or full payment.</p>}
          {notInEffect && <p className="mt-2 text-xs font-semibold text-amber-800">{notInEffect}</p>}
        </fieldset>

        {mode === "deposit" && (
          <div className="flex flex-wrap items-end gap-3">
            <label className="block">
              <span className={label}>Deposit</span>
              <input value={depositValue} onChange={(e) => setDepositValue(e.target.value.replace(/[^\d.]/g, ""))} inputMode="decimal" className={`${box} w-28`} />
            </label>
            <select value={depositKind} onChange={(e) => setDepositKind(e.target.value as any)} className="rounded-xl border border-slate-300 px-3 py-2 text-sm">
              <option value="percent">% of the price</option>
              <option value="fixed">dollars</option>
            </select>
          </div>
        )}

        <label className="flex items-center gap-2 text-sm">
          <input type="checkbox" checked={tips} onChange={(e) => setTips(e.target.checked)} /> Let clients add a tip {stripe !== "ready" && <span className="text-xs text-slate-500">(once Stripe is connected)</span>}
        </label>

        <fieldset className="space-y-3">
          <legend className={label}>Cancellation rules</legend>
          <label className="flex items-center gap-2 text-sm"><input type="checkbox" checked={canCancel} onChange={(e) => setCanCancel(e.target.checked)} /> Clients can cancel online</label>
          <label className="flex items-center gap-2 text-sm"><input type="checkbox" checked={canMove} onChange={(e) => setCanMove(e.target.checked)} /> Clients can reschedule online</label>
          <div className="grid gap-3 sm:grid-cols-2">
            <label className="block text-sm">Online changes stop this many hours before
              <input value={cutoff} onChange={(e) => setCutoff(e.target.value.replace(/[^\d.]/g, ""))} inputMode="decimal" className={box} />
            </label>
            <label className="block text-sm">Most times a booking can be moved (blank = no limit)
              <input value={maxMoves} onChange={(e) => setMaxMoves(e.target.value.replace(/\D/g, ""))} inputMode="numeric" className={box} />
            </label>
            <label className="block text-sm">Full refund if cancelled at least this many hours ahead
              <input value={fullRefund} onChange={(e) => setFullRefund(e.target.value.replace(/[^\d.]/g, ""))} inputMode="decimal" className={box} />
            </label>
            <label className="block text-sm">Refund for a later cancellation (%)
              <input value={latePct} onChange={(e) => setLatePct(e.target.value.replace(/\D/g, ""))} inputMode="numeric" className={box} />
            </label>
            <label className="block text-sm">Refund for a no-show (%)
              <input value={noShowPct} onChange={(e) => setNoShowPct(e.target.value.replace(/\D/g, ""))} inputMode="numeric" className={box} />
            </label>
          </div>
          <label className="block text-sm">Anything else clients should know (optional)
            <textarea value={note} onChange={(e) => setNote(e.target.value.slice(0, 500))} rows={2} className={box} placeholder="e.g. More than 15 minutes late counts as a no-show." />
          </label>
          <p className="text-xs text-slate-500">Tips are always returned if the visit doesn&apos;t happen, and if you cancel, everything is refunded. Bookings already made keep the rules they were booked under.</p>
        </fieldset>

        {msg && <p className={`text-sm font-semibold ${msg.ok ? "text-emerald-700" : "text-rose-700"}`}>{msg.text}</p>}
        <button onClick={save} disabled={busy !== null} className="rounded-xl bg-slate-900 px-5 py-2.5 text-sm font-black text-white disabled:opacity-50">
          {busy === "save" ? "Saving…" : "Save"}
        </button>

        <div className="rounded-xl border border-slate-200 p-4">
          <p className={label}>What clients see before booking</p>
          <ul className="mt-2 list-disc space-y-1 pl-4 text-sm text-slate-700">{clientLines.map((l) => <li key={l}>{l}</li>)}</ul>
        </div>
      </div>
    </section>
  );
}
