"use client";

import { useState, useMemo, useEffect } from "react";
import Link from "next/link";
import {
  ChevronDown, ChevronUp, ChevronLeft, ChevronRight, Search, Star, Award,
  Info, X, Scale, MapPin, GraduationCap, AlertTriangle,
} from "lucide-react";
import { MIN_SAMPLE } from "@/lib/compare-entities";
import type { CompareSchool, SchoolCityRollup, LicenseType } from "@/lib/compare-schools-data";

const PAGE_SIZE = 20;
const MAX_COMPARE = 4;

type SortField = "writtenPassRate" | "practicalPassRate" | "firstAttemptRate" | "avgAttempts" | "writtenTakers" | "tuition" | "name";

const pct = (v: number | null) => (v != null ? `${Math.round(v * 100)}%` : "—");
const money = (v: number | null) => (v != null ? `$${Number(v).toLocaleString()}` : "—");

function passTone(v: number | null) {
  if (v == null) return "text-slate-400";
  if (v >= 0.85) return "text-green-700";
  if (v >= 0.7) return "text-amber-700";
  return "text-red-700";
}

function PassBar({ value }: { value: number | null }) {
  if (value == null) return <span className="text-slate-400">—</span>;
  const w = Math.max(2, Math.min(100, Math.round(value * 100)));
  const color = value >= 0.85 ? "bg-green-500" : value >= 0.7 ? "bg-amber-500" : "bg-red-500";
  return (
    <div className="flex items-center gap-2 min-w-[6.5rem]">
      <span className={`font-bold tabular-nums ${passTone(value)}`}>{Math.round(value * 100)}%</span>
      <span className="flex-1 h-1.5 rounded-full bg-slate-100 overflow-hidden">
        <span className={`block h-full rounded-full ${color}`} style={{ width: `${w}%` }} />
      </span>
    </div>
  );
}

