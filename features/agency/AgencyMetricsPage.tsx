"use client"

import { useState, useEffect } from "react"
import { useParams } from "next/navigation"
import { Loader2, Building2, AlertTriangle, Sparkles, Layout, Target, Activity, Zap, Check, EyeOff, ThumbsUp, MessageSquare, Share2, Eye, Linkedin, BarChart3, Youtube, Video, Play, Instagram } from "lucide-react"
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
        // --- TIKTOK STUBS ---
        {
            id: "tiktok_followers",
            label: "TikTok Followers",
            value: "---",
            icon: Music,
            color: "bg-pink-500/20 text-pink-400",
        },
        {
            id: "tiktok_views",
            label: "TikTok Views",
            value: "---",
            icon: Play,
            color: "bg-pink-600/20 text-pink-500",
        },
        {
            id: "tiktok_likes",
            label: "TikTok Likes",
            value: "---",
            icon: ThumbsUp,
            color: "bg-rose-600/20 text-rose-500",
        },
        // --- FACEBOOK STUBS ---
        {
            id: "facebook_page_likes",
            label: "Facebook Page Likes",
            value: "---",
            icon: Facebook,
            color: "bg-blue-700/20 text-blue-500",
        },
        {
            id: "facebook_reach",
            label: "Facebook Reach",
            value: "---",
            icon: BarChart3,
            color: "bg-blue-600/20 text-blue-400",
        },
        {
            id: "facebook_engagement",
            label: "Facebook Engagement",
            value: "---",
            icon: Zap,
            color: "bg-blue-500/20 text-blue-300",
        },
        // --- INSTAGRAM AGENCY STUBS ---
        {
            id: "instagram_followers",
            label: "Instagram Followers",
            value: "---",
            icon: Instagram,
            color: "bg-gradient-to-tr from-yellow-500/10 via-red-500/10 to-purple-500/10 text-pink-500",
        },
        {
            id: "instagram_reach",
            label: "Instagram Reach",
            value: "---",
            icon: BarChart3,
            color: "bg-purple-500/20 text-purple-400",
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

                    {/* Preview Section */}
                    <section className="mb-16">
                        <div className="flex items-center gap-3 mb-8">
                            <div className="h-8 w-8 rounded-lg bg-primary/10 flex items-center justify-center border border-primary/20">
                                <Layout className="h-4 w-4 text-primary" />
                            </div>
                            <h2 className="text-xs font-black uppercase tracking-[0.3em] text-foreground">Live Preview (Primary Grid)</h2>
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


                    {/* Slot Registry Management */}
                    <section>
                        <div className="flex items-center justify-between mb-8">
                            <div className="flex items-center gap-3">
                                <div className="h-8 w-8 rounded-lg bg-accent/10 flex items-center justify-center border border-accent/20">
                                    <Target className="h-4 w-4 text-accent" />
                                </div>
                                <h2 className="text-xs font-black uppercase tracking-[0.3em] text-foreground">Slot Registry & Port Configuration</h2>
                            </div>
                            <div className="px-4 py-1.5 rounded-full bg-muted/10 border border-border text-[10px] font-black uppercase tracking-widest text-muted-foreground">
                                {activeSlotIds.length} / {availableSlots.length} Active
                            </div>
                        </div>

                        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                            {availableSlots.map(slot => {
                                const isActive = activeSlotIds.includes(slot.id)
                                const Icon = getIcon(slot.iconName)

                                return (
                                    <div
                                        key={slot.id}
                                        onClick={() => toggleSlot(slot.id)}
                                        className={`group p-6 rounded-3xl border transition-all duration-500 cursor-pointer relative overflow-hidden h-full flex flex-col ${isActive
                                            ? 'bg-primary/5 border-primary/30 shadow-[0_0_40px_rgba(var(--primary),0.05)]'
                                            : 'bg-muted/5 border-border hover:border-primary/20'
                                            }`}
                                    >
                                        <div className="flex items-start gap-5 mb-6">
                                            <div className={`h-12 w-12 rounded-2xl flex items-center justify-center border transition-all duration-500 ${isActive ? 'bg-primary text-primary-foreground border-primary shadow-lg shadow-primary/20 scale-110' : 'bg-white/5 text-muted-foreground border-white/10'
                                                }`}>
                                                <Icon className="h-6 w-6" />
                                            </div>
                                            <div className="flex-1">
                                                <div className="flex items-center justify-between">
                                                    <span className={`text-base font-bold tracking-tight ${isActive ? 'text-foreground' : 'text-muted-foreground transition-colors group-hover:text-foreground'}`}>
                                                        {slot.label}
                                                    </span>
                                                    {isActive ? (
                                                        <div className="h-6 w-6 bg-primary/20 rounded-xl flex items-center justify-center border border-primary/40 animate-in zoom-in duration-300">
                                                            <Check className="h-3 w-3 text-primary" />
                                                        </div>
                                                    ) : (
                                                        <EyeOff className="h-4 w-4 text-muted-foreground/20 group-hover:text-muted-foreground transition-colors" />
                                                    )}
                                                </div>
                                                <p className="text-[10px] font-black uppercase tracking-widest text-primary/60 mt-1">{slot.category}</p>
                                            </div>
                                        </div>
                                        
                                        <p className="text-sm text-muted-foreground leading-relaxed flex-1">
                                            {slot.description}
                                        </p>

                                        <div className="mt-8 pt-6 border-t border-border/20 flex items-center justify-between">
                                            <div className="flex items-center gap-2">
                                                <div className={`h-1.5 w-1.5 rounded-full ${isActive ? 'bg-emerald-500 shadow-[0_0_8px_rgba(16,185,129,0.5)]' : 'bg-muted'}`} />
                                                <span className="text-[10px] font-black uppercase tracking-[0.15em] text-muted-foreground/40">{isActive ? 'Broadcasting' : 'Standby'}</span>
                                            </div>
                                            <span className="text-[10px] font-bold text-muted-foreground/20 italic">ID: {slot.id}</span>
                                        </div>
                                    </div>
                                )
                            })}
                        </div>
                    </section>

                    {/* Footer / Info */}
                    <div className="mt-20 p-8 rounded-3xl bg-muted/5 border border-border border-dashed flex flex-col md:flex-row items-center justify-between gap-8">
                        <div className="flex items-center gap-6">
                            <Activity className="h-10 w-10 text-primary/20" />
                            <div>
                                <p className="text-xs font-black uppercase tracking-widest text-primary">Intelligence Sync Protocol</p>
                                <p className="text-sm text-muted-foreground mt-1 max-w-md">Your configuration affects how the AI prioritizes signal generation and real-time alerts. Pinned ports receive high-frequency stream updates.</p>
                            </div>
                        </div>
                        <Button 
                            onClick={saveChanges}
                            disabled={isSaving}
                            className="h-12 px-10 rounded-2xl font-black uppercase tracking-widest text-[11px] shadow-2xl shadow-primary/20 border-b-2 border-black/20 min-w-[240px]"
                        >
                            {isSaving ? (
                                <>
                                    <Loader2 className="h-3 w-3 animate-spin mr-2" />
                                    Synchronizing...
                                </>
                            ) : (
                                "Apply Changes Systemwide"
                            )}
                        </Button>
                    </div>
                    </div>
            </main>
        </div>
    )
}
