"use client";

import { useState, useEffect, useRef, useTransition } from "react";
import Link from "next/link";
import {
  ChevronDown, ChevronUp, ChevronLeft, ChevronRight, Search, Star, Armchair,
  BadgeCheck, Info, X, Scale, MapPin, TrendingUp, Loader2,
} from "lucide-react";
import { fetchVenuePage } from "./actions";
import type { CompareVenue, CityRollup, VenueType, VenuePage } from "@/lib/compare-shops-data";

const MAX_COMPARE = 4;

type SortField = "weeklyRent" | "chairs" | "rating" | "reviews" | "name";

const money = (v: number | null) => (v != null ? `$${v.toLocaleString()}` : "—");

/** A commission split is a real answer to "what does it cost", not a blank. */
function rentLabel(v: CompareVenue) {
  if (v.weeklyRent != null) return `${money(v.weeklyRent)}/wk`;
  if (v.rentKind === "commission" && v.commissionLabel) return `${v.commissionLabel} split`;
  return "—";
}

function rentTone(v: CompareVenue, medianRent: number | null) {
  if (v.weeklyRent == null) return "text-slate-400";
  if (medianRent == null) return "text-slate-900";
  if (v.weeklyRent <= medianRent * 0.85) return "text-green-700";
  if (v.weeklyRent >= medianRent * 1.15) return "text-red-700";
  return "text-slate-900";
}

const venueHref = (v: CompareVenue) => `/${v.type === "shop" ? "shop" : "salons"}/${v.slug}`;

