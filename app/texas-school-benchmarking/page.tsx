"use client";

import React, { useState, useEffect, useMemo } from 'react';
import './benchmarking.css';
import { Award, MapPin, Building2, TrendingUp, Users, ChevronLeft, ChevronRight, Calendar, Star, Globe, Phone, Clock } from 'lucide-react';
import { Navbar } from "@/components/layout/navbar";
import { Footer } from "@/components/layout/footer";
import { useTheme } from 'next-themes';

export interface FinancialData {
    costOfAttendance: string;
    completionRate: string;
    medianEarnings: string;
    defaultRate: string;
    pellGrantRate: string;
    federalLoanRate: string;
}

export interface GooglePlacesData {
    placeId: string;
    name: string;
    address: string;
    lat: string;
    lng: string;
    telephone: string;
    website: string;
    rating: string;
    totalReviews: string;
    types: string;
    businessStatus: string;
    openingHours: string;
}

interface SchoolRanking {
    schoolCode: string;
    schoolName: string;
    licenseNumber: string;
    licenseType: string;
    city: string;
    county: string;
    totalExams: number;
    passes: number;
    fails: number;
    passRate: number;
    firstTimePassRate: number;
    repeaterPassRate: number;
    firstTimeCount: number;
    repeaterCount: number;
    countyAvgPassRate: number;
    stateAvgPassRate: number;
    status: string;
    isAccredited: boolean;
    googleData: GooglePlacesData | null;
    financialData: FinancialData | null;
}

