"use client";

import { useMemo, useState } from "react";
import { Compass, ArrowRight, ArrowUp, ArrowDown, Send, CheckCircle2, Loader2 } from "lucide-react";
import type { EmploymentMatchRow } from "./data";
import { requestEmploymentVerification } from "./actions";

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

function rowKey(r: { professionalType: string; professionalId: string }) {
  return `${r.professionalType}:${r.professionalId}`;
}

export function EmploymentMatchReview({ data: initialData }: { data: EmploymentMatchRow[] }) {
  const [data, setData] = useState(initialData);
  const [search, setSearch] = useState("");
  const [typeFilter, setTypeFilter] = useState<"all" | "barber" | "cosmetologist">("all");
  const [confFilter, setConfFilter] = useState<"all" | ConfTier>("all");
  const [verificationFilter, setVerificationFilter] = useState<"all" | "requested" | "not_requested">("all");
  const [sortKey, setSortKey] = useState<SortKey>("confidenceScore");
  const [sortDir, setSortDir] = useState<"asc" | "desc">("desc");
  const [selected, setSelected] = useState<Set<string>>(new Set());
  const [pending, setPending] = useState<Set<string>>(new Set());
  const [rowErrors, setRowErrors] = useState<Record<string, string>>({});

  const requestOne = async (r: EmploymentMatchRow) => {
    const key = rowKey(r);
    setPending((p) => new Set(p).add(key));
    setRowErrors((e) => { const next = { ...e }; delete next[key]; return next; });
    const result = await requestEmploymentVerification(r.professionalType, r.professionalId);
    setPending((p) => { const next = new Set(p); next.delete(key); return next; });
    if (result.success) {
      setData((d) => d.map((row) => (rowKey(row) === key ? { ...row, verificationRequestedAt: new Date().toISOString() } : row)));
    } else {
      setRowErrors((e) => ({ ...e, [key]: result.error || "Request failed." }));
    }
  };

  const requestSelected = async () => {
    const rows = data.filter((r) => selected.has(rowKey(r)) && !r.verificationRequestedAt);
    await Promise.all(rows.map((r) => requestOne(r)));
    setSelected(new Set());
  };

  const toggleSelected = (key: string) => {
    setSelected((s) => {
      const next = new Set(s);
      if (next.has(key)) next.delete(key);
      else next.add(key);
      return next;
    });
  };

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
    if (verificationFilter === "requested") rows = rows.filter((r) => !!r.verificationRequestedAt);
    if (verificationFilter === "not_requested") rows = rows.filter((r) => !r.verificationRequestedAt);
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
  }, [data, typeFilter, confFilter, verificationFilter, search, sortKey, sortDir]);

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
          {(["all", "not_requested", "requested"] as const).map((v) => (
            <button
              key={v}
              onClick={() => setVerificationFilter(v)}
              className={`px-3.5 py-2 rounded-full text-xs font-bold border transition-colors ${
                verificationFilter === v ? "bg-slate-900 text-white border-slate-900" : "bg-white text-slate-700 border-slate-200 hover:border-slate-300"
              }`}
            >
              {v === "all" ? "Any verification status" : v === "not_requested" ? "Not requested" : "Requested"}
            </button>
          ))}
        </div>

        {selected.size > 0 && (
          <div className="flex items-center justify-between bg-indigo-50 border border-indigo-100 rounded-xl px-4 py-3 mb-4">
            <p className="text-sm font-semibold text-indigo-900">{selected.size} selected</p>
            <button
              onClick={requestSelected}
              disabled={[...selected].every((k) => pending.has(k))}
              className="inline-flex items-center gap-1.5 px-4 py-2 rounded-lg bg-indigo-600 hover:bg-indigo-700 text-white text-xs font-bold disabled:opacity-50"
            >
              <Send className="w-3.5 h-3.5" />
              Request Verification for Selected
            </button>
          </div>
        )}

        <p className="text-xs text-slate-400 mb-3">
          Showing {filtered.length.toLocaleString()} of {total.toLocaleString()} matches
        </p>

        {/* Table */}
        <div className="bg-white border border-slate-200 rounded-2xl overflow-hidden">
          <div className="overflow-x-auto max-h-[640px] overflow-y-auto">
            <table className="w-full text-sm">
              <thead className="sticky top-0 bg-white z-10 border-b border-slate-200">
                <tr>
                  <th className="px-4 py-3 w-8">
                    <input
                      type="checkbox"
                      aria-label="Select all visible rows"
                      checked={filtered.length > 0 && filtered.every((r) => selected.has(rowKey(r)))}
                      onChange={(e) => {
                        setSelected((s) => {
                          const next = new Set(s);
                          if (e.target.checked) filtered.forEach((r) => next.add(rowKey(r)));
                          else filtered.forEach((r) => next.delete(rowKey(r)));
                          return next;
                        });
                      }}
                    />
                  </th>
                  <SortHeader label="Professional" k="professionalName" />
                  <SortHeader label="Type" k="professionalType" />
                  <th></th>
                  <SortHeader label="Matched Venue" k="venueName" />
                  <SortHeader label="Venue Type" k="venueType" />
                  <SortHeader label="Distance" k="distanceMiles" />
                  <SortHeader label="Confidence" k="confidenceScore" />
                  <th className="px-4 py-3 text-left text-[10px] font-bold uppercase tracking-wider text-slate-500 whitespace-nowrap">Verification</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {filtered.length === 0 ? (
                  <tr>
                    <td colSpan={9} className="text-center py-12 text-slate-400">
                      No matches for this filter combination.
                    </td>
                  </tr>
                ) : (
                  filtered.map((r, i) => {
                    const tier = confTier(r.confidenceScore);
                    const key = rowKey(r);
                    const isPending = pending.has(key);
                    const rowError = rowErrors[key];
                    return (
                      <tr key={i} className="hover:bg-slate-50 transition-colors">
                        <td className="px-4 py-2.5">
                          <input
                            type="checkbox"
                            aria-label={`Select ${r.professionalName}`}
                            checked={selected.has(key)}
                            onChange={() => toggleSelected(key)}
                          />
                        </td>
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
                        <td className="px-4 py-2.5 whitespace-nowrap">
                          {r.verificationRequestedAt ? (
                            <span className="inline-flex items-center gap-1 text-xs font-bold text-emerald-700">
                              <CheckCircle2 className="w-3.5 h-3.5" />
                              Requested {new Date(r.verificationRequestedAt).toLocaleDateString()}
                            </span>
                          ) : (
                            <button
                              onClick={() => requestOne(r)}
                              disabled={isPending}
                              className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg border border-slate-200 bg-white hover:border-indigo-300 hover:text-indigo-700 text-xs font-bold text-slate-600 disabled:opacity-50"
                            >
                              {isPending ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Send className="w-3.5 h-3.5" />}
                              {isPending ? "Requesting…" : "Request Verification"}
                            </button>
                          )}
                          {rowError && <p className="text-[11px] text-rose-600 mt-1">{rowError}</p>}
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
