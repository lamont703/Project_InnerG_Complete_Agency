"use client";

import React, { useState, useEffect, useMemo } from 'react';
import './benchmarking.css';
import { Award, MapPin, Building2, TrendingUp, Users, ChevronLeft, ChevronRight, Calendar, Sparkles } from 'lucide-react';
import { Navbar } from "@/components/layout/navbar";
import { Footer } from "@/components/layout/footer";
import { useTheme } from 'next-themes';

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
}

export default function TexasSchoolBenchmarkingPage() {
    const { setTheme } = useTheme();
    const [allRankings, setAllRankings] = useState<SchoolRanking[]>([]);
    const [currentPage, setCurrentPage] = useState(1);
    const [pageSize, setPageSize] = useState(10);
    const [loading, setLoading] = useState(true);
    
    const [year, setYear] = useState<string>("all"); // 'all', '2026', '2025', '2024', '2023'
    const [selectedAccreditation, setSelectedAccreditation] = useState<string>("All"); // 'All', 'Accredited', 'Non-Accredited'
    const [selectedCounty, setSelectedCounty] = useState<string>("All");
    const [minPassRate, setMinPassRate] = useState<number>(0);
    const [sortBy, setSortBy] = useState<string>("passRate");
    const [sortOrder, setSortOrder] = useState<"asc" | "desc">("desc");

    // Force light theme for this B2B school page
    useEffect(() => {
        setTheme("light");
    }, [setTheme]);

    // Load rankings dynamically when the year changes
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

    // Get unique counties based on active dataset
    const counties = useMemo(() => {
        const c = new Set(allRankings.map(r => r.county).filter(Boolean));
        return ["All", ...Array.from(c).sort()];
    }, [allRankings]);

    // Apply Filters and Sorting
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

    // Calculate Market Leader based on filtered view
    const marketLeaderName = useMemo(() => {
        const activeRankings = filteredAndSortedRankings;
        if (activeRankings.length === 0) return "N/A";
        return activeRankings[0].schoolName;
    }, [filteredAndSortedRankings]);

    if (loading) {
        return (
            <main className="min-h-screen bg-slate-50 flex items-center justify-center">
                <div className="flex flex-col items-center gap-4">
                    <div className="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-blue-500"></div>
                    <p className="text-sm font-semibold text-slate-500">Recalculating Leaderboard Matrices...</p>
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
                        Live Industry Intelligence
                    </div>
                </div>
                <h1 className="hero-title">Texas Barber School <br />Competitor Benchmarking</h1>
                <p className="hero-subtitle">
                    Institutional-grade performance analysis ranking every board-reporting school by cumulative 
                    first-time pass rates for the <strong>Class A Barber Written English</strong> exam. 
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
                        <div className="overview-label">Total Barber Schools</div>
                        <div className="overview-value">{allRankings.length}</div>
                    </div>
                    <div className="overview-card">
                        <div className="overview-label">Accredited Schools</div>
                        <div className="overview-value">
                            {allRankings.filter(r => r.isAccredited).length}
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
                            <option value="passRate">Overall Success</option>
                            <option value="totalExams">Exam Volume</option>
                            <option value="name">School Name</option>
                        </select>
                    </div>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-6 items-center mt-6 border-t border-gray-100 pt-6">
                    <div className="flex flex-col gap-2">
                        <label className="text-xs font-bold text-gray-500 uppercase tracking-wider">Min. Pass Rate ({minPassRate}%)</label>
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
                    return (
                        <div key={school.schoolCode} className={`ranking-card rank-${globalIndex + 1}`}>
                            <div className="rank-badge">
                                {globalIndex + 1}
                            </div>
                            
                            <div className="school-info">
                                <div className="flex items-center gap-3 mb-1">
                                    <h2 className="school-name">{school.schoolName}</h2>
                                    <span className={`status-indicator ${school.isAccredited ? 'status-active' : 'status-expired'}`} style={{ fontWeight: 800 }}>
                                        {school.isAccredited ? 'ACCREDITED' : 'NON-ACCREDITED'}
                                    </span>
                                    {school.status === 'EXPIRED' && (
                                        <span className="status-indicator status-expired">
                                            LIC. EXPIRED
                                        </span>
                                    )}
                                </div>
                                
                                <div className="school-meta">
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
                                        ID: {school.schoolCode}
                                    </div>
                                </div>

                                <div className="stats-grid">
                                    <div className="stat-item">
                                        <span className="stat-value">{school.totalExams}</span>
                                        <span className="stat-label flex items-center gap-1">
                                            <Users size={12} /> Total Exams
                                        </span>
                                    </div>
                                    <div className="stat-item">
                                        <span className="stat-value text-green-600">{school.passes}</span>
                                        <span className="stat-label">Passes</span>
                                    </div>
                                    <div className="stat-item">
                                        <span className="stat-value text-red-600">{school.fails}</span>
                                        <span className="stat-label">Failures</span>
                                    </div>
                                </div>

                                <div className="breakdown-grid">
                                    <div className="breakdown-box">
                                        <div className="breakdown-title">First-Time</div>
                                        <div className="breakdown-value text-blue-600">{school.firstTimePassRate.toFixed(1)}%</div>
                                        <div className="breakdown-subtext">{school.firstTimeCount} students</div>
                                    </div>
                                    <div className="breakdown-box">
                                        <div className="breakdown-title">Repeaters</div>
                                        <div className="breakdown-value text-purple-600">{school.repeaterPassRate.toFixed(1)}%</div>
                                        <div className="breakdown-subtext">{school.repeaterCount} students</div>
                                    </div>
                                </div>

                                <div className="comparison-row">
                                    <div className="comparison-bar-group">
                                        <div className="comparison-item">
                                            <div className="comparison-label flex items-center gap-1">School</div>
                                            <div className="comparison-track">
                                                <div className="comparison-fill fill-school" style={{ width: `${school.passRate}%` }}></div>
                                            </div>
                                            <div className="comparison-value">{school.passRate.toFixed(0)}%</div>
                                        </div>
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

                            <div className="performance-stats">
                                <div className="pass-rate-big">
                                    {school.passRate.toFixed(1)}%
                                </div>
                                <div className="pass-rate-label">Overall Success</div>
                                <div className="progress-bar-container">
                                    <div 
                                        className="progress-bar-fill" 
                                        style={{ width: `${school.passRate}%` }}
                                    ></div>
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
                        } else if (p === currentPage - 2 || p === currentPage + 2) {
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

            <footer className="max-w-[1200px] mx-auto mt-20 pb-10 border-t border-gray-200 pt-10 flex justify-between items-center text-sm text-gray-400">
                <div>
                    Source: Texas Department of Licensing and Regulation (TDLR) & PSI Official State Board Roster
                </div>
                <div>
                    Data synchronized: {new Date().toLocaleDateString()}
                </div>
            </footer>
        </div>
        <Footer />
        </main>
    );
}
