"use client"

import { ArrowUpRight, Instagram } from "lucide-react"
import type { FunnelRow } from "@/types"

interface SocialAnalyticsPanelProps {
    topPostEngagement?: { value: string; growth: string }
    sentimentPositivePct?: number
    barData?: number[]
}

interface AcquisitionFunnelProps {
    rows: FunnelRow[]
    aiNote?: string
}

/**
 * Social Analytics Panel — Instagram engagement metrics.
 * Shown in the right column of the Kanes Bookstore dashboard.
 *
 * Phase 1 (mock): Static hardcoded engagement and sentiment data.
 *
 * TODO Phase 2:
 *   - Pull from campaign_metrics.social_engagement and .sentiment_positive_pct
 *   - Replace static bar chart with recharts BarChart (30-day engagement)
 *   - Replace mock posts list with real top-performing post data (deferred)
 */
export function SocialAnalyticsPanel({
    topPostEngagement = { value: "2.4k", growth: "+18%" },
    sentimentPositivePct = 92,
    barData = [40, 70, 45, 90, 65, 80],
}: SocialAnalyticsPanelProps) {
    const sentimentItems = [
        { label: "Excitement", pct: 78, color: "bg-emerald-500" },
        { label: "Technical Queries", pct: 12, color: "bg-primary" },
    ]

    return (
        <div className="glass-panel-strong rounded-2xl border border-white/5 p-8">
            <h3 className="text-lg font-bold mb-6 flex items-center gap-2">
                <Instagram className="h-5 w-5 text-pink-500" />
                Social Impact (Instagram API)
            </h3>
            <div className="grid grid-cols-2 gap-4 flex-1">
                {/* Top Post Engagement */}
                <div className="p-5 rounded-2xl bg-white/[0.02] border border-white/5">
                    <p className="text-[10px] text-muted-foreground uppercase font-bold tracking-widest mb-2">
                        Top Post Engagement
                    </p>
                    <div className="flex items-end gap-2 mb-1">
                        <span className="text-2xl font-bold text-foreground">{topPostEngagement.value}</span>
                        <span className="text-[10px] text-emerald-500 font-bold mb-1">{topPostEngagement.growth}</span>
                    </div>
                    {/* Mini bar chart — TODO Phase 2: replace with recharts BarChart */}
                    <div className="flex gap-1 mt-4">
                        {barData.map((h, i) => (
                            <div
                                key={i}
                                className="flex-1 bg-pink-500/20 rounded-t-sm"
                                style={{ height: `${h}px` }}
                            />
                        ))}
                    </div>
                </div>

                {/* Sentiment Breakdown */}
                <div className="p-5 rounded-2xl bg-white/[0.02] border border-white/5">
                    <p className="text-[10px] text-muted-foreground uppercase font-bold tracking-widest mb-2">
                        Comments Sentiment
                    </p>
                    <div className="flex items-end gap-2 mb-1">
                        <span className="text-2xl font-bold text-foreground">{sentimentPositivePct}%</span>
                        <span className="text-[10px] text-emerald-500 font-bold mb-1">POS</span>
                    </div>
                    <div className="mt-4 flex flex-col gap-2">
                        {sentimentItems.map((item) => (
                            <div key={item.label}>
                                <div className="flex justify-between text-[10px] items-center">
                                    <span>{item.label}</span>
                                    <span className="text-foreground font-bold">{item.pct}%</span>
                                </div>
                                <div className="h-1 w-full bg-white/5 rounded-full">
                                    <div
                                        className={`h-full ${item.color} rounded-full`}
                                        style={{ width: `${item.pct}%` }}
                                    />
                                </div>
                            </div>
                        ))}
                    </div>
                </div>
            </div>

            {/* Top Post Links */}
            <div className="mt-6 space-y-3">
                {[
                    { label: "Highest Performing Post:", value: '"Top 5 Summer Reads Giveaway"' },
                    { label: "Top GHL Referral Source:", value: "IG Direct Message (Auto-Reply)" },
                ].map((item) => (
                    <div
                        key={item.label}
                        className="flex items-center justify-between text-xs p-3 rounded-lg bg-white/5 hover:bg-white/10 transition-colors cursor-pointer group"
                    >
                        <span className="text-muted-foreground">
                            {item.label}{" "}
                            <span className="text-foreground font-medium">{item.value}</span>
                        </span>
                        <ArrowUpRight className="h-4 w-4 text-primary opacity-0 group-hover:opacity-100 transition-opacity" />
                    </div>
                ))}
            </div>
        </div>
    )
}

/** Default mock funnel rows for Kane's Bookstore */
export const KANES_MOCK_FUNNEL_ROWS: FunnelRow[] = [
    { step: "IG Ad Impressions", count: "125,400", percent: 100, color: "bg-pink-500/20" },
    { step: "GHL Landing Page Visits", count: "12,840", percent: 10.2, color: "bg-primary/30" },
    { step: "Giveaway Leads (Signups)", count: "4,822", percent: 37.5, color: "bg-primary/50" },
    { step: "Ebook App Activation", count: "3,140", percent: 65.1, color: "bg-primary" },
]

/**
 * Acquisition Funnel — step-by-step conversion breakdown.
 *
 * TODO Phase 2:
 *   - Query funnel_stages + funnel_events tables joined to active campaign
 *   - Replace progress bars with recharts Funnel chart or waterfall visualization
 */
export function AcquisitionFunnel({ rows, aiNote }: AcquisitionFunnelProps) {
    return (
        <div className="glass-panel-strong rounded-2xl border border-white/5 p-8">
            <h3 className="text-lg font-bold mb-6 flex items-center gap-2">
                <ArrowUpRight className="h-5 w-5 text-primary" />
                Acquisition Funnel (GHL & Supabase)
            </h3>
            <div className="space-y-6">
                {rows.map((row, i) => (
                    <div key={i} className="relative">
                        <div className="flex justify-between items-end mb-2">
                            <span className="text-sm font-medium text-foreground">{row.step}</span>
                            <div className="text-right">
                                <span className="text-sm font-bold text-foreground">{row.count}</span>
                                {i > 0 && (
                                    <span className="text-[10px] text-muted-foreground ml-2">
                                        ({row.percent}% of prev)
                                    </span>
                                )}
                            </div>
                        </div>
                        <div className="h-2 w-full bg-white/5 rounded-full overflow-hidden">
                            <div
                                className={`h-full ${row.color} rounded-full transition-all duration-1000`}
                                style={{ width: `${i === 0 ? 100 : row.percent}%` }}
                            />
                        </div>
                    </div>
                ))}
            </div>
            {aiNote && (
                <div className="mt-8 p-4 rounded-xl bg-primary/5 border border-primary/10">
                    <p className="text-xs leading-relaxed text-muted-foreground">
                        <span className="text-primary font-bold">AI Note:</span> {aiNote}
                    </p>
                </div>
            )}
        </div>
    )
}
