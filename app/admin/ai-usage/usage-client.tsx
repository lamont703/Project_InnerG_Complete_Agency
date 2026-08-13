"use client";

import { useEffect, useState, useCallback } from "react";
import { Loader2, RefreshCw, AlertTriangle, TrendingUp, Zap, Coins, FileText } from "lucide-react";
import { fetchUsage } from "./actions";
import { formatUsd, projectMonthlyUsd, MODEL_PRICING } from "@/lib/ai-usage";
import type { UsageSummary } from "@/lib/ai-usage-record";

/**
 * The AI spend dashboard.
 *
 * WHAT IT IS FOR: knowing what a message costs before the bill tells you, and
 * seeing the effect of a change to the prompt in the next call rather than the
 * next invoice. The context-trimming work is measured here — avg context size
 * is on screen precisely so a regression is visible.
 *
 * IT POLLS RATHER THAN STREAMS. Ten seconds is "real time" for a number that
 * only moves when somebody sends a chat message, and it needs no extra
 * infrastructure. Polling pauses when the tab is hidden — a dashboard left
 * open in a background tab overnight would otherwise be its own small
 * recurring cost, which would be a poor joke on a page about cost control.
 */

const WINDOWS = [
  { label: "Last hour", hours: 1 },
  { label: "24 hours", hours: 24 },
  { label: "7 days", hours: 24 * 7 },
  { label: "30 days", hours: 24 * 30 },
];

const POLL_MS = 10_000;

function Stat({
  icon: Icon,
  label,
  value,
  sub,
  tone = "default",
}: {
  icon: any;
  label: string;
  value: string;
  sub?: string;
  tone?: "default" | "warn";
}) {
  return (
    <div className={`rounded-2xl border p-5 ${tone === "warn" ? "border-amber-200 bg-amber-50" : "border-slate-200 bg-white"}`}>
      <div className="flex items-center gap-2 mb-2">
        <Icon className={`w-4 h-4 ${tone === "warn" ? "text-amber-600" : "text-slate-400"}`} />
        <p className="text-[10px] font-black uppercase tracking-widest text-slate-400">{label}</p>
      </div>
      <p className="text-2xl font-black text-slate-950 tabular-nums">{value}</p>
      {sub && <p className="text-xs text-slate-500 mt-1 leading-relaxed">{sub}</p>}
    </div>
  );
}

