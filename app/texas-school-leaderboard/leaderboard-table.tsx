"use client";

import { useState, useMemo, useEffect } from "react";
import Link from "next/link";
import { ChevronDown, ChevronUp, ChevronLeft, ChevronRight, ArrowLeft, Info, Award, Star } from "lucide-react";
import type { LeaderboardSchool } from "./page";

// Schools need at least this many 2026 written test-takers before we're
// willing to rank them — a school with 1 test-taker at 100% shouldn't
// outrank one with 60 test-takers at 85%. Below this, they show in a
// separate "not enough data yet" list instead of being hidden entirely.
const MIN_SAMPLE_SIZE = 5;

// The full list ran 148/97 rows deep with no way to jump around — paginating
// keeps each page short without losing sortability.
const PAGE_SIZE = 20;

type SortField =
  | "school_leaderboard_score_2026"
  | "written_pass_rate_2026"
  | "practical_pass_rate_2026"
  | "written_first_attempt_pass_rate_2026"
  | "written_avg_attempts_to_pass_2026"
  | "written_test_takers_2026";

function formatPercent(val: number | null) {
  return val != null ? `${Math.round(val * 100)}%` : "—";
}

function formatCurrency(val: number | null) {
  return val != null ? `$${Number(val).toLocaleString()}` : "—";
}

function scoreColorClasses(score: number | null) {
  if (score == null) return "bg-slate-100 text-slate-500";
  if (score >= 85) return "bg-green-100 text-green-700";
  if (score >= 70) return "bg-amber-100 text-amber-700";
  return "bg-red-100 text-red-700";
}

