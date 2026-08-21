"use client";

import React from "react";
import { Ticket, RefreshCw, Loader2 } from "lucide-react";
import type { OfferStats } from "@/lib/offers/haircut-offer";
import { reconcileOfferRedemptions } from "@/app/admin/rebooking/actions";
import { useRouter } from "next/navigation";

/**
 * Discount codes issued, and — the point of the whole thing — redeemed.
 *
 * A REDEMPTION IS THE ONLY CAUSAL EVIDENCE ON THIS PAGE. The impact panel above
 * has to label itself observational, because 85–96% of overdue clients return
 * unprompted and no arithmetic separates the message from the habit. A code
 * that exists for one person, issued with one message, used once, does separate
 * them. That is why these numbers are shown next to the estimated ones rather
 * than folded into them.
 */
export function HaircutOffersPanel({ stats }: { stats: OfferStats }) {
  const router = useRouter();
  const [busy, setBusy] = React.useState(false);
  const [msg, setMsg] = React.useState<string | null>(null);

  async function refresh() {
    setBusy(true);
    setMsg(null);
    const r = await reconcileOfferRedemptions();
    setBusy(false);
    setMsg(r.ok ? `Checked ${r.result.checked} open codes — ${r.result.matched} newly redeemed.` : r.error);
    router.refresh();
  }

  const net = stats.revenueFromRedemptions - stats.discountGivenAway;

  return (
    <div className="mb-6 bg-white border border-slate-200 rounded-xl p-4">
      <div className="flex flex-wrap items-start justify-between gap-3 mb-3">
        <div>
          <h2 className="text-[13px] font-black uppercase tracking-widest text-slate-700 flex items-center gap-1.5">
            <Ticket className="w-3.5 h-3.5 text-amber-600" />
            20% off codes
          </h2>
          <p className="text-[12px] text-slate-500 mt-0.5">
            One per client, 10 days to use it. A redemption is proof the message worked.
          </p>
        </div>
        <button
          type="button"
          onClick={refresh}
          disabled={busy}
          className="inline-flex items-center gap-1.5 text-[11px] font-bold uppercase tracking-wider text-slate-700 border border-slate-200 hover:border-slate-300 bg-white rounded-md px-3 py-2 disabled:opacity-50"
        >
          {busy ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <RefreshCw className="w-3.5 h-3.5" />}
          Check redemptions
        </button>
      </div>

      <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 mb-3">
        {[
          { label: "Issued", value: String(stats.issued), sub: "" },
          { label: "Redeemed", value: String(stats.redeemed), sub: "confirmed visits", tone: "text-emerald-600" },
          { label: "Still open", value: String(stats.outstanding), sub: "not expired yet" },
          { label: "Expired unused", value: String(stats.expiredUnused), sub: "cost nothing" },
        ].map((s) => (
          <div key={s.label} className="bg-slate-50 border border-slate-200 rounded-lg px-3 py-2">
            <div className={`text-lg font-black tabular-nums ${s.tone ?? "text-slate-900"}`}>{s.value}</div>
            <div className="text-[10px] uppercase tracking-widest text-slate-400 font-bold">{s.label}</div>
            {s.sub && <div className="text-[10px] text-slate-500">{s.sub}</div>}
          </div>
        ))}
      </div>

      {stats.redeemed > 0 && (
        <div className="text-[12px] text-slate-600 bg-slate-50 border border-slate-200 rounded-lg px-3.5 py-2.5 mb-3 flex flex-wrap gap-x-5 gap-y-1">
          <span>
            Revenue from redemptions{" "}
            <strong className="text-slate-900">${stats.revenueFromRedemptions.toFixed(2)}</strong>
          </span>
          <span>
            Discount given away{" "}
            <strong className="text-slate-900">${stats.discountGivenAway.toFixed(2)}</strong>
          </span>
          <span>
            Net <strong className={net >= 0 ? "text-emerald-700" : "text-red-700"}>${net.toFixed(2)}</strong>
          </span>
        </div>
      )}

      <div className="grid sm:grid-cols-2 gap-2">
        {([
          ["sms_opt_in", "Text opt-in incentive"],
          ["win_back", "Win-back (60+ days late)"],
        ] as const).map(([key, label]) => {
          const c = stats.byContext[key];
          const rate = c.issued > 0 ? ((c.redeemed / c.issued) * 100).toFixed(0) : "—";
          return (
            <div key={key} className="border border-slate-200 rounded-lg px-3 py-2">
              <div className="text-[12px] font-bold text-slate-800">{label}</div>
              <div className="text-[12px] text-slate-500">
                {c.issued} issued · {c.redeemed} redeemed{c.issued > 0 ? ` · ${rate}%` : ""}
              </div>
            </div>
          );
        })}
      </div>

      {msg && <p className="mt-3 text-[12px] text-slate-600">{msg}</p>}
    </div>
  );
}
