"use client";

import { useEffect, useState } from "react";
import { Search, Loader2, RefreshCw } from "lucide-react";
import { fetchStoredKeywordPulls, type KeywordPull } from "./actions";

function formatBid(micros: number | null): string {
  if (micros == null) return "—";
  return `$${(micros / 1_000_000).toFixed(2)}`;
}

export default function KeywordIntelligencePage() {
  const [pulls, setPulls] = useState<KeywordPull[]>([]);
  const [loading, setLoading] = useState(true);
  const [seed, setSeed] = useState("");
  const [running, setRunning] = useState(false);
  const [runError, setRunError] = useState<string | null>(null);

  const loadStored = () => {
    setLoading(true);
    fetchStoredKeywordPulls().then((result) => {
      setPulls(result);
      setLoading(false);
    });
  };

  useEffect(() => {
    loadStored();
  }, []);

  const runForecast = async () => {
    if (!seed.trim()) return;
    setRunning(true);
    setRunError(null);
    try {
      const res = await fetch("/api/keyword-intelligence/fetch", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ seedKeywords: [seed.trim()] }),
      });
      const body = await res.json();
      if (!res.ok) {
        setRunError(body.error + (body.missing_env_vars ? ` (missing: ${body.missing_env_vars.join(", ")})` : ""));
        return;
      }
      loadStored();
    } catch (err: any) {
      setRunError(err.message || "Request failed");
    } finally {
      setRunning(false);
    }
  };

  return (
    <div className="min-h-screen bg-slate-50">
      <div className="max-w-5xl mx-auto px-4 sm:px-6 py-10 sm:py-16">
        <div className="mb-10">
          <span className="inline-flex items-center gap-1.5 text-[10px] font-black uppercase tracking-widest text-indigo-700 bg-indigo-50 border border-indigo-100 rounded-full px-3 py-1 mb-4">
            Internal Tool
          </span>
          <h1 className="text-3xl font-black tracking-tight text-slate-950 leading-tight mb-2">
            Keyword Intelligence
          </h1>
          <p className="text-slate-600 text-sm leading-relaxed max-w-xl">
            Pulls live keyword ideas and volume/competition/bid data from the Google Ads
            KeywordPlanIdeaService and stores them here so our SEO landing pages and search
            strategy can be built on real data instead of manual Keyword Planner exports.
          </p>
        </div>

        <div className="bg-white border border-slate-200 rounded-2xl shadow-sm p-5 mb-8 flex flex-col sm:flex-row gap-3">
          <div className="flex-1 relative">
            <Search className="w-4 h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
            <input
              value={seed}
              onChange={(e) => setSeed(e.target.value)}
              onKeyDown={(e) => e.key === "Enter" && runForecast()}
              placeholder="Seed keyword, e.g. barbershop katy tx"
              className="w-full pl-9 pr-3 py-2.5 rounded-xl border border-slate-200 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500"
            />
          </div>
          <button
            onClick={runForecast}
            disabled={running || !seed.trim()}
            className="inline-flex items-center justify-center gap-2 px-5 py-2.5 rounded-xl bg-indigo-600 hover:bg-indigo-700 disabled:opacity-50 text-white font-extrabold text-xs uppercase tracking-wider transition-colors"
          >
            {running ? <Loader2 className="w-4 h-4 animate-spin" /> : <RefreshCw className="w-4 h-4" />}
            Run Forecast
          </button>
        </div>

        {runError && (
          <div className="bg-red-50 border border-red-200 rounded-2xl p-4 mb-8">
            <p className="text-sm text-red-900 leading-relaxed font-mono">{runError}</p>
          </div>
        )}

        {loading ? (
          <div className="flex justify-center py-16">
            <Loader2 className="w-6 h-6 text-slate-400 animate-spin" />
          </div>
        ) : pulls.length === 0 ? (
          <div className="bg-amber-50 border border-amber-200 rounded-2xl p-6">
            <p className="text-sm text-amber-900 leading-relaxed">
              No keyword pulls stored yet. Enter a seed keyword above and run a forecast.
            </p>
          </div>
        ) : (
          <div className="bg-white border border-slate-200 rounded-2xl shadow-sm overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-slate-200 text-left text-[10px] font-black uppercase tracking-wider text-slate-500">
                  <th className="px-4 py-3">Keyword</th>
                  <th className="px-4 py-3">Avg Monthly Searches</th>
                  <th className="px-4 py-3">Competition</th>
                  <th className="px-4 py-3">Low Bid</th>
                  <th className="px-4 py-3">High Bid</th>
                  <th className="px-4 py-3">Geo</th>
                  <th className="px-4 py-3">Pulled</th>
                </tr>
              </thead>
              <tbody className="[&>tr:not(:last-child)]:border-b [&>tr]:border-slate-100">
                {pulls.map((p) => (
                  <tr key={p.id}>
                    <td className="px-4 py-3 font-bold text-slate-900">{p.keyword_text}</td>
                    <td className="px-4 py-3 text-slate-600 tabular-nums">
                      {p.avg_monthly_searches != null ? p.avg_monthly_searches.toLocaleString() : "—"}
                    </td>
                    <td className="px-4 py-3 text-slate-600">{p.competition || "—"}</td>
                    <td className="px-4 py-3 text-slate-600 tabular-nums">{formatBid(p.low_top_of_page_bid_micros)}</td>
                    <td className="px-4 py-3 text-slate-600 tabular-nums">{formatBid(p.high_top_of_page_bid_micros)}</td>
                    <td className="px-4 py-3 text-slate-600">{p.geo_target || "—"}</td>
                    <td className="px-4 py-3 text-slate-500 text-xs">{new Date(p.pulled_at).toLocaleDateString()}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  );
}
