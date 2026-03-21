"use client"

import { useState, useEffect } from "react"
import { useParams } from "next/navigation"
import { Loader2, Building2, AlertTriangle, Sparkles, Layout, Target, Activity, Zap, Check, EyeOff, ThumbsUp, MessageSquare, Share2, Eye, Linkedin, BarChart3, Youtube, Video, Play, Instagram, CheckCircle2, Heart, Users, UserSearch } from "lucide-react"
import { Button } from "@/components/ui/button"
import { Facebook, Twitter, Music, AtSign } from "lucide-react"

// Modular Components
import { AgencySidebar } from "./components/AgencySidebar"
import { AgencyHeader } from "./components/AgencyHeader"
import { MetricSlotGrid } from "@/features/metrics/components/MetricSlotGrid"
import { SlotProvider, useSlotContext } from "@/features/metrics/SlotContext"
import { getIcon } from "@/features/metrics/utils/icon-map"
import { useAdminSidebar } from "./context/AdminSidebarContext"
import { SignalSlotFeed } from "@/features/signals/components/SignalSlotFeed"


// Hooks
import { useAgencyData } from "./use-agency-data"
import { SignalService } from "@/features/signals/signal-service"


export function AgencyMetricsPage() {
    return (
        <SlotProvider userRole="super-admin" projectSlug="innergcomplete">
            <AgencyMetricsContent />
        </SlotProvider>
    )
}

