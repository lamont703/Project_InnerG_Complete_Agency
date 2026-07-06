"use client";

import { useMemo, useState } from "react";
import { Compass, ArrowRight, ArrowUp, ArrowDown } from "lucide-react";
import type { EmploymentMatchRow } from "./data";

type ConfTier = "high" | "mid" | "low";

function confTier(score: number): ConfTier {
  if (score >= 70) return "high";
  if (score >= 40) return "mid";
  return "low";
}

const TIER_STYLES: Record<ConfTier, string> = {
  high: "bg-emerald-50 text-emerald-700 border-emerald-100",
  mid: "bg-amber-50 text-amber-700 border-amber-100",
  low: "bg-rose-50 text-rose-700 border-rose-100",
};

const TIER_LABELS: Record<ConfTier, string> = { high: "High", mid: "Medium", low: "Low" };

type SortKey = "professionalName" | "professionalType" | "venueName" | "venueType" | "distanceMiles" | "confidenceScore";

export function EmploymentMatchReview({ data }: { data: EmploymentMatchRow[] }) {
  const [search, setSearch] = useState("");
  const [typeFilter, setTypeFilter] = useState<"all" | "barber" | "cosmetologist">("all");
  const [confFilter, setConfFilter] = useState<"all" | ConfTier>("all");
  const [sortKey, setSortKey] = useState<SortKey>("confidenceScore");
  const [sortDir, setSortDir] = useState<"asc" | "desc">("desc");

  const total = data.length;
  const barberCount = useMemo(() => data.filter((d) => d.professionalType === "barber").length, [data]);
  const cosmetCount = total - barberCount;
  const highCount = useMemo(() => data.filter((d) => confTier(d.confidenceScore) === "high").length, [data]);
  const avgDistance = useMemo(() => (data.reduce((s, d) => s + d.distanceMiles, 0) / (total || 1)), [data, total]);

  const buckets = useMemo(() => {
    const ranges: { label: string; min: number; max: number }[] = [
      { label: "90–100", min: 90, max: 101 },
      { label: "70–90", min: 70, max: 90 },
      { label: "50–70", min: 50, max: 70 },
      { label: "25–50", min: 25, max: 50 },
      { label: "<25", min: -1, max: 25 },
    ];
    const counts = ranges.map((r) => data.filter((d) => d.confidenceScore >= r.min && d.confidenceScore < r.max).length);
    const max = Math.max(...counts, 1);
    return ranges.map((r, i) => ({ ...r, count: counts[i], pct: (counts[i] / max) * 100 }));
  }, [data]);

  const filtered = useMemo(() => {
    let rows = data;
    if (typeFilter !== "all") rows = rows.filter((r) => r.professionalType === typeFilter);
    if (confFilter !== "all") rows = rows.filter((r) => confTier(r.confidenceScore) === confFilter);
    if (search.trim()) {
      const q = search.trim().toLowerCase();
      rows = rows.filter((r) => r.professionalName.toLowerCase().includes(q) || r.venueName.toLowerCase().includes(q));
    }
    return [...rows].sort((a, b) => {
      const av = a[sortKey];
      const bv = b[sortKey];
      let cmp = 0;
      if (typeof av === "string" && typeof bv === "string") cmp = av.localeCompare(bv);
      else cmp = (av as number) - (bv as number);
      return sortDir === "asc" ? cmp : -cmp;
    });
  }, [data, typeFilter, confFilter, search, sortKey, sortDir]);

  const handleSort = (key: SortKey) => {
    if (key === sortKey) {
      setSortDir((d) => (d === "asc" ? "desc" : "asc"));
    } else {
      setSortKey(key);
      setSortDir(key === "confidenceScore" ? "desc" : "asc");
    }
  };

  const SortHeader = ({ label, k }: { label: string; k: SortKey }) => (
    <th
      onClick={() => handleSort(k)}
      className="px-4 py-3 text-left text-[10px] font-bold uppercase tracking-wider text-slate-500 cursor-pointer hover:text-slate-900 select-none whitespace-nowrap"
    >
      <span className="inline-flex items-center gap-1">
        {label}
        {sortKey === k && (sortDir === "asc" ? <ArrowUp className="w-3 h-3" /> : <ArrowDown className="w-3 h-3" />)}
      </span>
    </th>
  );

  return (
    <div className="min-h-screen bg-slate-50">
      <div className="max-w-6xl mx-auto px-4 sm:px-6 py-12">
        <div className="flex items-center gap-2 mb-1">
          <Compass className="w-5 h-5 text-indigo-600" />
          <h1 className="text-2xl font-black text-slate-900">Employment Match Review</h1>
        </div>
        <p className="text-slate-500 mb-8 max-w-2xl">
          Geocoded candidate matches between barber/cosmetologist records and shop/salon locations — unconfirmed until an outreach step verifies them.
        </p>

        {/* Summary stats */}
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 mb-6">
          <div className="bg-white border border-slate-200 rounded-2xl p-5">
            <p className="text-[10px] font-bold uppercase tracking-wider text-slate-400">Total Matches</p>
            <p className="text-2xl font-black text-slate-900 mt-1">{total.toLocaleString()}</p>
            <p className="text-xs text-slate-400 mt-0.5">candidates, all unconfirmed</p>
          </div>
          <div className="bg-white border border-slate-200 rounded-2xl p-5">
            <p className="text-[10px] font-bold uppercase tracking-wider text-slate-400">Barbers / Cosmetologists</p>
            <p className="text-2xl font-black text-slate-900 mt-1">{barberCount.toLocaleString()} / {cosmetCount.toLocaleString()}</p>
            <p className="text-xs text-slate-400 mt-0.5">matched professionals</p>
          </div>
          <div className="bg-white border border-slate-200 rounded-2xl p-5">
            <p className="text-[10px] font-bold uppercase tracking-wider text-slate-400">High Confidence</p>
            <p className="text-2xl font-black text-slate-900 mt-1">{total ? Math.round((highCount / total) * 100) : 0}%</p>
            <p className="text-xs text-slate-400 mt-0.5">{highCount.toLocaleString()} at 70+ score</p>
          </div>
          <div className="bg-white border border-slate-200 rounded-2xl p-5">
            <p className="text-[10px] font-bold uppercase tracking-wider text-slate-400">Avg. Distance</p>
            <p className="text-2xl font-black text-slate-900 mt-1">{avgDistance.toFixed(2)} mi</p>
            <p className="text-xs text-slate-400 mt-0.5">professional to matched venue</p>
          </div>
        </div>

        {/* Histogram */}
        <div className="bg-white border border-slate-200 rounded-2xl p-5 mb-6">
          <p className="text-[10px] font-bold uppercase tracking-wider text-slate-400 mb-3">Confidence Distribution</p>
          <div className="space-y-2">
            {buckets.map((b) => (
              <div key={b.label} className="grid grid-cols-[70px_1fr_36px] items-center gap-3 text-xs">
                <span className="font-mono text-slate-500">{b.label}</span>
                <div className="h-3 bg-slate-100 rounded overflow-hidden">
                  <div
                    className={`h-full rounded ${b.min >= 70 ? "bg-emerald-500" : b.min >= 25 ? "bg-amber-500" : "bg-rose-500"}`}
                    style={{ width: `${b.pct}%` }}
                  />
                </div>
                <span className="font-mono text-slate-500 text-right">{b.count}</span>
              </div>
            ))}
          </div>
        </div>

        {/* Controls */}
        <div className="flex flex-wrap items-center gap-2 mb-4">
          <input
            type="search"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Search professional or venue name…"
            className="flex-1 min-w-[220px] px-3.5 py-2 rounded-lg border border-slate-200 bg-white text-sm focus:outline-none focus:ring-1 focus:ring-indigo-500 focus:border-indigo-500"
          />
          {(["all", "barber", "cosmetologist"] as const).map((t) => (
            <button
              key={t}
              onClick={() => setTypeFilter(t)}
              className={`px-3.5 py-2 rounded-full text-xs font-bold border transition-colors ${
                typeFilter === t ? "bg-slate-900 text-white border-slate-900" : "bg-white text-slate-700 border-slate-200 hover:border-slate-300"
              }`}
            >
              {t === "all" ? "All types" : t === "barber" ? "Barbers" : "Cosmetologists"}
            </button>
          ))}
          {(["all", "high", "mid", "low"] as const).map((c) => (
            <button
              key={c}
              onClick={() => setConfFilter(c)}
              className={`px-3.5 py-2 rounded-full text-xs font-bold border transition-colors ${
                confFilter === c ? "bg-slate-900 text-white border-slate-900" : "bg-white text-slate-700 border-slate-200 hover:border-slate-300"
              }`}
            >
              {c === "all" ? "Any confidence" : c === "high" ? "High (70+)" : c === "mid" ? "Medium (40–70)" : "Low (<40)"}
            </button>
          ))}
        </div>

        <p className="text-xs text-slate-400 mb-3">
          Showing {filtered.length.toLocaleString()} of {total.toLocaleString()} matches
        </p>

        {/* Table */}
        <div className="bg-white border border-slate-200 rounded-2xl overflow-hidden">
          <div className="overflow-x-auto max-h-[640px] overflow-y-auto">
            <table className="w-full text-sm">
              <thead className="sticky top-0 bg-white z-10 border-b border-slate-200">
                <tr>
                  <SortHeader label="Professional" k="professionalName" />
                  <SortHeader label="Type" k="professionalType" />
                  <th></th>
                  <SortHeader label="Matched Venue" k="venueName" />
                  <SortHeader label="Venue Type" k="venueType" />
                  <SortHeader label="Distance" k="distanceMiles" />
                  <SortHeader label="Confidence" k="confidenceScore" />
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {filtered.length === 0 ? (
                  <tr>
                    <td colSpan={7} className="text-center py-12 text-slate-400">
                      No matches for this filter combination.
                    </td>
                  </tr>
                ) : (
                  filtered.map((r, i) => {
                    const tier = confTier(r.confidenceScore);
                    return (
                      <tr key={i} className="hover:bg-slate-50 transition-colors">
                        <td className="px-4 py-2.5 font-medium text-slate-900 max-w-[220px] truncate" title={r.professionalName}>
                          {r.professionalName}
                        </td>
                        <td className="px-4 py-2.5">
                          <span className="inline-block px-2 py-0.5 rounded text-[11px] font-bold bg-slate-100 text-slate-600 capitalize">
                            {r.professionalType}
                          </span>
                        </td>
                        <td className="px-1 text-slate-300"><ArrowRight className="w-3.5 h-3.5" /></td>
                        <td className="px-4 py-2.5 max-w-[220px] truncate" title={r.venueName}>{r.venueName}</td>
                        <td className="px-4 py-2.5">
                          <span className="inline-block px-2 py-0.5 rounded text-[11px] font-bold bg-slate-100 text-slate-600 capitalize">
                            {r.venueType}
                          </span>
                        </td>
                        <td className="px-4 py-2.5 font-mono text-slate-500 whitespace-nowrap">{r.distanceMiles.toFixed(3)} mi</td>
                        <td className="px-4 py-2.5">
                          <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-bold border ${TIER_STYLES[tier]}`}>
                            {r.confidenceScore.toFixed(1)} · {TIER_LABELS[tier]}
                          </span>
                        </td>
                      </tr>
                    );
                  })
                )}
              </tbody>
            </table>
          </div>
        </div>

        <p className="text-xs text-slate-400 mt-4">
          Distance is straight-line (geocoded), not driving distance. Confidence decays with distance; anything beyond 3 miles was not stored as a candidate at all.
        </p>
      </div>
    </div>
  );
}
