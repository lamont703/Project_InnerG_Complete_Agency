"use client";

import React, { useState, useEffect, useMemo } from 'react';
import './historical.css';
import { Award, MapPin, Building2, TrendingUp, Users, Calendar, AlertTriangle, ChevronRight, Sparkles } from 'lucide-react';
import { Navbar } from "@/components/layout/navbar";
import { Footer } from "@/components/layout/footer";
import { useTheme } from 'next-themes';

interface School {
    code: string;
    name: string;
}

interface TimelinePoint {
    month: string;
    statePassRate: number;
    schoolPassRate: number | null;
    schoolExams: number;
    isPrediction: boolean;
}

export default function HistoricalPerformancePage() {
    const { setTheme } = useTheme();
    const [schools, setSchools] = useState<School[]>([]);
    const [selectedCode, setSelectedCode] = useState<string>("");
    const [timePeriod, setTimePeriod] = useState<string>("all"); // 'all', '2026', '2025', '2024', '2023'
    const [schoolName, setSchoolName] = useState<string>("");
    const [overallPassRate, setOverallPassRate] = useState<number>(0);
    const [totalExams, setTotalExams] = useState<number>(0);
    const [timeline, setTimeline] = useState<TimelinePoint[]>([]);
    const [loading, setLoading] = useState<boolean>(true);
    const [chartDataLoading, setChartDataLoading] = useState<boolean>(false);
    const [hoveredPointIndex, setHoveredPointIndex] = useState<number | null>(null);

    // Force light theme for this B2B school page
    useEffect(() => {
        setTheme("light");
    }, [setTheme]);

    // 1. Initial Load: Get list of available schools across all periods
    useEffect(() => {
        async function fetchInitialSchools() {
            try {
                const res = await fetch('/api/texas-historical-performance');
                const data = await res.json();
                if (data.schools && data.schools.length > 0) {
                    setSchools(data.schools);
                    // Default to first school
                    setSelectedCode(data.schools[0].code);
                }
            } catch (err) {
                console.error("Failed to load school index:", err);
            } finally {
                setLoading(false);
            }
        }
        fetchInitialSchools();
    }, []);

    // 2. Fetch school timeline and predictions when selection or timePeriod changes
    useEffect(() => {
        if (!selectedCode) return;

        async function fetchSchoolData() {
            setChartDataLoading(true);
            try {
                const res = await fetch(`/api/texas-historical-performance?schoolCode=${selectedCode}&timePeriod=${timePeriod}`);
                const data = await res.json();
                setSchoolName(data.selectedSchoolName);
                setOverallPassRate(data.overallPassRate);
                setTotalExams(data.totalExams);
                setTimeline(data.timeline || []);
            } catch (err) {
                console.error("Failed to fetch historical trends:", err);
            } finally {
                setChartDataLoading(false);
            }
        }
        fetchSchoolData();
    }, [selectedCode, timePeriod]);

    // 3. SVG Custom Chart Math - Dynamically scales depending on timeline length
    const chartConfig = useMemo(() => {
        const width = 600;
        const height = 300;
        const paddingLeft = 60;
        const paddingRight = 40;
        const paddingTop = 40;
        const paddingBottom = 40;

        const chartWidth = width - paddingLeft - paddingRight;
        const chartHeight = height - paddingTop - paddingBottom;

        // Map months to X coordinates
        const xCoords = timeline.map((_, idx) => {
            if (timeline.length <= 1) return paddingLeft + chartWidth / 2;
            return paddingLeft + (idx / (timeline.length - 1)) * chartWidth;
        });

        // Inverted SVG Y axis (0% at bottom, 100% at top)
        const getY = (val: number) => {
            return paddingTop + chartHeight - (val / 100) * chartHeight;
        };

        // Render Path String helpers
        const getPathD = (points: { x: number; y: number | null }[]) => {
            const validPoints = points.filter(p => p.y !== null) as { x: number; y: number }[];
            if (validPoints.length === 0) return "";
            return validPoints.map((p, idx) => `${idx === 0 ? 'M' : 'L'} ${p.x} ${p.y}`).join(' ');
        };

        // Find boundary between actuals and predictions
        const actualPoints = timeline.filter(p => !p.isPrediction);
        const histLength = actualPoints.length;

        // School historical coordinates
        const schoolHistPoints = timeline.slice(0, histLength).map((p, idx) => ({
            x: xCoords[idx],
            y: p.schoolPassRate !== null ? getY(p.schoolPassRate) : null
        }));

        // School prediction coordinates
        const schoolPredPoints = timeline.slice(histLength - 1).map((p, idx) => {
            const globalIdx = histLength - 1 + idx;
            return {
                x: xCoords[globalIdx],
                y: p.schoolPassRate !== null ? getY(p.schoolPassRate) : null
            };
        });

        // State historical coordinates
        const stateHistPoints = timeline.slice(0, histLength).map((p, idx) => ({
            x: xCoords[idx],
            y: getY(p.statePassRate)
        }));

        // State prediction coordinates
        const statePredPoints = timeline.slice(histLength - 1).map((p, idx) => {
            const globalIdx = histLength - 1 + idx;
            return {
                x: xCoords[globalIdx],
                y: getY(p.statePassRate)
            };
        });

        return {
            width,
            height,
            paddingLeft,
            paddingRight,
            paddingTop,
            paddingBottom,
            chartWidth,
            chartHeight,
            xCoords,
            getY,
            getPathD,
            schoolHistPoints,
            schoolPredPoints,
            stateHistPoints,
            statePredPoints,
            histLength
        };
    }, [timeline]);

    // Calculate predictions indicators dynamically
    const finalProjection = useMemo(() => {
        const predictionPoints = timeline.filter(p => p.isPrediction);
        if (predictionPoints.length === 0) return null;
        return predictionPoints[predictionPoints.length - 1];
    }, [timeline]);

    const lastActualPoint = useMemo(() => {
        const actualPoints = timeline.filter(p => !p.isPrediction);
        if (actualPoints.length === 0) return null;
        return actualPoints[actualPoints.length - 1];
    }, [timeline]);

    const isBelowNaccas = overallPassRate < 70;
    const isProjectedBelowNaccas = finalProjection !== null && finalProjection.schoolPassRate !== null && finalProjection.schoolPassRate < 70;

    // Helper to prevent month axis labels from overlapping on long timelines
    const shouldShowLabel = (idx: number) => {
        if (timeline.length <= 12) return true;
        // In All Time (46 points), show every 4th label and always the last forecast label
        return idx % 4 === 0 || idx === timeline.length - 1;
    };

    if (loading) {
        return (
            <main className="min-h-screen bg-slate-50 flex items-center justify-center">
                <div className="flex flex-col items-center gap-4">
                    <div className="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-blue-500"></div>
                    <p className="text-sm font-semibold text-slate-500">Initializing Forecasting Engine...</p>
                </div>
            </main>
        );
    }

    return (
        <main className="min-h-screen bg-slate-50">
            <Navbar />
            <div className="historical-container">
                <header className="hero-section">
                    <div className="flex justify-center mb-6">
                        <div className="bg-violet-500/10 text-violet-600 px-4 py-1.5 rounded-full text-sm font-semibold border border-violet-500/20 flex items-center gap-2">
                            <Sparkles size={16} />
                            Multi-Year Historical Analytics & AI Forecasts
                        </div>
                    </div>
                    <h1 className="hero-title">Texas Barber School <br />Historical & Predictive Performance</h1>
                    <p className="hero-subtitle">
                        Analyze detailed school pass-rates over consecutive academic years along with linear regression forecasting.
                    </p>
                </header>

                {/* Dropdown Selector Controls */}
                <div className="selector-section">
                    {/* Academy Selector */}
                    <div className="flex flex-col gap-1 flex-1">
                        <label className="text-[10px] font-bold text-gray-400 uppercase tracking-widest flex items-center gap-1.5">
                            <Building2 size={12} className="text-blue-500" /> Select Academy
                        </label>
                        <select
                            className="school-dropdown"
                            value={selectedCode}
                            onChange={(e) => setSelectedCode(e.target.value)}
                        >
                            {schools.map(s => (
                                <option key={s.code} value={s.code}>{s.name} ({s.code})</option>
                            ))}
                        </select>
                    </div>

                    {/* Time Period Selector */}
                    <div className="flex flex-col gap-1 w-full md:w-[280px]">
                        <label className="text-[10px] font-bold text-gray-400 uppercase tracking-widest flex items-center gap-1.5">
                            <Calendar size={12} className="text-blue-500" /> Time Period
                        </label>
                        <select
                            className="school-dropdown"
                            value={timePeriod}
                            onChange={(e) => setTimePeriod(e.target.value)}
                        >
                            <option value="all">All-Time (4-Year Trend)</option>
                            <option value="2026">2026 (Active Forecast)</option>
                            <option value="2025">2025 (Historical)</option>
                            <option value="2024">2024 (Historical)</option>
                            <option value="2023">2023 (Historical)</option>
                        </select>
                    </div>
                </div>

                {chartDataLoading ? (
                    <div className="max-w-[1000px] mx-auto h-[400px] bg-white rounded-2xl border border-slate-200 shadow-sm flex items-center justify-center mb-12">
                        <div className="animate-spin rounded-full h-8 w-8 border-t-2 border-b-2 border-blue-500"></div>
                    </div>
                ) : (
                    <>
                        {/* Summary Metrics Grid */}
                        <div className="metrics-grid">
                            <div className="metric-card">
                                <span className="metric-label">
                                    {timePeriod === 'all' ? 'All-Time Average Pass Rate' : `${timePeriod} Average Pass Rate`}
                                </span>
                                <span className={`metric-value ${isBelowNaccas ? 'status-text-danger' : 'status-text-success'}`}>
                                    {totalExams > 0 ? `${overallPassRate}%` : "N/A"}
                                </span>
                            </div>
                            <div className="metric-card">
                                <span className="metric-label">Total Written Exams</span>
                                <span className="metric-value">{totalExams}</span>
                            </div>

                            {/* Dynamic Third Card: Shows AI Forecast when predictions exist, otherwise EOY historical rate */}
                            {finalProjection !== null ? (
                                <div className="metric-card metric-card-ai">
                                    <span className="metric-label flex items-center gap-1">
                                        <Sparkles size={12} className="text-violet-500" /> {finalProjection.month} Forecast
                                    </span>
                                    <span className={`metric-value ${isProjectedBelowNaccas ? 'status-text-danger' : 'status-text-success'}`}>
                                        {finalProjection.schoolPassRate !== null ? `${finalProjection.schoolPassRate}%` : "N/A"}
                                    </span>
                                </div>
                            ) : (
                                <div className="metric-card">
                                    <span className="metric-label flex items-center gap-1">
                                        <Calendar size={12} className="text-blue-500" /> {lastActualPoint ? lastActualPoint.month : "EOY"} Rate
                                    </span>
                                    <span className={`metric-value ${lastActualPoint && lastActualPoint.schoolPassRate !== null && lastActualPoint.schoolPassRate < 70 ? 'status-text-danger' : 'status-text-success'}`}>
                                        {lastActualPoint && lastActualPoint.schoolPassRate !== null ? `${lastActualPoint.schoolPassRate}%` : "N/A"}
                                    </span>
                                </div>
                            )}
                        </div>

                        {/* Interactive Line Chart Card */}
                        <div className="chart-card">
                            <div className="chart-title-wrapper">
                                <div className="chart-title flex items-center gap-2">
                                    <TrendingUp size={20} className="text-blue-500" />
                                    Written Pass Rates {finalProjection !== null ? '& AI Forecasts' : 'Timeline'}
                                </div>
                                <div className="chart-legend">
                                    <div className="legend-item">
                                        <div className="legend-color bg-blue-600" />
                                        <span>School Rate</span>
                                    </div>
                                    {finalProjection !== null && (
                                        <div className="legend-item">
                                            <div className="legend-color bg-violet-600" style={{ opacity: 0.5, border: '1px dashed #8b5cf6' }} />
                                            <span className="text-violet-600">AI Forecast</span>
                                        </div>
                                    )}
                                    <div className="legend-item">
                                        <div className="legend-color bg-amber-500" />
                                        <span>State Average</span>
                                    </div>
                                    <div className="legend-item">
                                        <div className="legend-color bg-rose-500" />
                                        <span>70% NACCAS Margin</span>
                                    </div>
                                </div>
                            </div>

                            {/* Responsive Custom SVG Chart Wrapper */}
                            <div className="relative w-full overflow-hidden" style={{ aspectRatio: '600 / 300' }}>
                                <svg
                                    viewBox={`0 0 ${chartConfig.width} ${chartConfig.height}`}
                                    className="w-full h-full overflow-visible"
                                >
                                    {/* Grid Lines (100%, 70%, 50%, 0%) */}
                                    {[100, 70, 50, 0].map(yVal => {
                                        const y = chartConfig.getY(yVal);
                                        const isNaccas = yVal === 70;
                                        return (
                                            <g key={yVal}>
                                                <line
                                                    x1={chartConfig.paddingLeft}
                                                    y1={y}
                                                    x2={chartConfig.width - chartConfig.paddingRight}
                                                    y2={y}
                                                    stroke={isNaccas ? "#f43f5e" : "#e2e8f0"}
                                                    strokeWidth={isNaccas ? 1.5 : 1}
                                                    strokeDasharray={isNaccas ? undefined : "4 4"}
                                                />
                                                <text
                                                    x={chartConfig.paddingLeft - 10}
                                                    y={y + 4}
                                                    textAnchor="end"
                                                    className={`text-[10px] font-bold ${isNaccas ? 'fill-rose-500' : 'fill-slate-400'}`}
                                                >
                                                    {yVal}%
                                                </text>
                                            </g>
                                        );
                                    })}

                                    {/* State Average Historical Line (Solid Orange) */}
                                    <path
                                        d={chartConfig.getPathD(chartConfig.stateHistPoints)}
                                        fill="none"
                                        stroke="#f59e0b"
                                        strokeWidth="2"
                                    />

                                    {/* State Average Prediction Line (Dashed Orange) */}
                                    {finalProjection !== null && (
                                        <path
                                            d={chartConfig.getPathD(chartConfig.statePredPoints)}
                                            fill="none"
                                            stroke="#f59e0b"
                                            strokeWidth="2"
                                            strokeDasharray="6 4"
                                        />
                                    )}

                                    {/* School Pass Rate Historical Line (Solid Blue) */}
                                    <path
                                        d={chartConfig.getPathD(chartConfig.schoolHistPoints)}
                                        fill="none"
                                        stroke="#2563eb"
                                        strokeWidth="3.5"
                                        strokeLinecap="round"
                                        strokeLinejoin="round"
                                    />

                                    {/* School Pass Rate Prediction Line (Dashed Glowing Purple-Blue) */}
                                    {finalProjection !== null && (
                                        <path
                                            d={chartConfig.getPathD(chartConfig.schoolPredPoints)}
                                            fill="none"
                                            stroke="#8b5cf6"
                                            strokeWidth="3"
                                            strokeLinecap="round"
                                            className="chart-line-prediction"
                                        />
                                    )}

                                    {/* State Data Point Circles */}
                                    {timeline.map((p, idx) => {
                                        if (!shouldShowLabel(idx)) return null;
                                        const x = chartConfig.xCoords[idx];
                                        const y = chartConfig.getY(p.statePassRate);
                                        return (
                                            <circle
                                                key={`state-dot-${idx}`}
                                                cx={x}
                                                cy={y}
                                                r="3"
                                                fill="#f59e0b"
                                                stroke="#ffffff"
                                                strokeWidth="1"
                                            />
                                        );
                                    })}

                                    {/* School Data Point Circles */}
                                    {timeline.map((p, idx) => {
                                        if (p.schoolPassRate === null) return null;
                                        if (!shouldShowLabel(idx)) return null;
                                        const x = chartConfig.xCoords[idx];
                                        const y = chartConfig.getY(p.schoolPassRate);
                                        const isHovered = hoveredPointIndex === idx;
                                        return (
                                            <circle
                                                key={`school-dot-${idx}`}
                                                cx={x}
                                                cy={y}
                                                r={isHovered ? "8" : "6"}
                                                fill={p.isPrediction ? "#8b5cf6" : "#2563eb"}
                                                stroke="#ffffff"
                                                strokeWidth={isHovered ? "2.5" : "2"}
                                                className="transition-all duration-150 cursor-pointer"
                                                onMouseEnter={() => setHoveredPointIndex(idx)}
                                                onMouseLeave={() => setHoveredPointIndex(null)}
                                            />
                                        );
                                    })}

                                    {/* Month Axis Labels (Filtered to prevent overlaps) */}
                                    {timeline.map((point, idx) => {
                                        if (!shouldShowLabel(idx)) return null;
                                        return (
                                            <text
                                                key={`label-${idx}`}
                                                x={chartConfig.xCoords[idx]}
                                                y={chartConfig.height - 10}
                                                textAnchor="middle"
                                                className={`text-[9px] font-bold ${point.isPrediction ? 'fill-violet-400 font-extrabold' : 'fill-slate-500'}`}
                                            >
                                                {point.month}
                                            </text>
                                        );
                                    })}
                                </svg>

                                {/* Dynamic Tooltip Overlay */}
                                {hoveredPointIndex !== null && timeline[hoveredPointIndex].schoolPassRate !== null && (
                                    <div
                                        className="absolute bg-slate-900 text-white p-3 rounded-lg shadow-xl text-xs font-semibold flex flex-col gap-1 border border-white/10 pointer-events-none transition-all"
                                        style={{
                                            left: `${(chartConfig.xCoords[hoveredPointIndex] / chartConfig.width) * 100}%`,
                                            top: `${(chartConfig.getY(timeline[hoveredPointIndex].schoolPassRate!) / chartConfig.height) * 100 - 25}%`,
                                            transform: 'translate(-50%, -100%)'
                                        }}
                                    >
                                        <div className="text-slate-400 border-b border-slate-700 pb-1 mb-1 font-bold flex items-center justify-between gap-4">
                                            <span>{timeline[hoveredPointIndex].month}</span>
                                            {timeline[hoveredPointIndex].isPrediction && (
                                                <span className="text-[9px] text-violet-400 font-extrabold tracking-widest uppercase">AI PREDICTION</span>
                                            )}
                                        </div>
                                        <div className="flex justify-between gap-6">
                                            <span>{timeline[hoveredPointIndex].isPrediction ? 'Projected Rate:' : 'Pass Rate:'}</span>
                                            <span className={`${timeline[hoveredPointIndex].isPrediction ? 'text-violet-400' : 'text-blue-400'} font-bold`}>
                                                {timeline[hoveredPointIndex].schoolPassRate}%
                                            </span>
                                        </div>
                                        <div className="flex justify-between gap-6">
                                            <span>State Average:</span>
                                            <span className="text-amber-400 font-bold">{timeline[hoveredPointIndex].statePassRate}%</span>
                                        </div>
                                        {!timeline[hoveredPointIndex].isPrediction && (
                                            <div className="flex justify-between gap-6">
                                                <span>Exams Conducted:</span>
                                                <span className="text-white font-bold">{timeline[hoveredPointIndex].schoolExams}</span>
                                            </div>
                                        )}
                                    </div>
                                )}
                            </div>

                            {/* Mobile Table View (Shows limited rows or scrolls) */}
                            <div className="max-h-[300px] overflow-y-auto mt-6">
                                <table className="monthly-table">
                                    <thead>
                                        <tr>
                                            <th>Timeline</th>
                                            <th>School Rate</th>
                                            <th>State Average</th>
                                            <th>Exams Taken</th>
                                        </tr>
                                    </thead>
                                    <tbody>
                                        {timeline.map((point, idx) => (
                                            <tr key={idx} className={point.isPrediction ? 'prediction-row' : ''}>
                                                <td className="flex items-center gap-1.5">
                                                    {point.month}
                                                    {point.isPrediction && <span className="badge-ai">AI</span>}
                                                </td>
                                                <td className={point.schoolPassRate !== null && point.schoolPassRate < 70 ? 'text-rose-500 font-bold' : 'text-slate-700 font-bold'}>
                                                    {point.schoolPassRate !== null ? `${point.schoolPassRate}%` : "No Exams"}
                                                </td>
                                                <td>{point.statePassRate}%</td>
                                                <td>{point.isPrediction ? "N/A" : point.schoolExams}</td>
                                            </tr>
                                        ))}
                                    </tbody>
                                </table>
                            </div>
                        </div>

                        {/* Context-Aware Insights Card */}
                        {finalProjection !== null ? (
                            <div className="ai-insights-box">
                                <div className="insight-icon-container">
                                    <Sparkles size={24} />
                                </div>
                                <div className="callout-content">
                                    <h3 className="callout-title" style={{ color: '#8b5cf6' }}>6-Month AI Trend Intelligence</h3>
                                    <p className="callout-desc">
                                        {isProjectedBelowNaccas ? (
                                            <span>
                                                <strong>Accreditation Risk Warning:</strong> 6-month mathematical trend models project your written exam success rate to slide to <strong>{finalProjection.schoolPassRate}%</strong> by {finalProjection.month}. This falls below the mandatory <strong>70% NACCAS standard</strong>. Immediate diagnostic audit is recommended to avoid Title IV accreditation threat.
                                            </span>
                                        ) : (
                                            <span>
                                                <strong>Positive Outlook:</strong> 6-month forecasting models project your written board success rate to stay highly compliant at <strong>{finalProjection.schoolPassRate}%</strong> through {finalProjection.month}. Maintain practice simulator depth to preserve this safe margin!
                                            </span>
                                        )}
                                    </p>
                                </div>
                                <button
                                    onClick={() => window.location.href = '/tools/texas-barber-school-accreditation-relationship-auditor'}
                                    className="callout-btn callout-btn-ai flex items-center gap-1.5 justify-center"
                                >
                                    Audit Title IV Aid Risk <ChevronRight size={16} />
                                </button>
                            </div>
                        ) : (
                            <div className="ai-insights-box" style={{ borderColor: 'rgba(37, 99, 235, 0.25)', background: 'rgba(37, 99, 235, 0.03)' }}>
                                <div className="insight-icon-container" style={{ color: '#2563eb', background: 'rgba(37, 99, 235, 0.08)', borderColor: 'rgba(37, 99, 235, 0.15)' }}>
                                    <TrendingUp size={24} />
                                </div>
                                <div className="callout-content">
                                    <h3 className="callout-title" style={{ color: '#2563eb' }}>{timePeriod} Calendar Year Summary</h3>
                                    <p className="callout-desc">
                                        For the {timePeriod} calendar year, this academy held an average board pass-rate of <strong>{overallPassRate}%</strong> across <strong>{totalExams}</strong> exams.
                                        {overallPassRate < 70 ? (
                                            <span> This was <strong>below</strong> the NACCAS compliance benchmark of 70%, reflecting an active warning period during that calendar phase.</span>
                                        ) : (
                                            <span> This successfully **surpassed** the NACCAS compliance benchmark of 70%, securing the institution's Title IV funding safety zone during that phase.</span>
                                        )}
                                    </p>
                                </div>
                            </div>
                        )}

                        {/* Local Source Footer */}
                        <footer className="max-w-[1000px] mx-auto mt-20 pb-10 border-t border-gray-200 pt-10 flex justify-between items-center text-xs text-slate-400 font-semibold">
                            <div>
                                Source: Texas Department of Licensing and Regulation (TDLR) & PSI Official State Board Roster
                            </div>
                            <div>
                                Data synchronized: {new Date().toLocaleDateString()}
                            </div>
                        </footer>
                    </>
                )}
            </div>
            <Footer />
        </main>
    );
}
