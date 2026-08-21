"use client";

import React from "react";
import { TrendingUp, Info, FlaskConical } from "lucide-react";
import type { AttributionSummary } from "@/lib/rebooking/attribution";
import type { BaselineBucket } from "@/lib/rebooking/baseline";

/**
 * What the agent has been worth — with the caveat attached to the number rather
 * than buried under it.
 *
 * The temptation this component resists is printing the return rate as the
 * headline. Eighty-five percent of this shop's overdue clients came back within
 * a fortnight across four years in which no message was ever sent, so a raw
 * return rate is mostly a measurement of habit. What is shown big is the LIFT
 * over that baseline, and where the sample is too small to mean anything the
 * page says so instead of showing a figure.
 */

function pct(v: number | null): string {
  return v === null ? "—" : `${(v * 100).toFixed(0)}%`;
}

export function RebookingImpact({
  summary,
  baseline,
}: {
  summary: AttributionSummary;
  baseline: BaselineBucket[];
}) {
  const [showBaseline, setShowBaseline] = React.useState(false);

  const nothingYet = summary.settled === 0 && summary.pending === 0;

  return (
    <div className="mb-6 bg-white border border-slate-200 rounded-xl p-4">
      <h2 className="text-[13px] font-black uppercase tracking-widest text-slate-700 flex items-center gap-1.5 mb-0.5">
        <TrendingUp className="w-3.5 h-3.5 text-emerald-600" />
        Impact
      </h2>
      <p className="text-[12px] text-slate-500 mb-3">
        Measured against what this shop&apos;s own history says happens when nobody reaches out.
      </p>

      {nothingYet ? (
        <p className="text-[13px] text-slate-500 bg-slate-50 border border-slate-200 rounded-lg px-3.5 py-3">
          No outreach logged yet. Every time you press <strong>&ldquo;I reached out&rdquo;</strong> on a
          client, it&apos;s recorded here with how late they were — and whether they came back gets
          matched from Shopify automatically.
        </p>
      ) : (
        <>
          {summary.underpowered && (
            <p className="text-[12px] text-amber-900 bg-amber-50 border border-amber-200 rounded-lg px-3.5 py-2.5 mb-3 flex items-start gap-2">
              <Info className="w-3.5 h-3.5 shrink-0 mt-px" />
              <span>
                <strong>Too early to call.</strong> {summary.settled} of about{" "}
                {summary.minimumUseful} sends have run their course. Below that, the difference
                below is as likely to be noise as signal — this shop produces roughly 100–120
                qualifying clients a year, so a number worth quoting is months away.
              </span>
            </p>
          )}

          <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 mb-3">
            <Stat label="Came back" value={pct(summary.observedRate)} sub={`${summary.returned} of ${summary.settled}`} />
            <Stat label="History predicts" value={pct(summary.expectedRate)} sub="without a message" />
            <Stat
              label="Difference"
              value={summary.liftPoints === null ? "—" : `${summary.liftPoints > 0 ? "+" : ""}${summary.liftPoints.toFixed(0)}pts`}
              tone={summary.liftPoints === null ? "" : summary.liftPoints > 0 ? "text-emerald-600" : "text-red-600"}
              sub="over baseline"
            />
            <Stat
              label="Extra visits"
              value={summary.attributableVisits === null ? "—" : summary.attributableVisits.toFixed(1)}
              sub={
                summary.attributableRevenue === null
                  ? "—"
                  : `≈ $${Math.round(summary.attributableRevenue).toLocaleString("en-US")}`
              }
            />
          </div>

          <div className="flex flex-wrap gap-x-6 gap-y-1 text-[12px] text-slate-500">
            <span>{summary.pending} still pending</span>
            <span>Cost ${summary.costDollars.toFixed(2)}</span>
            {summary.returnOnCost !== null && (
              <span>
                Return on cost <strong className="text-slate-800">{summary.returnOnCost}×</strong>
              </span>
            )}
          </div>

          <p className="mt-3 text-[11px] text-slate-500 bg-slate-50 border border-slate-200 rounded px-3 py-2 flex items-start gap-1.5">
            <FlaskConical className="w-3 h-3 shrink-0 mt-px" />
            <span>
              <strong>Observational, not proof.</strong> Every due client gets contacted, so this
              compares against a historical period rather than a control group running at the same
              time. It supports &ldquo;the return rate is above what history predicts&rdquo;. It does
              not prove the agent caused it — that needs a holdout.
            </span>
          </p>
        </>
      )}

      <button
        type="button"
        onClick={() => setShowBaseline((v) => !v)}
        className="mt-3 text-[11px] font-bold uppercase tracking-wider text-slate-500 hover:text-slate-800"
      >
        {showBaseline ? "Hide" : "Show"} the baseline this is measured against
      </button>

      {showBaseline && (
        <div className="mt-2 border border-slate-200 rounded-lg overflow-hidden">
          <table className="w-full text-[12px]">
            <thead className="bg-slate-50 text-slate-500">
              <tr>
                <th className="text-left font-bold px-3 py-1.5">How late</th>
                <th className="text-right font-bold px-3 py-1.5">Came back anyway</th>
                <th className="text-right font-bold px-3 py-1.5">Events</th>
              </tr>
            </thead>
            <tbody>
              {baseline.map((b) => (
                <tr key={b.label} className="border-t border-slate-100">
                  <td className="px-3 py-1.5 text-slate-700">{b.label}</td>
                  <td className="px-3 py-1.5 text-right font-bold text-slate-900 tabular-nums">
                    {b.returnRate === null ? "too few" : `${(b.returnRate * 100).toFixed(1)}%`}
                  </td>
                  <td className="px-3 py-1.5 text-right text-slate-400 tabular-nums">{b.reached}</td>
                </tr>
              ))}
            </tbody>
          </table>
          <p className="text-[11px] text-slate-500 px-3 py-2 bg-slate-50 border-t border-slate-100">
            From this shop&apos;s own orders, over a period when no rebooking message was ever sent.
          </p>
        </div>
      )}
    </div>
  );
}

function Stat({ label, value, sub, tone = "" }: { label: string; value: string; sub?: string; tone?: string }) {
  return (
    <div className="bg-slate-50 border border-slate-200 rounded-lg px-3 py-2.5">
      <div className={`text-xl font-black tabular-nums ${tone || "text-slate-900"}`}>{value}</div>
      <div className="text-[10px] uppercase tracking-widest text-slate-400 font-bold mt-0.5">{label}</div>
      {sub && <div className="text-[11px] text-slate-500 mt-0.5">{sub}</div>}
    </div>
  );
}