export function UsageClient() {
  const [windowHours, setWindowHours] = useState(24);
  const [data, setData] = useState<UsageSummary | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [lastUpdated, setLastUpdated] = useState<string | null>(null);

  const load = useCallback(async () => {
    const result = await fetchUsage(windowHours);
    if ("error" in result) {
      setError(result.error);
    } else {
      setData(result);
      setError(null);
      setLastUpdated(new Date().toLocaleTimeString());
    }
    setLoading(false);
  }, [windowHours]);

  useEffect(() => {
    setLoading(true);
    load();
    const timer = setInterval(() => {
      // Don't poll a dashboard nobody is looking at.
      if (document.visibilityState === "visible") load();
    }, POLL_MS);
    return () => clearInterval(timer);
  }, [load]);

  const days = data?.firstSeen
    ? Math.max((Date.now() - new Date(data.firstSeen).getTime()) / 86_400_000, 1 / 24)
    : null;
  const projected = data && days ? projectMonthlyUsd(data.totalCost, days) : null;
  const perCall = data && data.totalCalls > 0 ? data.totalCost / data.totalCalls : null;
  const okCalls = data ? data.totalCalls - data.errorCalls : 0;

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-center gap-2">
        {WINDOWS.map((w) => (
          <button
            key={w.hours}
            onClick={() => setWindowHours(w.hours)}
            className={`rounded-full border px-3.5 py-1.5 text-xs font-bold transition-colors ${
              windowHours === w.hours
                ? "border-blue-600 bg-blue-600 text-white"
                : "border-slate-200 bg-white text-slate-600 hover:bg-slate-50"
            }`}
          >
            {w.label}
          </button>
        ))}
        <button
          onClick={load}
          className="ml-auto inline-flex items-center gap-1.5 rounded-lg border border-slate-200 bg-white px-3 py-1.5 text-xs font-bold text-slate-600 hover:bg-slate-50"
        >
          <RefreshCw className="w-3.5 h-3.5" />
          Refresh
        </button>
        <span className="text-[11px] text-slate-400">
          {lastUpdated ? `updated ${lastUpdated} · auto every 10s` : "…"}
        </span>
      </div>

      {error && (
        <div className="rounded-xl border border-rose-200 bg-rose-50 px-4 py-3 text-sm font-bold text-rose-800">{error}</div>
      )}

      {loading && !data ? (
        <div className="flex items-center gap-2 text-sm text-slate-500 py-12 justify-center">
          <Loader2 className="w-4 h-4 animate-spin" /> Loading usage…
        </div>
      ) : data ? (
        <>
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
            <Stat
              icon={Coins}
              label="Spend, this window"
              value={formatUsd(data.totalCost)}
              sub={projected !== null ? `≈ ${formatUsd(projected)}/month at this rate` : undefined}
            />
            <Stat
              icon={Zap}
              label="Cost per message"
              value={perCall === null ? "—" : formatUsd(perCall)}
              sub={`${okCalls} ok · ${data.errorCalls} failed`}
              tone={data.errorCalls > 0 ? "warn" : "default"}
            />
            <Stat
              icon={FileText}
              label="Avg context sent"
              value={data.avgContextChars === null ? "—" : `${(data.avgContextChars / 1000).toFixed(1)}k`}
              sub={
                data.avgContextChars === null
                  ? undefined
                  : `chars ≈ ${Math.round(data.avgContextChars / 4).toLocaleString()} tokens per message`
              }
            />
            <Stat
              icon={TrendingUp}
              label="Tokens"
              value={`${((data.totalInputTokens + data.totalOutputTokens + data.totalThinkingTokens) / 1000).toFixed(1)}k`}
              sub={`${data.totalInputTokens.toLocaleString()} in · ${data.totalOutputTokens.toLocaleString()} out${
                data.totalThinkingTokens ? ` · ${data.totalThinkingTokens.toLocaleString()} thinking` : ""
              }`}
            />
          </div>

          {data.errorCalls > 0 && (
            <div className="flex items-start gap-2.5 rounded-xl border border-amber-200 bg-amber-50 px-4 py-3">
              <AlertTriangle className="w-4 h-4 text-amber-600 mt-0.5 shrink-0" />
              <p className="text-xs text-amber-900 leading-relaxed">
                <strong>{data.errorCalls} failed call{data.errorCalls === 1 ? "" : "s"}</strong> in this window. A failure
                costs no tokens but still costs a person their answer — check the <code>kind</code> column below.
                <code className="ml-1">upstream_quota</code> means the provider's cap, not ours.
              </p>
            </div>
          )}

          <div className="rounded-2xl border border-slate-200 bg-white overflow-hidden">
            <div className="px-5 py-3.5 border-b border-slate-100">
              <h2 className="text-sm font-black text-slate-900">Every call, newest first</h2>
              <p className="text-[11px] text-slate-500 mt-0.5">
                One 40k-token outlier is invisible in an average — this is where it shows up.
              </p>
            </div>
            <div className="overflow-x-auto">
              <table className="w-full text-xs">
                <thead>
                  <tr className="bg-slate-50 text-left text-[10px] font-black uppercase tracking-wider text-slate-400">
                    <th className="px-4 py-2.5">Time</th>
                    <th className="px-4 py-2.5">Route</th>
                    <th className="px-4 py-2.5 text-right">In</th>
                    <th className="px-4 py-2.5 text-right">Out</th>
                    <th className="px-4 py-2.5 text-right">Context</th>
                    <th className="px-4 py-2.5 text-right">Gen</th>
                    <th className="px-4 py-2.5 text-right">Latency</th>
                    <th className="px-4 py-2.5 text-right">Cost</th>
                    <th className="px-4 py-2.5">Status</th>
                    <th className="px-4 py-2.5">Who</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-50">
                  {data.events.length === 0 && (
                    <tr>
                      <td colSpan={10} className="px-4 py-8 text-center text-slate-400">
                        No calls recorded in this window.
                      </td>
                    </tr>
                  )}
                  {data.events.map((e) => (
                    <tr key={e.id} className={e.status === "error" ? "bg-rose-50/40" : undefined}>
                      <td className="px-4 py-2.5 text-slate-500 whitespace-nowrap">
                        {new Date(e.createdAt).toLocaleTimeString()}
                      </td>
                      <td className="px-4 py-2.5 font-mono text-[11px] text-slate-600">{e.route}</td>
                      <td className="px-4 py-2.5 text-right tabular-nums text-slate-700">{e.inputTokens.toLocaleString()}</td>
                      <td className="px-4 py-2.5 text-right tabular-nums text-slate-700">
                        {e.outputTokens.toLocaleString()}
                        {e.thinkingTokens > 0 && <span className="text-slate-400"> +{e.thinkingTokens}</span>}
                      </td>
                      <td className="px-4 py-2.5 text-right tabular-nums text-slate-500">
                        {e.contextChars === null ? "—" : `${(e.contextChars / 1000).toFixed(1)}k`}
                      </td>
                      <td className="px-4 py-2.5 text-right tabular-nums text-slate-500">
                        {e.generations}
                        {e.toolCalls > 0 && <span className="text-blue-600 font-bold"> ⚒{e.toolCalls}</span>}
                      </td>
                      <td className="px-4 py-2.5 text-right tabular-nums text-slate-500">
                        {e.latencyMs === null ? "—" : `${(e.latencyMs / 1000).toFixed(1)}s`}
                      </td>
                      <td className="px-4 py-2.5 text-right tabular-nums font-bold text-slate-900">{formatUsd(e.costUsd)}</td>
                      <td className="px-4 py-2.5">
                        {e.status === "ok" ? (
                          <span className="text-emerald-700 font-bold">ok</span>
                        ) : (
                          <span className="text-rose-700 font-bold">{e.errorKind || "error"}</span>
                        )}
                      </td>
                      <td className="px-4 py-2.5 text-slate-500">{e.isMember ? "member" : "anon"}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>

          <p className="text-[11px] text-slate-400 leading-relaxed">
            Token counts are what the provider reported, never estimated from characters. Costs are priced at write time
            from the rate table in <code>lib/ai-usage.ts</code> — currently{" "}
            {Object.entries(MODEL_PRICING)
              .filter(([, p]) => p.inputPerMillion > 0)
              .map(([m, p]) => `${m} at $${p.inputPerMillion}/M in, $${p.outputPerMillion}/M out (read ${p.verifiedOn})`)
              .join("; ")}
            . Re-check those rates before trusting a figure; a stale rate produces a confident wrong number.
          </p>
        </>
      ) : null}
    </div>
  );
}
