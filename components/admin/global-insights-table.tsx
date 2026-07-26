"use client";

import { useMemo, useState } from "react";
import Link from "next/link";
import { ArrowUpDown, ArrowUp, ArrowDown, Search, Eye, PhoneCall, MousePointerClick } from "lucide-react";
import { ENTITY_TYPE_LABEL, type EntityTypeKey, type GlobalInsightRow } from "@/lib/admin/global-insights-types";

type SortKey = "visits" | "uniqueVisitors" | "callClicks" | "websiteClicks" | "emailClicks" | "totalLeads" | "convRate";

const NUM_COLS: { key: SortKey; label: string }[] = [
  { key: "visits", label: "Views" },
  { key: "callClicks", label: "Calls" },
  { key: "websiteClicks", label: "Web" },
  { key: "emailClicks", label: "Email" },
  { key: "totalLeads", label: "Leads" },
  { key: "convRate", label: "Conv %" },
];

function fmt(n: number) {
  return n.toLocaleString("en-US");
}

export function GlobalInsightsTable({ rows }: { rows: GlobalInsightRow[] }) {
  const [type, setType] = useState<"all" | EntityTypeKey>("all");
  const [state, setState] = useState<"all" | "TX" | "CA" | "Unknown">("all");
  const [city, setCity] = useState<string>("all");
  const [q, setQ] = useState("");
  const [sortKey, setSortKey] = useState<SortKey>("totalLeads");
  const [sortDir, setSortDir] = useState<"asc" | "desc">("desc");

  // City options depend on the selected state, so the dropdown stays relevant.
  const cityOptions = useMemo(() => {
    const set = new Set<string>();
    for (const r of rows) {
      if (state !== "all" && r.state !== state) continue;
      if (r.city !== "Unknown") set.add(r.city);
    }
    return [...set].sort((a, b) => a.localeCompare(b));
  }, [rows, state]);

  const filtered = useMemo(() => {
    const needle = q.trim().toLowerCase();
    const out = rows.filter((r) => {
      if (type !== "all" && r.entityType !== type) return false;
      if (state !== "all" && r.state !== state) return false;
      if (city !== "all" && r.city !== city) return false;
      if (needle && !r.name.toLowerCase().includes(needle)) return false;
      return true;
    });
    out.sort((a, b) => {
      const d = a[sortKey] - b[sortKey];
      return sortDir === "asc" ? d : -d;
    });
    return out;
  }, [rows, type, state, city, q, sortKey, sortDir]);

  const totals = useMemo(
    () =>
      filtered.reduce(
        (acc, r) => ({
          visits: acc.visits + r.visits,
          leads: acc.leads + r.totalLeads,
        }),
        { visits: 0, leads: 0 }
      ),
    [filtered]
  );
  const avgConv = totals.visits > 0 ? (totals.leads / totals.visits) * 100 : 0;

  function toggleSort(key: SortKey) {
    if (sortKey === key) setSortDir((d) => (d === "asc" ? "desc" : "asc"));
    else {
      setSortKey(key);
      setSortDir("desc");
    }
  }

  const selectCls =
    "rounded-lg border border-slate-300 bg-white text-sm font-semibold text-slate-700 px-3 py-2 focus:outline-none focus:ring-2 focus:ring-indigo-500";

  return (
    <div className="flex flex-col gap-5">
      {/* summary tiles */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        {[
          { icon: MousePointerClick, label: "Listings shown", value: fmt(filtered.length), color: "text-indigo-600 bg-indigo-50" },
          { icon: Eye, label: "Total views", value: fmt(totals.visits), color: "text-sky-600 bg-sky-50" },
          { icon: PhoneCall, label: "Total leads", value: fmt(totals.leads), color: "text-emerald-600 bg-emerald-50" },
          { icon: ArrowUpDown, label: "Avg conversion", value: `${avgConv.toFixed(1)}%`, color: "text-amber-600 bg-amber-50" },
        ].map((k) => (
          <div key={k.label} className="bg-white border border-slate-200 rounded-2xl shadow-sm p-4">
            <div className={`inline-flex p-2 rounded-lg mb-2 ${k.color}`}>
              <k.icon className="w-4 h-4" />
            </div>
            <div className="text-2xl font-black text-slate-950 tabular-nums">{k.value}</div>
            <div className="text-[11px] font-bold uppercase tracking-widest text-slate-400 mt-0.5">{k.label}</div>
          </div>
        ))}
      </div>

      {/* filters */}
      <div className="flex flex-wrap items-center gap-3">
        <select className={selectCls} value={type} onChange={(e) => setType(e.target.value as any)}>
          <option value="all">All entity types</option>
          {(Object.keys(ENTITY_TYPE_LABEL) as EntityTypeKey[]).map((k) => (
            <option key={k} value={k}>{ENTITY_TYPE_LABEL[k]}</option>
          ))}
        </select>
        <select className={selectCls} value={state} onChange={(e) => { setState(e.target.value as any); setCity("all"); }}>
          <option value="all">All states</option>
          <option value="TX">Texas</option>
          <option value="CA">California</option>
          <option value="Unknown">Unknown</option>
        </select>
        <select className={selectCls} value={city} onChange={(e) => setCity(e.target.value)}>
          <option value="all">All cities</option>
          {cityOptions.map((c) => (
            <option key={c} value={c}>{c}</option>
          ))}
        </select>
        <div className="relative flex-1 min-w-[180px]">
          <Search className="w-4 h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
          <input
            value={q}
            onChange={(e) => setQ(e.target.value)}
            placeholder="Search by name…"
            className="w-full rounded-lg border border-slate-300 bg-white text-sm pl-9 pr-3 py-2 focus:outline-none focus:ring-2 focus:ring-indigo-500"
          />
        </div>
      </div>

      {/* table */}
      <div className="bg-white border border-slate-200 rounded-2xl shadow-sm overflow-hidden overflow-x-auto">
        <table className="w-full text-sm min-w-[760px]">
          <thead>
            <tr className="border-b border-slate-200 text-left text-slate-500 bg-slate-50/60">
              <th className="px-4 py-3 font-bold w-10">#</th>
              <th className="px-4 py-3 font-bold">Listing</th>
              <th className="px-4 py-3 font-bold">Type</th>
              <th className="px-4 py-3 font-bold">City</th>
              <th className="px-4 py-3 font-bold">State</th>
              {NUM_COLS.map((c) => (
                <th key={c.key} className="px-4 py-3 font-bold text-right whitespace-nowrap">
                  <button onClick={() => toggleSort(c.key)} className="inline-flex items-center gap-1 hover:text-slate-900">
                    {c.label}
                    {sortKey === c.key ? (
                      sortDir === "desc" ? <ArrowDown className="w-3 h-3" /> : <ArrowUp className="w-3 h-3" />
                    ) : (
                      <ArrowUpDown className="w-3 h-3 opacity-30" />
                    )}
                  </button>
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {filtered.map((r, i) => (
              <tr key={`${r.route}/${r.slug}`} className="border-b border-slate-100 last:border-0 hover:bg-slate-50/50">
                <td className="px-4 py-3 text-slate-400 tabular-nums">{i + 1}</td>
                <td className="px-4 py-3">
                  <Link href={`/${r.route}/${r.slug}`} className="font-bold text-slate-900 hover:text-indigo-600 hover:underline">
                    {r.name}
                  </Link>
                </td>
                <td className="px-4 py-3 text-slate-500 whitespace-nowrap">{ENTITY_TYPE_LABEL[r.entityType]}</td>
                <td className="px-4 py-3 text-slate-600 whitespace-nowrap">{r.city}</td>
                <td className="px-4 py-3">
                  <span className={`text-[11px] font-bold px-1.5 py-0.5 rounded ${r.state === "TX" ? "bg-rose-50 text-rose-700" : r.state === "CA" ? "bg-amber-50 text-amber-700" : "bg-slate-100 text-slate-400"}`}>
                    {r.state}
                  </span>
                </td>
                <td className="px-4 py-3 text-right tabular-nums text-slate-700">{fmt(r.visits)}</td>
                <td className="px-4 py-3 text-right tabular-nums text-emerald-700 font-semibold">{fmt(r.callClicks)}</td>
                <td className="px-4 py-3 text-right tabular-nums text-slate-700">{fmt(r.websiteClicks)}</td>
                <td className="px-4 py-3 text-right tabular-nums text-slate-700">{fmt(r.emailClicks)}</td>
                <td className="px-4 py-3 text-right tabular-nums font-black text-slate-900">{fmt(r.totalLeads)}</td>
                <td className="px-4 py-3 text-right tabular-nums font-bold text-indigo-600">{(r.convRate * 100).toFixed(1)}%</td>
              </tr>
            ))}
            {filtered.length === 0 && (
              <tr>
                <td colSpan={11} className="px-4 py-12 text-center text-slate-400 text-sm">
                  No listings match these filters.
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
}
