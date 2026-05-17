"use client";

import React, { useState, useEffect, useMemo } from 'react';
import './benchmarking.css';
import { Award, MapPin, Building2, TrendingUp, Users, ChevronLeft, ChevronRight } from 'lucide-react';
import { Navbar } from "@/components/layout/navbar";
import { Footer } from "@/components/layout/footer";

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
}

export default function TexasSchoolBenchmarkingPage() {
    const [allRankings, setAllRankings] = useState<SchoolRanking[]>([]);
    const [currentPage, setCurrentPage] = useState(1);
    const [pageSize, setPageSize] = useState(10);
    const [loading, setLoading] = useState(true);

    // Filter and Sort State
    const [selectedCounty, setSelectedCounty] = useState<string>("All");
    const [minPassRate, setMinPassRate] = useState<number>(0);
    const [sortBy, setSortBy] = useState<string>("passRate");
    const [sortOrder, setSortOrder] = useState<"asc" | "desc">("desc");

    useEffect(() => {
        async function loadData() {
            try {
                const response = await fetch('/api/texas-rankings');
                const data = await response.json();
                setAllRankings(data);
            } catch (err) {
                console.error("Failed to load rankings", err);
            } finally {
                setLoading(false);
            }
        }
        loadData();
    }, []);

    // Get unique counties for the filter
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
                return matchesCounty && matchesPassRate;
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
    }, [allRankings, selectedCounty, minPassRate, sortBy, sortOrder]);

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
            <div className="benchmarking-container flex items-center justify-center">
                <div className="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-blue-500"></div>
            </div>
        );
    }

    return (
        <main className="min-h-screen bg-background">
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
                    Institutional-grade performance analysis ranking every accredited school by cumulative 
                    first-time pass rates for the <strong>Class A Barber Written English</strong> exam.
                </p>
            </header>

            {allRankings.length > 0 && (
                <div className="state-overview">
                    <div className="overview-card">
                        <div className="overview-label">State Pass Rate</div>
                        <div className="overview-value">{allRankings[0].stateAvgPassRate.toFixed(1)}%</div>
                    </div>
                    <div className="overview-card">
                        <div className="overview-label">Total Accredited Schools</div>
                        <div className="overview-value">{allRankings.length}</div>
                    </div>
                    <div className="overview-card">
                        <div className="overview-label">Market Leader</div>
                        <div className="overview-value" style={{ fontSize: '1rem', marginTop: '0.5rem' }}>
                            {allRankings[0].schoolName}
                        </div>
                    </div>
                </div>
            )}

            <div className="bg-white p-6 rounded-2xl border border-gray-200 shadow-sm mb-8 max-w-[1200px] mx-auto">
                <div className="grid grid-cols-1 md:grid-cols-4 gap-6 items-end">
                    <div className="flex flex-col gap-2">
                        <label className="text-xs font-bold text-gray-500 uppercase tracking-wider">Filter by County</label>
                        <select 
                            className="page-size-selector w-full"
                            value={selectedCounty}
                            onChange={(e) => { setSelectedCounty(e.target.value); setCurrentPage(1); }}
                        >
                            {counties.map(c => <option key={c} value={c}>{c}</option>)}
                        </select>
                    </div>

                    <div className="flex flex-col gap-2">
                        <label className="text-xs font-bold text-gray-500 uppercase tracking-wider">Min. Pass Rate ({minPassRate}%)</label>
                        <input 
                            type="range" 
                            min="0" max="100" step="5"
                            className="h-2 bg-gray-200 rounded-lg appearance-none cursor-pointer accent-blue-600"
                            value={minPassRate}
                            onChange={(e) => { setMinPassRate(Number(e.target.value)); setCurrentPage(1); }}
                        />
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

                    <div className="flex justify-between items-center bg-gray-50 p-2 rounded-xl border border-gray-100">
                        <div className="flex items-center gap-2">
                            <label className="text-xs font-bold text-gray-500">Show:</label>
                            <select 
                                className="bg-transparent border-none text-sm font-bold focus:ring-0"
                                value={pageSize}
                                onChange={handlePageSizeChange}
                            >
                                <option value={10}>10</option>
                                <option value={25}>25</option>
                                <option value={50}>50</option>
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
                                    <span className={`status-indicator ${school.status === 'ACTIVE' ? 'status-active' : 'status-expired'}`}>
                                        {school.status}
                                    </span>
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
                                        <span className="stat-value text-red-600">{school.totalExams - school.passes}</span>
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
                                            <div className="comparison-label">School</div>
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