export default function TexasSchoolBenchmarkingPage() {
    const { setTheme } = useTheme();
    const [allRankings, setAllRankings] = useState<SchoolRanking[]>([]);
    const [currentPage, setCurrentPage] = useState(1);
    const [pageSize, setPageSize] = useState(10);
    const [loading, setLoading] = useState(true);
    
    const [year, setYear] = useState<string>("all");
    const [selectedAccreditation, setSelectedAccreditation] = useState<string>("All");
    const [selectedCounty, setSelectedCounty] = useState<string>("All");
    const [minPassRate, setMinPassRate] = useState<number>(0);
    const [sortBy, setSortBy] = useState<string>("passRate");
    const [sortOrder, setSortOrder] = useState<"asc" | "desc">("desc");

    useEffect(() => {
        setTheme("light");
    }, [setTheme]);

    useEffect(() => {
        async function loadData() {
            setLoading(true);
            try {
                const response = await fetch(`/api/texas-rankings?year=${year}`);
                const data = await response.json();
                setAllRankings(data);
            } catch (err) {
                console.error("Failed to load rankings", err);
            } finally {
                setLoading(false);
            }
        }
        loadData();
    }, [year]);

    const counties = useMemo(() => {
        const c = new Set(allRankings.map(r => r.county).filter(Boolean));
        return ["All", ...Array.from(c).sort()];
    }, [allRankings]);

    const filteredAndSortedRankings = useMemo(() => {
        return allRankings
            .filter(school => {
                const matchesCounty = selectedCounty === "All" || school.county === selectedCounty;
                const matchesPassRate = school.passRate >= minPassRate;
                const matchesAccreditation = 
                    selectedAccreditation === "All" || 
                    (selectedAccreditation === "Accredited" && school.isAccredited) ||
                    (selectedAccreditation === "Non-Accredited" && !school.isAccredited);
                return matchesCounty && matchesPassRate && matchesAccreditation;
            })
            .sort((a, b) => {
                let comparison = 0;
                if (sortBy === "passRate") {
                    comparison = a.passRate - b.passRate;
                } else if (sortBy === "totalExams") {
                    comparison = a.totalExams - b.totalExams;
                } else if (sortBy === "name") {
                    comparison = a.schoolName.localeCompare(b.schoolName);
                } else if (sortBy === "googleRating") {
                    const ratingA = a.googleData && a.googleData.rating !== 'N/A' ? parseFloat(a.googleData.rating) : 0;
                    const ratingB = b.googleData && b.googleData.rating !== 'N/A' ? parseFloat(b.googleData.rating) : 0;
                    comparison = ratingA - ratingB;
                } else if (sortBy === "roi") {
                    const earnA = a.financialData && a.financialData.medianEarnings !== 'N/A' ? parseFloat(a.financialData.medianEarnings) : 0;
                    const earnB = b.financialData && b.financialData.medianEarnings !== 'N/A' ? parseFloat(b.financialData.medianEarnings) : 0;
                    comparison = earnA - earnB;
                }
                return sortOrder === "desc" ? -comparison : comparison;
            });
    }, [allRankings, selectedCounty, minPassRate, selectedAccreditation, sortBy, sortOrder]);

    const totalPages = Math.ceil(filteredAndSortedRankings.length / pageSize);
    
    const paginatedRankings = useMemo(() => {
        const start = (currentPage - 1) * pageSize;
        return filteredAndSortedRankings.slice(start, start + pageSize);
    }, [filteredAndSortedRankings, currentPage, pageSize]);

    const handlePageSizeChange = (e: React.ChangeEvent<HTMLSelectElement>) => {
        setPageSize(Number(e.target.value));
        setCurrentPage(1);
    };

    if (loading) {
        return (
            <main className="min-h-screen bg-slate-50 flex items-center justify-center">
                <div className="flex flex-col items-center gap-4">
                    <div className="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-blue-500"></div>
                    <p className="text-sm font-semibold text-slate-500">Fusing Academic Telemetry with Google Places Matrix...</p>
                </div>
            </main>
        );
    }

    return (
        <main className="min-h-screen bg-slate-50">
            <Navbar />
            <div className="benchmarking-container">
            <header className="hero-section">
                <div className="flex justify-center mb-6">
                    <div className="bg-blue-500/10 text-blue-600 px-4 py-1.5 rounded-full text-sm font-semibold border border-blue-500/20 flex items-center gap-2">
                        <TrendingUp size={16} />
                        Omnichannel Industry Intelligence
                    </div>
                </div>
                <h1 className="hero-title">Texas Barber School <br />Command Center</h1>
                <p className="hero-subtitle">
                    Cross-referencing institutional TDLR Board Pass Rates against live Google consumer reputation, geographical density, and digital authority. 
                    Currently viewing {year === 'all' ? 'All-Time (2023 - 2026) telemetry' : `${year} calendar year telemetry`}.
                </p>
            </header>

            {allRankings.length > 0 && (
                <div className="state-overview">
                    <div className="overview-card">
                        <div className="overview-label">State Pass Rate</div>
                        <div className="overview-value">{allRankings[0].stateAvgPassRate.toFixed(1)}%</div>
                    </div>
                    <div className="overview-card">
                        <div className="overview-label">Monitored Schools</div>
                        <div className="overview-value">{allRankings.length}</div>
                    </div>
                    <div className="overview-card bg-gradient-to-br from-indigo-50 to-white border-indigo-100">
                        <div className="overview-label text-indigo-700 flex items-center gap-1.5"><Star size={16} fill="currentColor"/> Verified Google Data</div>
                        <div className="overview-value text-indigo-900">
                            {allRankings.filter(r => r.googleData && r.googleData.rating !== 'N/A').length}
                        </div>
                    </div>
                </div>
            )}

            <div className="bg-white p-6 rounded-2xl border border-gray-200 shadow-sm mb-8 max-w-[1200px] mx-auto">
                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6 items-end">
                    <div className="flex flex-col gap-2">
                        <label className="text-xs font-bold text-gray-500 uppercase tracking-wider flex items-center gap-1">
                            <Calendar size={12} className="text-blue-500" /> Time Period
                        </label>
                        <select 
                            className="page-size-selector w-full"
                            value={year}
                            onChange={(e) => { setYear(e.target.value); setCurrentPage(1); }}
                        >
                            <option value="all">All-Time (4-Year)</option>
                            <option value="2026">2026</option>
                            <option value="2025">2025</option>
                            <option value="2024">2024</option>
                            <option value="2023">2023</option>
                        </select>
                    </div>

                    <div className="flex flex-col gap-2">
                        <label className="text-xs font-bold text-gray-500 uppercase tracking-wider flex items-center gap-1">
                            <Building2 size={12} className="text-blue-500" /> Accreditation
                        </label>
                        <select 
                            className="page-size-selector w-full"
                            value={selectedAccreditation}
                            onChange={(e) => { setSelectedAccreditation(e.target.value); setCurrentPage(1); }}
                        >
                            <option value="All">All Schools</option>
                            <option value="Accredited">Accredited Only</option>
                            <option value="Non-Accredited">Non-Accredited Only</option>
                        </select>
                    </div>

                    <div className="flex flex-col gap-2">
                        <label className="text-xs font-bold text-gray-500 uppercase tracking-wider flex items-center gap-1">
                            <MapPin size={12} className="text-blue-500" /> Filter by County
                        </label>
                        <select 
                            className="page-size-selector w-full"
                            value={selectedCounty}
                            onChange={(e) => { setSelectedCounty(e.target.value); setCurrentPage(1); }}
                        >
                            {counties.map(c => <option key={c} value={c}>{c}</option>)}
                        </select>
                    </div>

                    <div className="flex flex-col gap-2">
                        <label className="text-xs font-bold text-gray-500 uppercase tracking-wider">Sort By</label>
                        <select 
                            className="page-size-selector w-full"
                            value={sortBy}
                            onChange={(e) => setSortBy(e.target.value)}
                        >
                            <option value="passRate">Academic Success Rate</option>
                            <option value="googleRating">Consumer Google Rating</option>
                            <option value="totalExams">Exam Volume</option>
                            <option value="name">School Name</option>
                            <option value="roi">Graduate ROI (Earnings)</option>
                        </select>
                    </div>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-6 items-center mt-6 border-t border-gray-100 pt-6">
                    <div className="flex flex-col gap-2">
                        <label className="text-xs font-bold text-gray-500 uppercase tracking-wider">Min. Academic Pass Rate ({minPassRate}%)</label>
                        <input 
                            type="range" 
                            min="0" max="100" step="5"
                            className="h-2 bg-gray-200 rounded-lg appearance-none cursor-pointer accent-blue-600 w-full"
                            value={minPassRate}
                            onChange={(e) => { setMinPassRate(Number(e.target.value)); setCurrentPage(1); }}
                        />
                    </div>

                    <div className="flex justify-between items-center bg-gray-50 p-2.5 rounded-xl border border-gray-100 max-w-md ml-auto w-full">
                        <div className="flex items-center gap-2">
                            <label className="text-xs font-bold text-gray-500">Show:</label>
                            <select 
                                className="bg-transparent border-none text-sm font-bold focus:ring-0"
                                value={pageSize}
                                onChange={handlePageSizeChange}
                            >
                                <option value={10}>10 per page</option>
                                <option value={25}>25 per page</option>
                                <option value={50}>50 per page</option>
                            </select>
                        </div>
                        <div className="flex gap-1">
                            <button 
                                onClick={() => setSortOrder("asc")}
                                className={`p-1.5 rounded-lg ${sortOrder === "asc" ? "bg-white shadow-sm text-blue-600 border border-gray-200" : "text-gray-400"}`}
                            >
                                <TrendingUp size={16} className="rotate-180" />
                            </button>
                            <button 
                                onClick={() => setSortOrder("desc")}
                                className={`p-1.5 rounded-lg ${sortOrder === "desc" ? "bg-white shadow-sm text-blue-600 border border-gray-200" : "text-gray-400"}`}
                            >
                                <TrendingUp size={16} />
                            </button>
                        </div>
                    </div>
                </div>
            </div>

            <div className="max-w-[1200px] mx-auto mb-4 text-sm text-gray-500 font-medium">
                Found {filteredAndSortedRankings.length} schools matching your filters
            </div>

            <main className="ranking-grid">
                {paginatedRankings.map((school, index) => {
                    const globalIndex = (currentPage - 1) * pageSize + index;
                    
                    // Identify pedagogical misalignment (e.g. low pass rate but high reviews, or vice versa)
                    const gData = school.googleData;
                    const hasGoogle = gData && gData.rating !== 'N/A';
                    const ratingNum = hasGoogle ? parseFloat(gData.rating) : 0;
                    
                    const isMarketingStrong = ratingNum >= 4.5;
                    const isAcademicWeak = school.passRate < 60;
                    const misalignmentFlag = hasGoogle && isMarketingStrong && isAcademicWeak;

                    return (
                        <div key={school.schoolCode} className={`ranking-card flex flex-col rank-${globalIndex + 1}`}>
                            <div className="rank-badge">
                                {globalIndex + 1}
                            </div>
                            
                            <div className="school-info flex-1">
                                <div className="flex items-center gap-3 mb-1">
                                    <h2 className="school-name">{school.schoolName}</h2>
                                    <span className={`status-indicator ${school.isAccredited ? 'status-active' : 'status-expired'}`} style={{ fontWeight: 800 }}>
                                        {school.isAccredited ? 'ACCREDITED' : 'NON-ACCREDITED'}
                                    </span>
                                </div>
                                
                                <div className="school-meta mb-4">
                                    <div className="flex items-center gap-1.5">
                                        <MapPin size={14} className="text-blue-500" />
                                        {school.city}, {school.county} County
                                    </div>
                                    <div className="flex items-center gap-1.5">
                                        <Building2 size={14} className="text-gray-400" />
                                        {school.licenseType}
                                    </div>
                                    <div className="flex items-center gap-1.5">
                                        <Award size={14} className="text-gray-400" />
                                        TDLR ID: {school.schoolCode}
                                    </div>
                                </div>

                                {/* PREMIUM MODULE: Reputation vs Rigor Matrix */}
                                <div className="grid grid-cols-2 gap-4 mb-4">
                                    <div className="bg-slate-50 rounded-xl p-3 border border-slate-100 flex flex-col justify-between">
                                        <div className="text-[10px] font-bold text-slate-400 uppercase tracking-wider mb-2">Academic Rigor</div>
                                        <div className="flex items-end justify-between">
                                            <div className={`text-2xl font-black ${school.passRate >= 70 ? 'text-green-600' : 'text-red-500'}`}>
                                                {school.passRate.toFixed(1)}%
                                            </div>
                                            <div className="text-xs text-slate-500 pb-1">{school.totalExams} Exams</div>
                                        </div>
                                    </div>

                                    <div className="bg-indigo-50/50 rounded-xl p-3 border border-indigo-50 flex flex-col justify-between">
                                        <div className="text-[10px] font-bold text-indigo-400 uppercase tracking-wider mb-2 flex items-center gap-1">
                                            <Star size={10} fill="currentColor" /> Consumer Reputation
                                        </div>
                                        {hasGoogle ? (
                                            <div className="flex items-end justify-between">
                                                <div className="text-2xl font-black text-indigo-700 flex items-center gap-1">
                                                    {ratingNum.toFixed(1)}
                                                </div>
                                                <div className="text-xs text-indigo-500 pb-1 font-semibold">{gData.totalReviews} Reviews</div>
                                            </div>
                                        ) : (
                                            <div className="text-xs text-slate-400 italic">Unclaimed on Google</div>
                                        )}
                                    </div>
                                </div>

                                {misalignmentFlag && (
                                    <div className="bg-amber-50 text-amber-800 text-xs p-2.5 rounded-lg border border-amber-200 font-medium mb-4 flex items-start gap-2">
                                        <div className="mt-0.5">⚠️</div>
                                        <div>
                                            <strong>Pedagogical Misalignment:</strong> High consumer ratings ({ratingNum}) but critically low board pass rates ({school.passRate.toFixed(1)}%). Indicates strong marketing but failing curriculum structure.
                                        </div>
                                    </div>
                                )}

                                {/* PREMIUM MODULE: Federal Economic Telemetry */}
                                {school.financialData && (
                                    <div className="bg-emerald-50/50 rounded-xl p-3 border border-emerald-100 mb-4 flex flex-col gap-2">
                                        <div className="text-[10px] font-bold text-emerald-600 uppercase tracking-wider mb-1 flex items-center gap-1">
                                            <TrendingUp size={10} strokeWidth={3} /> Economic Intelligence & Federal ROI
                                        </div>
                                        <div className="grid grid-cols-2 gap-3">
                                            <div>
                                                <div className="text-[10px] text-emerald-600/70 uppercase font-bold mb-0.5">Program Cost</div>
                                                <div className="text-sm font-black text-emerald-900">
                                                    {school.financialData.costOfAttendance !== 'N/A' && school.financialData.costOfAttendance !== 'null' ? `$${Number(school.financialData.costOfAttendance).toLocaleString()}` : 'N/A'}
                                                </div>
                                            </div>
                                            <div>
                                                <div className="text-[10px] text-emerald-600/70 uppercase font-bold mb-0.5">1-Yr Median Earnings</div>
                                                <div className="text-sm font-black text-emerald-900">
                                                    {school.financialData.medianEarnings !== 'N/A' && school.financialData.medianEarnings !== 'null' ? `$${Number(school.financialData.medianEarnings).toLocaleString()}` : 'N/A'}
                                                </div>
                                            </div>
                                            <div>
                                                <div className="text-[10px] text-emerald-600/70 uppercase font-bold mb-0.5">3-Yr Default Rate</div>
                                                <div className={`text-sm font-black ${parseFloat(school.financialData.defaultRate) > 0.15 ? 'text-red-500' : 'text-emerald-900'}`}>
                                                    {school.financialData.defaultRate !== 'N/A' && school.financialData.defaultRate !== 'null' ? `${(parseFloat(school.financialData.defaultRate) * 100).toFixed(1)}%` : 'N/A'}
                                                </div>
                                            </div>
                                            <div>
                                                <div className="text-[10px] text-emerald-600/70 uppercase font-bold mb-0.5">Federal Dependency</div>
                                                <div className="text-sm font-black text-emerald-900">
                                                    {school.financialData.pellGrantRate !== 'N/A' && school.financialData.pellGrantRate !== 'null' ? `${(parseFloat(school.financialData.pellGrantRate) * 100).toFixed(0)}% Pell` : 'N/A'}
                                                </div>
                                            </div>
                                        </div>
                                        {school.financialData.defaultRate !== 'N/A' && parseFloat(school.financialData.defaultRate) > 0.15 && (
                                            <div className="mt-1 bg-red-50 text-red-800 text-xs p-2 rounded-lg border border-red-200 font-medium flex gap-2">
                                                <span className="mt-0.5">⚠️</span> <span>High Default Risk: Critical percentage of graduates failing to repay loans.</span>
                                            </div>
                                        )}
                                    </div>
                                )}

                                {/* PREMIUM MODULE: Digital Authority & Operations */}
                                {hasGoogle && (
                                    <div className="flex flex-col gap-2 bg-gray-50 rounded-lg p-3 text-xs mb-4 border border-gray-100">
                                        {gData.telephone !== 'N/A' && (
                                            <div className="flex items-center gap-2 text-gray-600">
                                                <Phone size={12} className="text-gray-400" />
                                                <a href={`tel:${gData.telephone}`} className="hover:text-blue-600">{gData.telephone}</a>
                                            </div>
                                        )}
                                        {gData.website !== 'N/A' && (
                                            <div className="flex items-center gap-2 text-gray-600 truncate">
                                                <Globe size={12} className="text-gray-400 shrink-0" />
                                                <a href={gData.website} target="_blank" rel="noreferrer" className="text-blue-600 hover:underline truncate">
                                                    {gData.website.replace(/^https?:\/\/(www\.)?/, '')}
                                                </a>
                                            </div>
                                        )}
                                        {gData.openingHours !== 'N/A' && (
                                            <div className="flex gap-2 text-gray-500 mt-1 pt-2 border-t border-gray-200">
                                                <Clock size={12} className="shrink-0 mt-0.5" />
                                                <span className="line-clamp-2" title={gData.openingHours}>
                                                    {gData.openingHours}
                                                </span>
                                            </div>
                                        )}
                                    </div>
                                )}
                            </div>

                            <div className="mt-auto border-t border-gray-100 pt-4">
                                <div className="text-[10px] font-bold text-gray-400 uppercase tracking-wider mb-2">Regional Benchmark</div>
                                <div className="comparison-row">
                                    <div className="comparison-bar-group">
                                        <div className="comparison-item">
                                            <div className="comparison-label">County</div>
                                            <div className="comparison-track">
                                                <div className="comparison-fill fill-county" style={{ width: `${school.countyAvgPassRate}%` }}></div>
                                            </div>
                                            <div className="comparison-value">{school.countyAvgPassRate.toFixed(0)}%</div>
                                        </div>
                                        <div className="comparison-item">
                                            <div className="comparison-label">State</div>
                                            <div className="comparison-track">
                                                <div className="comparison-fill fill-state" style={{ width: `${school.stateAvgPassRate}%` }}></div>
                                            </div>
                                            <div className="comparison-value">{school.stateAvgPassRate.toFixed(0)}%</div>
                                        </div>
                                    </div>
                                </div>
                            </div>
                        </div>
                    );
                })}
            </main>

            {totalPages > 1 && (
                <div className="pagination-controls">
                    <button 
                        className="page-button"
                        onClick={() => setCurrentPage(p => Math.max(1, p - 1))}
                        disabled={currentPage === 1}
                    >
                        <ChevronLeft size={20} />
                    </button>
                    
                    {[...Array(totalPages)].map((_, i) => {
                        const p = i + 1;
                        if (p === 1 || p === totalPages || Math.abs(p - currentPage) <= 1) {
                            return (
                                <button 
                                    key={p}
                                    className={`page-button ${currentPage === p ? 'active' : ''}`}
                                    onClick={() => setCurrentPage(p)}
                                >
                                    {p}
                                </button>
                            );
                        } else if (p === currentPage - 2 || p || currentPage + 2) {
                            return <span key={p} className="text-gray-400 px-2">...</span>;
                        }
                        return null;
                    })}

                    <button 
                        className="page-button"
                        onClick={() => setCurrentPage(p => Math.min(totalPages, p + 1))}
                        disabled={currentPage === totalPages}
                    >
                        <ChevronRight size={20} />
                    </button>
                </div>
            )}

            <footer className="max-w-[1200px] mx-auto mt-20 pb-10 border-t border-gray-200 pt-10 flex flex-col gap-2 justify-center items-center text-xs text-gray-400">
                <div>Source: Texas Department of Licensing and Regulation (TDLR) & Google Places Intelligence API</div>
                <div>Data synchronized: {new Date().toLocaleDateString()}</div>
            </footer>
        </div>
        <Footer />
        </main>
    );
}