export function CompareSchoolsClient({
  barberSchools,
  cosmetologySchools,
  barberCities,
  cosmetologyCities,
}: {
  barberSchools: CompareSchool[];
  cosmetologySchools: CompareSchool[];
  barberCities: SchoolCityRollup[];
  cosmetologyCities: SchoolCityRollup[];
}) {
  const [license, setLicense] = useState<LicenseType>("barber");
  const [cityKey, setCityKey] = useState("all");
  const [citySearch, setCitySearch] = useState("");
  const [nameSearch, setNameSearch] = useState("");
  const [accreditedOnly, setAccreditedOnly] = useState(false);
  const [reliableOnly, setReliableOnly] = useState(true);
  const [sortField, setSortField] = useState<SortField>("writtenPassRate");
  const [sortDir, setSortDir] = useState<"asc" | "desc">("desc");
  const [page, setPage] = useState(1);
  const [selected, setSelected] = useState<string[]>([]);
  const [showCompare, setShowCompare] = useState(false);

  const schools = license === "barber" ? barberSchools : cosmetologySchools;
  const cities = license === "barber" ? barberCities : cosmetologyCities;

  // Switching tabs invalidates a city that only exists on the other tab.
  useEffect(() => {
    setCityKey("all");
    setSelected([]);
  }, [license]);

  const cityOptions = useMemo(() => {
    const q = citySearch.trim().toLowerCase();
    return (q ? cities.filter((c) => c.key.toLowerCase().includes(q)) : cities).slice(0, 60);
  }, [cities, citySearch]);

  const activeCity = cityKey === "all" ? null : cities.find((c) => c.key === cityKey) || null;

  const filtered = useMemo(() => {
    const q = nameSearch.trim().toLowerCase();
    return schools.filter((s) => {
      if (cityKey !== "all" && `${s.city}, ${s.state}` !== cityKey) return false;
      if (accreditedOnly && !s.accredited) return false;
      if (reliableOnly && (s.writtenTakers ?? 0) < MIN_SAMPLE) return false;
      if (q && !s.name.toLowerCase().includes(q)) return false;
      return true;
    });
  }, [schools, cityKey, accreditedOnly, reliableOnly, nameSearch]);

  const sorted = useMemo(() => {
    const dir = sortDir === "asc" ? 1 : -1;
    return [...filtered].sort((a, b) => {
      if (sortField === "name") return a.name.localeCompare(b.name) * dir;
      const av = a[sortField];
      const bv = b[sortField];
      if (av == null && bv == null) return 0;
      if (av == null) return 1; // no data always sinks
      if (bv == null) return -1;
      return (Number(av) - Number(bv)) * dir;
    });
  }, [filtered, sortField, sortDir]);

  useEffect(() => setPage(1), [license, cityKey, accreditedOnly, reliableOnly, nameSearch, sortField, sortDir]);

  const totalPages = Math.max(1, Math.ceil(sorted.length / PAGE_SIZE));
  const pageItems = sorted.slice((page - 1) * PAGE_SIZE, page * PAGE_SIZE);
  const selectedSchools = selected.map((id) => schools.find((s) => s.id === id)).filter(Boolean) as CompareSchool[];

  const toggleSelect = (id: string) =>
    setSelected((prev) =>
      prev.includes(id) ? prev.filter((x) => x !== id) : prev.length >= MAX_COMPARE ? prev : [...prev, id]
    );

  const sort = (field: SortField) => {
    if (field === sortField) setSortDir((d) => (d === "asc" ? "desc" : "asc"));
    else {
      setSortField(field);
      // Fewer attempts and lower tuition are better; everything else higher-is-better.
      setSortDir(field === "avgAttempts" || field === "tuition" || field === "name" ? "asc" : "desc");
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
      {/* License toggle */}
      <div className="flex items-center justify-center gap-2 mb-6">
        {([["barber", "Barber Schools", barberSchools.length], ["cosmetology", "Cosmetology Schools", cosmetologySchools.length]] as const).map(
          ([key, label, count]) => (
            <button
              key={key}
              onClick={() => setLicense(key)}
              className={`px-5 py-2 rounded-full text-sm font-semibold border transition-colors ${
                license === key ? "bg-blue-600 border-blue-600 text-white shadow-md" : "bg-white border-slate-200 text-slate-600 hover:bg-slate-50"
              }`}
            >
              {label} ({count})
            </button>
          )
        )}
      </div>

      <div className="flex gap-3 bg-blue-50 border border-blue-200 rounded-xl px-4 py-3 mb-6 text-sm text-blue-900">
        <Info className="w-4 h-4 shrink-0 mt-0.5" />
        <p>
          Pass rates are real 2026 licensing exam outcomes for each school&apos;s own students. A school needs at least{" "}
          <strong>{MIN_SAMPLE} recorded test-takers</strong> before its percentage means anything — below that, one
          result swings the number wildly. Those schools are marked{" "}
          <span className="inline-flex items-center gap-0.5 font-semibold"><AlertTriangle className="w-3 h-3" />small sample</span>{" "}
          and hidden by default.
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
              {c.key} <span className="opacity-60">({c.schools})</span>
            </button>
          ))}
        </div>
      </div>

      {activeCity && (
        <div className="grid grid-cols-2 lg:grid-cols-3 gap-3 mb-6">
          {[
            { label: "Schools", value: activeCity.schools.toLocaleString(), icon: GraduationCap },
            { label: "Median written pass rate", value: activeCity.medianWrittenPassRate != null ? `${activeCity.medianWrittenPassRate}%` : "—", icon: Award },
            { label: "Students tested", value: activeCity.totalTakers.toLocaleString(), icon: Star },
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
        {[
          { on: reliableOnly, set: setReliableOnly, label: `${MIN_SAMPLE}+ test-takers only` },
          { on: accreditedOnly, set: setAccreditedOnly, label: "Accredited only" },
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
            placeholder="Search by school…"
            className="pl-9 pr-3 py-2 text-sm border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
          />
        </div>
      </div>

      <p className="text-sm text-slate-500 mb-3">
        {sorted.length.toLocaleString()} school{sorted.length === 1 ? "" : "s"}
        {activeCity ? ` in ${activeCity.key}` : " nationwide"} · {license === "barber" ? "Barber" : "Cosmetology"} exam outcomes
      </p>

      {/* Table */}
      <div className="bg-white border border-slate-200 rounded-2xl shadow-sm overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-slate-200 text-xs font-semibold text-slate-500 uppercase tracking-wide">
                <th className="px-3 py-3 w-10" />
                <th className="px-4 py-3 text-left"><SortHeader field="name" label="School" /></th>
                <th className="px-4 py-3 text-left"><SortHeader field="writtenPassRate" label="Written Pass" /></th>
                <th className="px-4 py-3 text-left"><SortHeader field="practicalPassRate" label="Practical Pass" /></th>
                <th className="px-4 py-3 text-left"><SortHeader field="firstAttemptRate" label="1st-Try" /></th>
                <th className="px-4 py-3 text-left"><SortHeader field="avgAttempts" label="Avg Attempts" /></th>
                <th className="px-4 py-3 text-left"><SortHeader field="writtenTakers" label="Tested" /></th>
                <th className="px-4 py-3 text-left"><SortHeader field="tuition" label="Tuition" /></th>
              </tr>
            </thead>
            <tbody>
              {pageItems.map((s) => {
                const isSel = selected.includes(s.id);
                const small = (s.writtenTakers ?? 0) < MIN_SAMPLE;
                return (
                  <tr key={s.id} className={`border-b border-slate-100 last:border-0 transition-colors ${isSel ? "bg-blue-50/60" : "hover:bg-slate-50"}`}>
                    <td className="px-3 py-3">
                      <input
                        type="checkbox"
                        checked={isSel}
                        onChange={() => toggleSelect(s.id)}
                        disabled={!isSel && selected.length >= MAX_COMPARE}
                        aria-label={`Compare ${s.name}`}
                        className="w-4 h-4 rounded border-slate-300 text-blue-600 focus:ring-blue-500 disabled:opacity-30"
                      />
                    </td>
                    <td className="px-4 py-3">
                      {s.slug ? (
                        <Link href={`/schools/${s.slug}`} className="font-semibold text-slate-900 hover:text-blue-600 transition-colors">{s.name}</Link>
                      ) : (
                        <span className="font-semibold text-slate-900">{s.name}</span>
                      )}
                      <div className="flex items-center gap-2 mt-0.5 text-xs text-slate-500 flex-wrap">
                        {s.city && <span>{s.city}{s.state ? `, ${s.state}` : ""}</span>}
                        {s.accredited && (
                          <span className="inline-flex items-center gap-0.5 text-green-700"><Award className="w-3 h-3" />Accredited</span>
                        )}
                        {s.rating != null && (
                          <span className="inline-flex items-center gap-0.5"><Star className="w-3 h-3 fill-amber-400 text-amber-400" />{s.rating.toFixed(1)}</span>
                        )}
                        {small && (
                          <span className="inline-flex items-center gap-0.5 text-amber-700 font-semibold"><AlertTriangle className="w-3 h-3" />small sample</span>
                        )}
                      </div>
                    </td>
                    <td className="px-4 py-3"><PassBar value={s.writtenPassRate} /></td>
                    <td className="px-4 py-3"><PassBar value={s.practicalPassRate} /></td>
                    <td className={`px-4 py-3 whitespace-nowrap font-semibold ${passTone(s.firstAttemptRate)}`}>{pct(s.firstAttemptRate)}</td>
                    <td className="px-4 py-3 whitespace-nowrap text-slate-700">{s.avgAttempts != null ? s.avgAttempts.toFixed(1) : "—"}</td>
                    <td className="px-4 py-3 whitespace-nowrap text-slate-600">{s.writtenTakers ?? "—"}</td>
                    <td className="px-4 py-3 whitespace-nowrap text-slate-700">{money(s.tuition)}</td>
                  </tr>
                );
              })}
              {sorted.length === 0 && (
                <tr>
                  <td colSpan={8} className="px-4 py-12 text-center text-slate-400">
                    No schools match those filters. Try turning off “{MIN_SAMPLE}+ test-takers only”.
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>

        {totalPages > 1 && (
          <div className="border-t border-slate-200 flex justify-center items-center gap-2 py-4">
            <button onClick={() => setPage((p) => Math.max(1, p - 1))} disabled={page === 1}
              className="px-3 py-1.5 text-xs sm:text-sm font-medium text-slate-700 bg-white border border-slate-300 rounded-lg hover:bg-slate-50 disabled:opacity-50 flex items-center gap-1">
              <ChevronLeft className="w-3.5 h-3.5" />Previous
            </button>
            <span className="text-sm text-slate-500 px-2">Page {page} of {totalPages}</span>
            <button onClick={() => setPage((p) => Math.min(totalPages, p + 1))} disabled={page === totalPages}
              className="px-3 py-1.5 text-xs sm:text-sm font-medium text-slate-700 bg-white border border-slate-300 rounded-lg hover:bg-slate-50 disabled:opacity-50 flex items-center gap-1">
              Next<ChevronRight className="w-3.5 h-3.5" />
            </button>
          </div>
        )}
      </div>

      {/* Compare tray */}
      {selectedSchools.length > 0 && !showCompare && (
        <div className="fixed bottom-0 inset-x-0 z-40 bg-slate-900 text-white shadow-2xl">
          <div className="max-w-7xl mx-auto px-4 py-3 flex items-center gap-3 flex-wrap">
            <Scale className="w-5 h-5 shrink-0" />
            <span className="text-sm font-semibold">{selectedSchools.length} selected</span>
            <div className="flex gap-2 flex-wrap flex-1 min-w-0">
              {selectedSchools.map((s) => (
                <span key={s.id} className="inline-flex items-center gap-1 bg-white/10 rounded-full pl-3 pr-1.5 py-1 text-xs">
                  <span className="truncate max-w-[10rem]">{s.name}</span>
                  <button onClick={() => toggleSelect(s.id)} aria-label={`Remove ${s.name}`} className="hover:bg-white/20 rounded-full p-0.5">
                    <X className="w-3 h-3" />
                  </button>
                </span>
              ))}
            </div>
            <button onClick={() => setSelected([])} className="text-xs text-white/60 hover:text-white">Clear</button>
            <button onClick={() => setShowCompare(true)} disabled={selectedSchools.length < 2}
              className="px-4 py-2 rounded-lg bg-blue-600 hover:bg-blue-500 text-sm font-semibold disabled:opacity-40 disabled:cursor-not-allowed">
              Compare {selectedSchools.length < 2 ? "(pick 2+)" : ""}
            </button>
          </div>
        </div>
      )}

      {/* Side-by-side */}
      {showCompare && selectedSchools.length >= 2 && (
        <div className="fixed inset-0 z-50 bg-slate-900/60 backdrop-blur-sm flex items-end sm:items-center justify-center p-0 sm:p-6 overflow-y-auto">
          <div className="bg-white w-full max-w-5xl rounded-t-2xl sm:rounded-2xl shadow-2xl max-h-[92vh] overflow-y-auto">
            <div className="sticky top-0 bg-white border-b border-slate-200 px-5 py-4 flex items-center justify-between">
              <h2 className="text-lg font-black text-slate-900">
                Side-by-side · {license === "barber" ? "Barber" : "Cosmetology"} exam outcomes
              </h2>
              <button onClick={() => setShowCompare(false)} className="p-1.5 rounded-lg hover:bg-slate-100" aria-label="Close comparison">
                <X className="w-5 h-5 text-slate-500" />
              </button>
            </div>
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <tbody>
                  {[
                    { label: "Location", get: (s: CompareSchool) => `${s.city ?? "—"}${s.state ? `, ${s.state}` : ""}` },
                    { label: "Written pass rate", get: (s: CompareSchool) => pct(s.writtenPassRate), strong: true },
                    { label: "Practical pass rate", get: (s: CompareSchool) => pct(s.practicalPassRate), strong: true },
                    { label: "Passed 1st try", get: (s: CompareSchool) => pct(s.firstAttemptRate) },
                    { label: "Avg attempts to pass", get: (s: CompareSchool) => (s.avgAttempts != null ? s.avgAttempts.toFixed(1) : "—") },
                    { label: "Students tested", get: (s: CompareSchool) => (s.writtenTakers != null ? `${s.writtenTakers}${(s.writtenTakers ?? 0) < MIN_SAMPLE ? " (small sample)" : ""}` : "—") },
                    { label: "Annual tuition", get: (s: CompareSchool) => money(s.tuition) },
                    { label: "Accreditation", get: (s: CompareSchool) => (s.accredited ? "Accredited" : "Not listed") },
                    { label: "Google rating", get: (s: CompareSchool) => (s.rating != null ? `${s.rating.toFixed(1)} ★${s.reviews ? ` (${s.reviews})` : ""}` : "—") },
                  ].map((row, ri) => (
                    <tr key={row.label} className={ri === 0 ? "" : "border-t border-slate-100"}>
                      <th className="px-4 py-3 text-left text-xs font-semibold text-slate-500 uppercase tracking-wide align-top w-40 bg-slate-50">
                        {row.label}
                      </th>
                      {selectedSchools.map((s) => (
                        <td key={s.id} className={`px-4 py-3 align-top ${row.strong ? "font-bold text-slate-900" : "text-slate-700"}`}>
                          {ri === 0 && (
                            <div className="font-black text-slate-900 mb-1 text-base">
                              {s.slug ? <Link href={`/schools/${s.slug}`} className="hover:text-blue-600">{s.name}</Link> : s.name}
                            </div>
                          )}
                          {row.get(s)}
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

      {selectedSchools.length > 0 && !showCompare && <div className="h-20" />}
    </div>
  );
}