function AgencyMetricsContent() {
    const {
        userData,
        projects,
        strategicSignals,
        operationalSignals,
        linkedinMetrics,
        youtubeMetrics,
        instagramMetrics,
        facebookMetrics,
        tiktokMetrics,
        pixelMetrics,
        isLoading,
    } = useAgencyData()

    const params = useParams()
    const { 
        activeSlotIds, 
        availableSlots, 
        toggleSlot, 
        saveChanges, 
        isSaving, 
        isInitialLoading: isConfigLoading 
    } = useSlotContext()
    const { isSidebarOpen, setIsSidebarOpen } = useAdminSidebar()
    const { resolveSignal, deleteDraft } = useAgencyData()

    // Combine and map signals for the feed
    const allSignals = [...strategicSignals, ...operationalSignals]
        .map(s => SignalService.mapRecordToSignal(s as any))
        .sort((a, b) => {
            return new Date(b.createdAt || 0).getTime() - new Date(a.createdAt || 0).getTime()
        })


    const [currentTime, setCurrentTime] = useState(new Date())
    const [mounted, setMounted] = useState(false)

    useEffect(() => {
        setMounted(true)
        const timer = setInterval(() => setCurrentTime(new Date()), 1000)
        return () => clearInterval(timer)
    }, [])

    if (isLoading || isConfigLoading) {
        return (
            <div className="min-h-screen bg-background flex items-center justify-center">
                <div className="flex flex-col items-center gap-4">
                    <Loader2 className="h-8 w-8 animate-spin text-primary" />
                    <p className="text-sm text-muted-foreground font-medium tracking-widest uppercase italic">Initializing Systemwide Ports...</p>
                </div>
            </div>
        )
    }

    const mappedAgencyMetrics: any[] = [
        {
            id: "active_architectures",
            label: "Active Client Projects",
            value: projects.length,
            icon: Building2,
            color: "bg-blue-500/20 text-blue-400",
        },
        {
            id: "system_health",
            label: "Unresolved Signals",
            value: operationalSignals.filter(s => !s.is_resolved).length,
            change: operationalSignals.filter(s => !s.is_resolved).length > 0 ? "Active monitoring" : "All clear",
            trend: operationalSignals.filter(s => !s.is_resolved).length > 0 ? "neutral" : "up",
            icon: AlertTriangle,
            color: operationalSignals.filter(s => !s.is_resolved).length > 0 ? "bg-amber-500/20 text-amber-400" : "bg-emerald-500/20 text-emerald-400",
        },
        {
            id: "agency_intelligence",
            label: "Agency Intelligence",
            value: strategicSignals.length,
            icon: Sparkles,
            color: "bg-violet-500/20 text-violet-400",
        },
        {
            id: "social_reach",
            label: "Omni-Channel Reach",
            value: ((linkedinMetrics?.followers || 0) +
                (instagramMetrics?.reach || 0) +
                (facebookMetrics?.reach || 0) +
                (tiktokMetrics?.totalViews || 0)).toLocaleString(),
            icon: Zap,
            color: "bg-emerald-500/20 text-emerald-400",
        },
        {
            id: "linkedin_followers",
            label: "LinkedIn Followers",
            value: linkedinMetrics?.followers?.toLocaleString() || "0",
            icon: Linkedin,
            color: "bg-blue-600/20 text-blue-400",
        },
        {
            id: "linkedin_impressions",
            label: "LinkedIn Reach",
            value: linkedinMetrics?.views?.toLocaleString() || "0",
            icon: BarChart3,
            color: "bg-indigo-500/20 text-indigo-400",
        },
        {
            id: "linkedin_engagement",
            label: "LinkedIn Engagement",
            value: (linkedinMetrics?.engagement || 0).toFixed(2) + "%",
            icon: Zap,
            color: "bg-emerald-500/20 text-emerald-400",
        },
        {
            id: "linkedin_clicks",
            label: "LinkedIn Clicks",
            value: linkedinMetrics?.clicks?.toLocaleString() || "0",
            icon: Target,
            color: "bg-orange-500/20 text-orange-400",
        },
        {
            id: "linkedin_likes",
            label: "LinkedIn Likes",
            value: linkedinMetrics?.likes?.toLocaleString() || "0",
            icon: ThumbsUp,
            color: "bg-blue-400/20 text-blue-300",
        },
        {
            id: "linkedin_comments",
            label: "LinkedIn Comments",
            value: linkedinMetrics?.comments?.toLocaleString() || "0",
            icon: MessageSquare,
            color: "bg-cyan-500/20 text-cyan-400",
        },
        {
            id: "linkedin_shares",
            label: "LinkedIn Shares",
            value: linkedinMetrics?.shares?.toLocaleString() || "0",
            icon: Share2,
            color: "bg-indigo-600/20 text-indigo-400",
        },
        {
            id: "linkedin_post_views",
            label: "LinkedIn Post Views",
            value: linkedinMetrics?.postViews?.toLocaleString() || "0",
            icon: Eye,
            color: "bg-teal-500/20 text-teal-400",
        },
        {
            id: "youtube_subscribers",
            label: "YT Subscribers",
            value: youtubeMetrics?.subscribers?.toLocaleString() || "0",
            icon: Youtube,
            color: "bg-red-500/20 text-red-400",
        },
        {
            id: "youtube_views",
            label: "YouTube Views",
            value: (youtubeMetrics?.views || 0) > 1000 ? (youtubeMetrics.views / 1000).toFixed(1) + "k" : youtubeMetrics?.views?.toLocaleString() || "0",
            icon: Play,
            color: "bg-red-600/20 text-red-400",
        },
        {
            id: "youtube_video_count",
            label: "YouTube Videos",
            value: youtubeMetrics?.videos?.toLocaleString() || "0",
            icon: Video,
            color: "bg-rose-500/20 text-rose-400",
        },
        // --- TIKTOK LIVE ---
        {
            id: "tiktok_followers",
            label: "TikTok Followers",
            value: tiktokMetrics?.followerCount?.toLocaleString() || "0",
            icon: Music,
            color: "bg-pink-500/20 text-pink-400",
        },
        {
            id: "tiktok_views",
            label: "TikTok Views",
            value: (tiktokMetrics?.totalViews || 0) > 1000 ? (tiktokMetrics.totalViews / 1000).toFixed(1) + "k" : tiktokMetrics?.totalViews?.toLocaleString() || "0",
            icon: Play,
            color: "bg-pink-600/20 text-pink-500",
        },
        {
            id: "tiktok_likes",
            label: "TikTok Likes",
            value: tiktokMetrics?.videoLikes?.toLocaleString() || "0",
            icon: Heart,
            color: "bg-rose-600/20 text-rose-500",
        },

        // --- FACEBOOK PAGE LIVE ---
        {
            id: "facebook_page_likes",
            label: "Facebook Page Likes",
            value: facebookMetrics?.fans?.toLocaleString() || "---",
            icon: Facebook,
            color: "bg-blue-700/20 text-blue-500",
        },
        {
            id: "facebook_reach",
            label: "Facebook Reach",
            value: facebookMetrics?.followers?.toLocaleString() || "---",
            icon: BarChart3,
            color: "bg-blue-600/20 text-blue-400",
        },
        // --- INSTAGRAM AGENCY LIVE ---
        {
            id: "instagram_followers",
            label: "Instagram Followers",
            value: instagramMetrics?.followers?.toLocaleString() || "---",
            icon: Instagram,
            color: "bg-gradient-to-tr from-yellow-500/10 via-red-500/10 to-purple-500/10 text-pink-500",
        },
        {
            id: "instagram_reach",
            label: "Instagram Reach",
            value: (instagramMetrics?.reach || 0) > 1000 ? (instagramMetrics.reach / 1000).toFixed(1) + "k" : instagramMetrics?.reach?.toLocaleString() || "---",
            icon: BarChart3,
            color: "bg-purple-500/20 text-purple-400",
        },
        {
            id: "instagram_engagement",
            label: "Instagram Engagement",
            value: instagramMetrics?.engagement ? instagramMetrics.engagement.toFixed(1) : "---",
            icon: Zap,
            color: "bg-pink-500/20 text-pink-400",
        },
        {
            id: "instagram_post_success",
            label: "Automation Status",
            value: instagramMetrics ? "Active" : "---",
            icon: CheckCircle2,
            color: "bg-emerald-500/20 text-emerald-400",
        },
        // --- THREADS STUBS ---
        {
            id: "threads_followers",
            label: "Threads Followers",
            value: "---",
            icon: AtSign,
            color: "bg-neutral-500/20 text-neutral-400",
        },
        {
            id: "threads_likes",
            label: "Threads Likes",
            value: "---",
            icon: ThumbsUp,
            color: "bg-neutral-600/20 text-neutral-300",
        },
        // --- X (TWITTER) STUBS ---
        {
            id: "twitter_followers",
            label: "X Followers",
            value: "---",
            icon: Twitter,
            color: "bg-sky-500/20 text-sky-400",
        },
        {
            id: "twitter_impressions",
            label: "X Impressions",
            value: "---",
            icon: BarChart3,
            color: "bg-sky-600/20 text-sky-500",
        },
        {
            id: "twitter_engagement",
            label: "X Engagement",
            value: "---",
            icon: Zap,
            color: "bg-sky-400/20 text-sky-300",
        },
        // --- PIXEL LIVE ---
        {
            id: "pixel_total_pings",
            label: "Website Hits",
            value: pixelMetrics?.totalHits?.toLocaleString() || "0",
            icon: Activity,
            color: "bg-blue-500/20 text-blue-400",
        },
        {
            id: "pixel_unique_visitors",
            label: "Unique Visitors",
            value: pixelMetrics?.uniqueVisitors?.toLocaleString() || "0",
            icon: Users,
            color: "bg-indigo-500/20 text-indigo-400",
        },
        {
            id: "pixel_identified_count",
            label: "Identified Leads",
            value: pixelMetrics?.identifiedCount?.toLocaleString() || "0",
            icon: UserSearch,
            color: "bg-emerald-500/20 text-emerald-400",
        }
    ]

    const slug = (params?.slug as string) ?? "innergcomplete"
    const portalName = projects.find(p => p.slug === slug)?.name

    return (
        <div className="flex-1 flex flex-col min-h-0 h-full overflow-hidden relative">
            {/* Background ambient gradients */}
            <div className="absolute top-0 right-[10%] w-[600px] h-[600px] bg-primary/20 rounded-full blur-[140px] opacity-20 animate-pulse pointer-events-none z-0" />
            <div className="absolute bottom-[20%] left-[-10%] w-[500px] h-[500px] bg-accent/20 rounded-full blur-[120px] opacity-10 pointer-events-none z-0" />

            <div className="hidden lg:block relative z-20">
                <AgencyHeader
                    userData={userData}
                    currentTime={currentTime}
                    mounted={mounted}
                    onMenuOpen={() => setIsSidebarOpen(true)}
                    portalName={portalName}
                />
            </div>

            <main className="flex-1 overflow-y-auto custom-scrollbar relative z-10 w-full">
                <div className="p-6 md:p-10 max-w-7xl mx-auto w-full pb-24">
                    {/* Header Section */}
                    <div className="mb-12">
                        <div className="flex flex-col md:flex-row md:items-end justify-between gap-6 pb-6 border-b border-border">
                            <div>
                                <h1 className="text-2xl sm:text-3xl md:text-4xl font-black text-foreground tracking-tight flex items-center gap-3">
                                    Metrics <span className="text-primary font-light italic">& Intelligence</span>
                                </h1>
                                <p className="text-muted-foreground text-sm md:text-base mt-3 max-w-2xl leading-relaxed">
                                    Manage your global telemetry slots and intelligence distribution. Select which "Key Performance Ports" appear on your primary command center.
                                </p>
                            </div>
                        </div>
                    </div>

                    {/* Agency Command Architecture (Read-Only) */}
                    <section>
                        <div className="flex items-center gap-3 mb-8">
                            <div className="h-8 w-8 rounded-lg bg-primary/10 flex items-center justify-center border border-primary/20">
                                <Layout className="h-4 w-4 text-primary" />
                            </div>
                            <h2 className="text-xs font-black uppercase tracking-[0.3em] text-foreground">Global Intelligence Infrastructure</h2>
                        </div>
                        
                        <MetricSlotGrid
                            slotIds={activeSlotIds}
                            metrics={mappedAgencyMetrics}
                            isAgency={true}
                            className="!mb-0"
                        />
                    </section>
                    
                    {/* Intelligence Feed Section */}
                    <section className="mb-16">
                        <div className="flex items-center gap-3 mb-8">
                            <div className="h-8 w-8 rounded-lg bg-violet-500/10 flex items-center justify-center border border-violet-500/20">
                                <Sparkles className="h-4 w-4 text-violet-400" />
                            </div>
                            <h2 className="text-xs font-black uppercase tracking-[0.3em] text-foreground">Agency Intelligence Feed</h2>
                        </div>
                        
                        <div className="h-[500px]">
                            <SignalSlotFeed
                                slotId="global_portfolio_monitoring"
                                signals={allSignals as any}
                                isAgencyMode={true}
                                onResolve={resolveSignal}
                                onDeleteAction={deleteDraft}
                            />
                        </div>
                    </section>
                    </div>
            </main>
        </div>
    )
}