export function LeaderboardTable({
  barberSchools,
  cosmetologySchools,
}: {
  barberSchools: LeaderboardSchool[];
  cosmetologySchools: LeaderboardSchool[];
}) {
  const [licenseType, setLicenseType] = useState<"barber" | "cosmetology">("barber");
  const [sortField, setSortField] = useState<SortField>("school_leaderboard_score_2026");
  const [sortDirection, setSortDirection] = useState<"asc" | "desc">("desc");
  const [rankedPage, setRankedPage] = useState(1);
  const [emergingPage, setEmergingPage] = useState(1);

  const activeSchools = licenseType === "barber" ? barberSchools : cosmetologySchools;

  const { ranked, emerging } = useMemo(() => {
    const ranked = activeSchools.filter((s) => (s.written_test_takers_2026 ?? 0) >= MIN_SAMPLE_SIZE);
    const emerging = activeSchools
      .filter((s) => (s.written_test_takers_2026 ?? 0) < MIN_SAMPLE_SIZE)
      .sort((a, b) => (b.written_test_takers_2026 ?? 0) - (a.written_test_takers_2026 ?? 0));

    const sorted = [...ranked].sort((a, b) => {
      const aVal = a[sortField] ?? -1;
      const bVal = b[sortField] ?? -1;
      return sortDirection === "desc" ? bVal - aVal : aVal - bVal;
    });

    return { ranked: sorted, emerging };
  }, [activeSchools, sortField, sortDirection]);

  // Switching schools/sort order changes what "page 1" means, so jump back
  // to it rather than leaving the user stranded on a now-mismatched page.
  useEffect(() => {
    setRankedPage(1);
  }, [licenseType, sortField, sortDirection]);
  useEffect(() => {
    setEmergingPage(1);
  }, [licenseType]);

  const rankedTotalPages = Math.max(1, Math.ceil(ranked.length / PAGE_SIZE));
  const emergingTotalPages = Math.max(1, Math.ceil(emerging.length / PAGE_SIZE));
  const rankedPageItems = ranked.slice((rankedPage - 1) * PAGE_SIZE, rankedPage * PAGE_SIZE);
  const emergingPageItems = emerging.slice((emergingPage - 1) * PAGE_SIZE, emergingPage * PAGE_SIZE);

  const handleSort = (field: SortField) => {
    if (field === sortField) {
      setSortDirection((d) => (d === "desc" ? "asc" : "desc"));
    } else {
      setSortField(field);
      setSortDirection("desc");
    }
  };

  const PaginationControls = ({
    page,
    totalPages,
    onChange,
  }: {
    page: number;
    totalPages: number;
    onChange: (page: number) => void;
  }) => {
    if (totalPages <= 1) return null;
    return (
      <div className="flex justify-center items-center gap-2 py-4 flex-wrap">
        <button
          onClick={() => onChange(Math.max(1, page - 1))}
          disabled={page === 1}
          className="px-3 py-1.5 text-xs sm:text-sm font-medium text-slate-700 bg-white border border-slate-300 rounded-lg hover:bg-slate-50 disabled:opacity-50 transition-colors flex items-center gap-1"
        >
          <ChevronLeft className="w-3.5 h-3.5" />
          Previous
        </button>
        <div className="flex gap-1">
          {Array.from({ length: totalPages }).map((_, i) => (
            <button
              key={i + 1}
              onClick={() => onChange(i + 1)}
              className={`w-8 h-8 flex items-center justify-center text-sm font-medium rounded-lg transition-colors border ${
                page === i + 1
                  ? "bg-blue-600 text-white border-blue-600 shadow-sm"
                  : "text-slate-700 bg-white border-slate-300 hover:bg-slate-50"
              }`}
            >
              {i + 1}
            </button>
          ))}
        </div>
        <button
          onClick={() => onChange(Math.min(totalPages, page + 1))}
          disabled={page === totalPages}
          className="px-3 py-1.5 text-xs sm:text-sm font-medium text-slate-700 bg-white border border-slate-300 rounded-lg hover:bg-slate-50 disabled:opacity-50 transition-colors flex items-center gap-1"
        >
          Next
          <ChevronRight className="w-3.5 h-3.5" />
        </button>
      </div>
    );
  };

  const SortHeader = ({ field, label }: { field: SortField; label: string }) => (
    <button
      onClick={() => handleSort(field)}
      className="flex items-center gap-1 whitespace-nowrap hover:text-slate-900 transition-colors"
    >
      {label}
      {sortField === field &&
        (sortDirection === "desc" ? <ChevronDown className="w-3.5 h-3.5" /> : <ChevronUp className="w-3.5 h-3.5" />)}
    </button>
  );

  return (
    <div>
      {/* License type toggle */}
      <div className="flex items-center justify-center gap-2 mb-6">
        <button
          onClick={() => setLicenseType("barber")}
          className={`px-5 py-2 rounded-full text-sm font-semibold border transition-colors ${
            licenseType === "barber"
              ? "bg-blue-600 border-blue-600 text-white shadow-md"
              : "bg-white border-slate-200 text-slate-600 hover:bg-slate-50"
          }`}
        >
          Barber Schools ({barberSchools.length})
        </button>
        <button
          onClick={() => setLicenseType("cosmetology")}
          className={`px-5 py-2 rounded-full text-sm font-semibold border transition-colors ${
            licenseType === "cosmetology"
              ? "bg-blue-600 border-blue-600 text-white shadow-md"
              : "bg-white border-slate-200 text-slate-600 hover:bg-slate-50"
          }`}
        >
          Cosmetology Schools ({cosmetologySchools.length})
        </button>
      </div>

      {/* Methodology disclosure */}
      <div className="flex gap-3 bg-blue-50 border border-blue-200 rounded-xl px-4 py-3 mb-6 text-sm text-blue-900">
        <Info className="w-4 h-4 shrink-0 mt-0.5" />
        <p>
          <strong>Score</strong> = 50% written pass rate + 25% first-attempt success rate + 15% practical pass rate + 10%
          accreditation bonus, using each school&apos;s 2026 available data (missing components are excluded rather than
          scored as zero). Schools need at least {MIN_SAMPLE_SIZE} 2026 written test-takers to be ranked — fewer than that,
          and one lucky or unlucky result could swing a percentage wildly.
        </p>
      </div>

      {/* Ranked table */}
      <div className="bg-white border border-slate-200 rounded-2xl shadow-sm overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-slate-200 text-xs font-semibold text-slate-500 uppercase tracking-wide">
                <th className="px-4 py-3 text-left">Rank</th>
                <th className="px-4 py-3 text-left">School</th>
                <th className="px-4 py-3 text-left">
                  <SortHeader field="school_leaderboard_score_2026" label="Score" />
                </th>
                <th className="px-4 py-3 text-left">
                  <SortHeader field="written_pass_rate_2026" label="Written Pass Rate" />
                </th>
                <th className="px-4 py-3 text-left">
                  <SortHeader field="practical_pass_rate_2026" label="Practical Pass Rate" />
                </th>
                <th className="px-4 py-3 text-left">
                  <SortHeader field="written_first_attempt_pass_rate_2026" label="1st-Try Pass Rate" />
                </th>
                <th className="px-4 py-3 text-left">
                  <SortHeader field="written_avg_attempts_to_pass_2026" label="Avg Attempts" />
                </th>
                <th className="px-4 py-3 text-left">
                  <SortHeader field="written_test_takers_2026" label="Students Tested" />
                </th>
                <th className="px-4 py-3 text-left">Tuition</th>
              </tr>
            </thead>
            <tbody>
              {rankedPageItems.map((school, i) => (
                <tr key={school.id} className="border-b border-slate-100 last:border-0 hover:bg-slate-50">
                  <td className="px-4 py-3 text-slate-400 font-medium">{(rankedPage - 1) * PAGE_SIZE + i + 1}</td>
                  <td className="px-4 py-3">
                    <Link href={`/schools/${school.slug}`} className="font-semibold text-slate-900 hover:text-blue-600 transition-colors">
                      {school.school_name}
                    </Link>
                    <div className="flex items-center gap-2 mt-0.5 text-xs text-slate-500">
                      {school.city && <span>{school.city}</span>}
                      {school.accreditation_status === "Accredited" && (
                        <span className="inline-flex items-center gap-0.5 text-green-700">
                          <Award className="w-3 h-3" /> Accredited
                        </span>
                      )}
                      {school.rating && (
                        <span className="inline-flex items-center gap-0.5">
                          <Star className="w-3 h-3 fill-amber-400 text-amber-400" /> {school.rating}
                        </span>
                      )}
                    </div>
                  </td>
                  <td className="px-4 py-3">
                    <span className={`px-2 py-1 rounded-md font-bold text-xs ${scoreColorClasses(school.school_leaderboard_score_2026)}`}>
                      {school.school_leaderboard_score_2026 != null ? Math.round(school.school_leaderboard_score_2026) : "—"}
                    </span>
                  </td>
                  <td className="px-4 py-3 whitespace-nowrap">{formatPercent(school.written_pass_rate_2026)}</td>
                  <td className="px-4 py-3 whitespace-nowrap">{formatPercent(school.practical_pass_rate_2026)}</td>
                  <td className="px-4 py-3 whitespace-nowrap">{formatPercent(school.written_first_attempt_pass_rate_2026)}</td>
                  <td className="px-4 py-3 whitespace-nowrap">
                    {school.written_avg_attempts_to_pass_2026 != null ? school.written_avg_attempts_to_pass_2026.toFixed(1) : "—"}
                  </td>
                  <td className="px-4 py-3 whitespace-nowrap">{school.written_test_takers_2026}</td>
                  <td className="px-4 py-3 whitespace-nowrap">{formatCurrency(school.annual_tuition)}</td>
                </tr>
              ))}
              {ranked.length === 0 && (
                <tr>
                  <td colSpan={9} className="px-4 py-10 text-center text-slate-400">
                    No {licenseType === "barber" ? "barber" : "cosmetology"} schools have enough 2026 data to rank yet.
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
        <div className="border-t border-slate-200">
          <PaginationControls page={rankedPage} totalPages={rankedTotalPages} onChange={setRankedPage} />
        </div>
      </div>

      {/* Not enough data yet */}
      {emerging.length > 0 && (
        <div className="mt-8">
          <h2 className="text-sm font-bold text-slate-500 uppercase tracking-wide mb-3">
            Not Enough 2026 Data Yet ({emerging.length})
          </h2>
          <p className="text-sm text-slate-500 mb-3">
            These schools have fewer than {MIN_SAMPLE_SIZE} recorded 2026 written test-takers, so a pass rate wouldn&apos;t be
            statistically meaningful yet.
          </p>
          <div className="bg-white border border-slate-200 rounded-2xl shadow-sm overflow-hidden">
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <tbody>
                  {emergingPageItems.map((school) => (
                    <tr key={school.id} className="border-b border-slate-100 last:border-0 hover:bg-slate-50">
                      <td className="px-4 py-3">
                        <Link href={`/schools/${school.slug}`} className="font-medium text-slate-700 hover:text-blue-600 transition-colors">
                          {school.school_name}
                        </Link>
                      </td>
                      <td className="px-4 py-3 text-slate-500">{school.city || "—"}</td>
                      <td className="px-4 py-3 text-slate-500 whitespace-nowrap">
                        {school.written_test_takers_2026 ?? 0} student{school.written_test_takers_2026 === 1 ? "" : "s"} tested
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
            <div className="border-t border-slate-200">
              <PaginationControls page={emergingPage} totalPages={emergingTotalPages} onChange={setEmergingPage} />
            </div>
          </div>
        </div>
      )}

      <div className="text-center mt-10">
        <Link href="/tools/barbershop-search" className="inline-flex items-center gap-1.5 text-sm font-medium text-slate-500 hover:text-blue-600 transition-colors">
          <ArrowLeft className="w-4 h-4" />
          Back to Search
        </Link>
      </div>
    </div>
  );
}