export function CompareShopsClient({
  cities,
  initialPage,
  totalVenues,
  totalWithRent,
}: {
  cities: CityRollup[];
  initialPage: VenuePage;
  totalVenues: number;
  totalWithRent: number;
}) {
  const [type, setType] = useState<VenueType | "all">("all");
  const [cityKey, setCityKey] = useState("all");
  const [citySearch, setCitySearch] = useState("");
  const [nameSearch, setNameSearch] = useState("");
  const [rentOnly, setRentOnly] = useState(false);
  const [chairsOnly, setChairsOnly] = useState(false);
  const [hiringOnly, setHiringOnly] = useState(false);
  const [sortField, setSortField] = useState<SortField>("weeklyRent");
  const [sortDir, setSortDir] = useState<"asc" | "desc">("asc");
  const [page, setPage] = useState(1);

  const [result, setResult] = useState<VenuePage>(initialPage);
  const [pending, startTransition] = useTransition();
  // Selected venues are held as full objects so a comparison survives paging
  // and filtering — the rows they came from may no longer be on screen.
  const [selected, setSelected] = useState<CompareVenue[]>([]);
  const [showCompare, setShowCompare] = useState(false);

  const isFirstRun = useRef(true);
  const requestSeq = useRef(0);

  // Debounce so typing in the search box doesn't fire a request per keystroke.
  useEffect(() => {
    if (isFirstRun.current) {
      isFirstRun.current = false;
      return;
    }
    const seq = ++requestSeq.current;
    const t = setTimeout(() => {
      startTransition(async () => {
        const next = await fetchVenuePage({
          cityKey, type, rentOnly, chairsOnly, hiringOnly,
          search: nameSearch, sortField, sortDir, page,
        });
        // Drop out-of-order responses so a slow early request can't overwrite
        // the results of a later one.
        if (seq === requestSeq.current) setResult(next);
      });
    }, nameSearch ? 300 : 0);
    return () => clearTimeout(t);
  }, [cityKey, type, rentOnly, chairsOnly, hiringOnly, nameSearch, sortField, sortDir, page]);

  // Any filter change invalidates the current page number.
  useEffect(() => {
    setPage(1);
  }, [cityKey, type, rentOnly, chairsOnly, hiringOnly, nameSearch, sortField, sortDir]);

  const q = citySearch.trim().toLowerCase();
  const cityOptions = (q ? cities.filter((c) => c.key.toLowerCase().includes(q)) : cities).slice(0, 60);
  const activeCity = cityKey === "all" ? null : cities.find((c) => c.key === cityKey) || null;

  const toggleSelect = (v: CompareVenue) =>
    setSelected((prev) =>
      prev.some((x) => x.id === v.id)
        ? prev.filter((x) => x.id !== v.id)
        : prev.length >= MAX_COMPARE
        ? prev
        : [...prev, v]
    );

  const sort = (field: SortField) => {
    if (field === sortField) setSortDir((d) => (d === "asc" ? "desc" : "asc"));
    else {
      setSortField(field);
      // Rent reads best cheapest-first; everything else best-first.
      setSortDir(field === "weeklyRent" || field === "name" ? "asc" : "desc");
    }
  };

  const SortHeader = ({ field, label }: { field: SortField; label: string }) => (
    <button onClick={() => sort(field)} className="flex items-center gap-1 whitespace-nowrap hover:text-slate-900 transition-colors">
      {label}
      {sortField === field && (sortDir === "desc" ? <ChevronDown className="w-3.5 h-3.5" /> : <ChevronUp className="w-3.5 h-3.5" />)}
    </button>
  );

  return (
    <div>
      {/* Coverage disclosure — the rent dataset is real but thin, and hiding
          that would burn trust the first time someone checked. */}
      <div className="flex gap-3 bg-blue-50 border border-blue-200 rounded-xl px-4 py-3 mb-6 text-sm text-blue-900">
        <Info className="w-4 h-4 shrink-0 mt-0.5" />
        <p>
          <strong>{totalWithRent.toLocaleString()} of {totalVenues.toLocaleString()} listings</strong> have a verified
          booth rent figure so far — rent is quoted directly by shops, not scraped, so it grows as owners claim their
          listings. Everything else compares on chairs, rating, reviews and hiring status. Use{" "}
          <strong>Verified rent only</strong> to see just the confirmed numbers.
        </p>
      </div>

      {/* City drill-down */}
      <div className="bg-white border border-slate-200 rounded-2xl shadow-sm p-4 sm:p-5 mb-6">
        <div className="flex items-center gap-2 mb-3">
          <MapPin className="w-4 h-4 text-slate-400" />
          <h2 className="text-sm font-bold text-slate-700 uppercase tracking-wide">Pick a city</h2>
        </div>
        <div className="relative mb-3">
          <Search className="w-4 h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
          <input
            value={citySearch}
            onChange={(e) => setCitySearch(e.target.value)}
            placeholder="Search cities…"
            className="w-full pl-9 pr-3 py-2 text-sm border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
          />
        </div>
        <div className="flex flex-wrap gap-2 max-h-40 overflow-y-auto">
          <button
            onClick={() => setCityKey("all")}
            className={`px-3 py-1.5 rounded-full text-xs font-semibold border transition-colors ${
              cityKey === "all" ? "bg-blue-600 border-blue-600 text-white" : "bg-white border-slate-200 text-slate-600 hover:bg-slate-50"
            }`}
          >
            All cities ({cities.length})
          </button>
          {cityOptions.map((c) => (
            <button
              key={c.key}
              onClick={() => setCityKey(c.key)}
              className={`px-3 py-1.5 rounded-full text-xs font-semibold border transition-colors ${
                cityKey === c.key ? "bg-blue-600 border-blue-600 text-white" : "bg-white border-slate-200 text-slate-600 hover:bg-slate-50"
              }`}
            >
              {c.key} <span className="opacity-60">({c.venues})</span>
              {c.withRent > 0 && <span className="ml-1 text-green-600">•</span>}
            </button>
          ))}
        </div>
      </div>

      {activeCity && (
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 mb-6">
          {[
            { label: "Listings", value: activeCity.venues.toLocaleString(), icon: MapPin },
            { label: "Chairs open", value: activeCity.chairs.toLocaleString(), icon: Armchair },
            { label: "Median booth rent", value: activeCity.medianWeeklyRent != null ? `${money(activeCity.medianWeeklyRent)}/wk` : "—", icon: TrendingUp },
            { label: "With verified rent", value: activeCity.withRent.toLocaleString(), icon: BadgeCheck },
          ].map((s) => (
            <div key={s.label} className="bg-white border border-slate-200 rounded-xl p-4">
              <div className="flex items-center gap-1.5 text-xs font-semibold text-slate-500 uppercase tracking-wide mb-1">
                <s.icon className="w-3.5 h-3.5" />
                {s.label}
              </div>
              <div className="text-2xl font-black text-slate-900">{s.value}</div>
            </div>
          ))}
        </div>
      )}

      {/* Filters */}
      <div className="flex flex-wrap items-center gap-2 mb-4">
        {(["all", "shop", "salon"] as const).map((t) => (
          <button
            key={t}
            onClick={() => setType(t)}
            className={`px-4 py-2 rounded-full text-sm font-semibold border transition-colors ${
              type === t ? "bg-slate-900 border-slate-900 text-white" : "bg-white border-slate-200 text-slate-600 hover:bg-slate-50"
            }`}
          >
            {t === "all" ? "All" : t === "shop" ? "Barbershops" : "Salons"}
          </button>
        ))}
        <div className="w-px h-6 bg-slate-200 mx-1" />
        {[
          { on: rentOnly, set: setRentOnly, label: "Verified rent only" },
          { on: chairsOnly, set: setChairsOnly, label: "Has open chairs" },
          { on: hiringOnly, set: setHiringOnly, label: "Hiring now" },
        ].map((f) => (
          <button
            key={f.label}
            onClick={() => f.set(!f.on)}
            className={`px-3 py-2 rounded-full text-xs font-semibold border transition-colors ${
              f.on ? "bg-blue-600 border-blue-600 text-white" : "bg-white border-slate-200 text-slate-600 hover:bg-slate-50"
            }`}
          >
            {f.label}
          </button>
        ))}
        <div className="relative ml-auto">
          <Search className="w-4 h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
          <input
            value={nameSearch}
            onChange={(e) => setNameSearch(e.target.value)}
            placeholder="Search by name…"
            className="pl-9 pr-3 py-2 text-sm border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
          />
        </div>
      </div>

      <p className="text-sm text-slate-500 mb-3 flex items-center gap-2">
        {pending && <Loader2 className="w-3.5 h-3.5 animate-spin text-blue-500" />}
        {result.total.toLocaleString()} listing{result.total === 1 ? "" : "s"}
        {activeCity ? ` in ${activeCity.key}` : " nationwide"}
        {result.medianWeeklyRent != null && ` · median booth rent ${money(result.medianWeeklyRent)}/wk`}
      </p>

      {/* Table */}
      <div className={`bg-white border border-slate-200 rounded-2xl shadow-sm overflow-hidden transition-opacity ${pending ? "opacity-60" : ""}`}>
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-slate-200 text-xs font-semibold text-slate-500 uppercase tracking-wide">
                <th className="px-3 py-3 w-10" />
                <th className="px-4 py-3 text-left"><SortHeader field="name" label="Shop / Salon" /></th>
                <th className="px-4 py-3 text-left"><SortHeader field="weeklyRent" label="Booth Rent" /></th>
                <th className="px-4 py-3 text-left"><SortHeader field="chairs" label="Chairs Open" /></th>
                <th className="px-4 py-3 text-left"><SortHeader field="rating" label="Rating" /></th>
                <th className="px-4 py-3 text-left"><SortHeader field="reviews" label="Reviews" /></th>
                <th className="px-4 py-3 text-left">Status</th>
              </tr>
            </thead>
            <tbody>
              {result.rows.map((v) => {
                const isSel = selected.some((x) => x.id === v.id);
                return (
                  <tr key={v.id} className={`border-b border-slate-100 last:border-0 transition-colors ${isSel ? "bg-blue-50/60" : "hover:bg-slate-50"}`}>
                    <td className="px-3 py-3">
                      <input
                        type="checkbox"
                        checked={isSel}
                        onChange={() => toggleSelect(v)}
                        disabled={!isSel && selected.length >= MAX_COMPARE}
                        aria-label={`Compare ${v.name}`}
                        className="w-4 h-4 rounded border-slate-300 text-blue-600 focus:ring-blue-500 disabled:opacity-30"
                      />
                    </td>
                    <td className="px-4 py-3">
                      {v.slug ? (
                        <Link href={venueHref(v)} className="font-semibold text-slate-900 hover:text-blue-600 transition-colors">{v.name}</Link>
                      ) : (
                        <span className="font-semibold text-slate-900">{v.name}</span>
                      )}
                      <div className="flex items-center gap-2 mt-0.5 text-xs text-slate-500">
                        <span>{v.city}{v.state ? `, ${v.state}` : ""}</span>
                        <span className="px-1.5 py-0.5 rounded bg-slate-100 text-slate-600">{v.type === "shop" ? "Barbershop" : "Salon"}</span>
                      </div>
                    </td>
                    <td className={`px-4 py-3 whitespace-nowrap font-bold ${rentTone(v, result.medianWeeklyRent)}`}>
                      {rentLabel(v)}
                      {v.rentRaw && v.weeklyRent == null && v.rentKind === "unknown" && (
                        <span className="block text-xs font-normal text-slate-400 max-w-[14rem] truncate">{v.rentRaw}</span>
                      )}
                    </td>
                    <td className="px-4 py-3 whitespace-nowrap">
                      {v.chairs != null && v.chairs > 0 ? (
                        <span className="inline-flex items-center gap-1 font-semibold text-slate-900">
                          <Armchair className="w-3.5 h-3.5 text-slate-400" />{v.chairs}
                        </span>
                      ) : "—"}
                    </td>
                    <td className="px-4 py-3 whitespace-nowrap">
                      {v.rating != null ? (
                        <span className="inline-flex items-center gap-1">
                          <Star className="w-3.5 h-3.5 fill-amber-400 text-amber-400" />{v.rating.toFixed(1)}
                        </span>
                      ) : "—"}
                    </td>
                    <td className="px-4 py-3 whitespace-nowrap text-slate-600">{v.reviews?.toLocaleString() ?? "—"}</td>
                    <td className="px-4 py-3 whitespace-nowrap">
                      <div className="flex items-center gap-1.5">
                        {v.hiring && <span className="px-2 py-0.5 rounded-full bg-green-100 text-green-700 text-xs font-semibold">Hiring</span>}
                        {v.claimed && (
                          <span className="inline-flex items-center gap-0.5 text-xs text-green-700 font-semibold">
                            <BadgeCheck className="w-3.5 h-3.5" />Claimed
                          </span>
                        )}
                      </div>
                    </td>
                  </tr>
                );
              })}
              {result.total === 0 && (
                <tr>
                  <td colSpan={7} className="px-4 py-12 text-center text-slate-400">
                    No listings match those filters. Try clearing “Verified rent only” — rent is still being collected.
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>

        {result.totalPages > 1 && (
          <div className="border-t border-slate-200 flex justify-center items-center gap-2 py-4">
            <button onClick={() => setPage((p) => Math.max(1, p - 1))} disabled={result.page === 1 || pending}
              className="px-3 py-1.5 text-xs sm:text-sm font-medium text-slate-700 bg-white border border-slate-300 rounded-lg hover:bg-slate-50 disabled:opacity-50 flex items-center gap-1">
              <ChevronLeft className="w-3.5 h-3.5" />Previous
            </button>
            <span className="text-sm text-slate-500 px-2">Page {result.page} of {result.totalPages}</span>
            <button onClick={() => setPage((p) => Math.min(result.totalPages, p + 1))} disabled={result.page === result.totalPages || pending}
              className="px-3 py-1.5 text-xs sm:text-sm font-medium text-slate-700 bg-white border border-slate-300 rounded-lg hover:bg-slate-50 disabled:opacity-50 flex items-center gap-1">
              Next<ChevronRight className="w-3.5 h-3.5" />
            </button>
          </div>
        )}
      </div>

      {/* Compare tray */}
      {selected.length > 0 && !showCompare && (
        <div className="fixed bottom-0 inset-x-0 z-40 bg-slate-900 text-white shadow-2xl">
          <div className="max-w-7xl mx-auto px-4 py-3 flex items-center gap-3 flex-wrap">
            <Scale className="w-5 h-5 shrink-0" />
            <span className="text-sm font-semibold">{selected.length} selected</span>
            <div className="flex gap-2 flex-wrap flex-1 min-w-0">
              {selected.map((v) => (
                <span key={v.id} className="inline-flex items-center gap-1 bg-white/10 rounded-full pl-3 pr-1.5 py-1 text-xs">
                  <span className="truncate max-w-[10rem]">{v.name}</span>
                  <button onClick={() => toggleSelect(v)} aria-label={`Remove ${v.name}`} className="hover:bg-white/20 rounded-full p-0.5">
                    <X className="w-3 h-3" />
                  </button>
                </span>
              ))}
            </div>
            <button onClick={() => setSelected([])} className="text-xs text-white/60 hover:text-white">Clear</button>
            <button onClick={() => setShowCompare(true)} disabled={selected.length < 2}
              className="px-4 py-2 rounded-lg bg-blue-600 hover:bg-blue-500 text-sm font-semibold disabled:opacity-40 disabled:cursor-not-allowed">
              Compare {selected.length < 2 ? "(pick 2+)" : ""}
            </button>
          </div>
        </div>
      )}

      {/* Side-by-side */}
      {showCompare && selected.length >= 2 && (
        <div className="fixed inset-0 z-50 bg-slate-900/60 backdrop-blur-sm flex items-end sm:items-center justify-center p-0 sm:p-6 overflow-y-auto">
          <div className="bg-white w-full max-w-5xl rounded-t-2xl sm:rounded-2xl shadow-2xl max-h-[92vh] overflow-y-auto">
            <div className="sticky top-0 bg-white border-b border-slate-200 px-5 py-4 flex items-center justify-between">
              <h2 className="text-lg font-black text-slate-900">Side-by-side comparison</h2>
              <button onClick={() => setShowCompare(false)} className="p-1.5 rounded-lg hover:bg-slate-100" aria-label="Close comparison">
                <X className="w-5 h-5 text-slate-500" />
              </button>
            </div>
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <tbody>
                  {[
                    { label: "Location", get: (v: CompareVenue) => `${v.city}${v.state ? `, ${v.state}` : ""}` },
                    { label: "Type", get: (v: CompareVenue) => (v.type === "shop" ? "Barbershop" : "Salon") },
                    { label: "Booth rent", get: (v: CompareVenue) => rentLabel(v), strong: true },
                    { label: "As quoted", get: (v: CompareVenue) => v.rentRaw || "Not published" },
                    { label: "Chairs open", get: (v: CompareVenue) => (v.chairs != null && v.chairs > 0 ? String(v.chairs) : "—"), strong: true },
                    { label: "Rating", get: (v: CompareVenue) => (v.rating != null ? `${v.rating.toFixed(1)} ★` : "—") },
                    { label: "Reviews", get: (v: CompareVenue) => v.reviews?.toLocaleString() ?? "—" },
                    { label: "Hiring", get: (v: CompareVenue) => (v.hiring ? "Yes" : "Not listed") },
                    { label: "Claimed", get: (v: CompareVenue) => (v.claimed ? "Verified owner" : "Unclaimed") },
                  ].map((row, ri) => (
                    <tr key={row.label} className={ri === 0 ? "" : "border-t border-slate-100"}>
                      <th className="px-4 py-3 text-left text-xs font-semibold text-slate-500 uppercase tracking-wide align-top w-36 bg-slate-50">
                        {row.label}
                      </th>
                      {selected.map((v) => (
                        <td key={v.id} className={`px-4 py-3 align-top ${row.strong ? "font-bold text-slate-900" : "text-slate-700"}`}>
                          {ri === 0 && (
                            <div className="font-black text-slate-900 mb-1 text-base">
                              {v.slug ? <Link href={venueHref(v)} className="hover:text-blue-600">{v.name}</Link> : v.name}
                            </div>
                          )}
                          {row.get(v)}
                        </td>
                      ))}
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
            <div className="px-5 py-4 border-t border-slate-200 flex justify-end">
              <button onClick={() => setShowCompare(false)} className="px-4 py-2 rounded-lg border border-slate-300 text-sm font-semibold text-slate-700 hover:bg-slate-50">
                Back to list
              </button>
            </div>
          </div>
        </div>
      )}

      {selected.length > 0 && !showCompare && <div className="h-20" />}
    </div>
  );
}
