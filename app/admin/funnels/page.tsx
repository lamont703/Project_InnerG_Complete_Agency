"use client"

import { useState, useEffect } from "react"
import { Loader2, Layout, Target, Zap, Filter, Compass, TrendingUp, Sparkles, Plus, Youtube, Music, Linkedin, Instagram, Facebook, Twitter, AtSign, Globe } from "lucide-react"
import { AgencyHeader } from "@/features/agency/components/AgencyHeader"
import { useAdminSidebar } from "@/features/agency/context/AdminSidebarContext"
import { useAgencyData } from "@/features/agency/use-agency-data"
import { SankeyFunnel } from "@/features/agency/components/SankeyFunnel"
import { Button } from "@/components/ui/button"

export default function FunnelVisualizationPage() {
    const { 
        userData, 
        isLoading, 
        projects,
        youtubeMetrics,
        tiktokMetrics,
        linkedinMetrics,
        instagramMetrics,
        facebookMetrics,
        pixelMetrics
    } = useAgencyData()
    const { isSidebarOpen, setIsSidebarOpen } = useAdminSidebar()
    const [currentTime, setCurrentTime] = useState(new Date())
    const [mounted, setMounted] = useState(false)

    // Calculate Dynamic Funnel Data (8 Sources: 2 Columns of 4)
    const funnelData = {
        sources: [
            { 
                id: 'yt', 
                icon: Youtube, 
                label: "YouTube", 
                value: (youtubeMetrics?.views || 0) > 1000 ? (youtubeMetrics.views / 1000).toFixed(1) + "k" : (youtubeMetrics?.views || 0).toString(),
                rawValue: youtubeMetrics?.views || 0,
                subValue: "Channel Views", 
                color: "bg-red-500", 
                glowColor: "rgba(239,68,68,0.5)", 
                hex: "#EF4444" 
            },
            { 
                id: 'tt', 
                icon: Music, 
                label: "TikTok", 
                value: (tiktokMetrics?.totalViews || 0) > 1000 ? (tiktokMetrics.totalViews / 1000).toFixed(1) + "k" : (tiktokMetrics?.totalViews || 0).toString(),
                rawValue: tiktokMetrics?.totalViews || 0,
                subValue: "Video Reach", 
                color: "bg-pink-500", 
                glowColor: "rgba(236,72,153,0.5)", 
                hex: "#EC4899" 
            },
            { 
                id: 'li', 
                icon: Linkedin, 
                label: "LinkedIn", 
                value: (linkedinMetrics?.views || 0) > 1000 ? (linkedinMetrics.views / 1000).toFixed(1) + "k" : (linkedinMetrics?.views || 0).toString(),
                rawValue: linkedinMetrics?.views || 0,
                subValue: "Post Reach", 
                color: "bg-blue-500", 
                glowColor: "rgba(59,130,246,0.5)", 
                hex: "#3B82F6" 
            },
            { 
                id: 'ig', 
                icon: Instagram, 
                label: "Instagram", 
                value: (instagramMetrics?.reach || 0) > 1000 ? (instagramMetrics.reach / 1000).toFixed(1) + "k" : (instagramMetrics?.reach || 0).toString(),
                rawValue: instagramMetrics?.reach || 0,
                subValue: "Direct Reach", 
                color: "bg-purple-500", 
                glowColor: "rgba(168,85,247,0.5)", 
                hex: "#A855F7" 
            },
            { 
                id: 'fb', 
                icon: Facebook, 
                label: "Facebook", 
                value: (facebookMetrics?.reach || 0) > 1000 ? (facebookMetrics.reach / 1000).toFixed(1) + "k" : (facebookMetrics?.reach || 0).toString(),
                rawValue: facebookMetrics?.reach || 0,
                subValue: "Organic Flow", 
                color: "bg-blue-600", 
                glowColor: "rgba(37,99,235,0.5)", 
                hex: "#2563EB" 
            },
            { 
                id: 'tw', 
                icon: Twitter, 
                label: "X / Twitter", 
                value: "0", 
                rawValue: 0, 
                subValue: "Pulse Traffic", 
                color: "bg-zinc-800", 
                glowColor: "rgba(161,161,170,0.5)", 
                hex: "#A1A1AA" 
            },
            { 
                id: 'th', 
                icon: AtSign, 
                label: "Threads", 
                value: "0", 
                rawValue: 0, 
                subValue: "Social Threads", 
                color: "bg-zinc-100", 
                glowColor: "rgba(255,255,255,0.3)", 
                hex: "#FFFFFF" 
            },
        ],
        engagement: {
            label: "Engagement Pool",
            value: (
                (youtubeMetrics?.likes || 0) + 
                (linkedinMetrics?.likes || 0) + 
                (instagramMetrics?.likes || 0) + 
                (tiktokMetrics?.videoLikes || 0) +
                (youtubeMetrics?.comments || 0) + 
                (linkedinMetrics?.comments || 0) + 
                (instagramMetrics?.comments || 0) + 
                (tiktokMetrics?.videoComments || 0) +
                (linkedinMetrics?.shares || 0) +
                (tiktokMetrics?.videoShares || 0) +
                (pixelMetrics?.uniqueVisitors || 0)
            ).toLocaleString(),
            rawValue: (
                (youtubeMetrics?.likes || 0) + 
                (linkedinMetrics?.likes || 0) + 
                (instagramMetrics?.likes || 0) + 
                (tiktokMetrics?.videoLikes || 0) +
                (youtubeMetrics?.comments || 0) + 
                (linkedinMetrics?.comments || 0) + 
                (instagramMetrics?.comments || 0) + 
                (tiktokMetrics?.videoComments || 0) +
                (linkedinMetrics?.shares || 0) +
                (tiktokMetrics?.videoShares || 0) +
                (pixelMetrics?.uniqueVisitors || 0)
            ),
            subValue: "Intention Signal Filter",
            metrics: [
                { 
                    label: "Total Hearts/Likes", 
                    value: ((youtubeMetrics?.likes || 0) + (linkedinMetrics?.likes || 0) + (instagramMetrics?.likes || 0) + (tiktokMetrics?.videoLikes || 0) + (facebookMetrics?.likes || 0)).toLocaleString() 
                },
                { 
                    label: "Conversation (Comments)", 
                    value: ((youtubeMetrics?.comments || 0) + (linkedinMetrics?.comments || 0) + (instagramMetrics?.comments || 0) + (tiktokMetrics?.videoComments || 0) + (facebookMetrics?.comments || 0)).toLocaleString() 
                },
                { 
                    label: "Share Velocity", 
                    value: ((linkedinMetrics?.shares || 0) + (tiktokMetrics?.videoShares || 0)).toLocaleString() 
                },
                { 
                    label: "Pixel Unique Visitors", 
                    value: (pixelMetrics?.uniqueVisitors || 0).toLocaleString() 
                }
            ]
        },
        conversion: {
            label: "Conversion Hub",
            value: (
                (pixelMetrics?.clicks["Go To Step #2"] || 0) + 
                (pixelMetrics?.clicks["Request Growth Audit"] || 0) +
                (pixelMetrics?.clicks["Schedule a Growth Audit"] || 0) +
                (pixelMetrics?.clicks["button-CLEbFRjXN7_btn"] || 0)
            ).toString(),
            rawValue: (
                (pixelMetrics?.clicks["Go To Step #2"] || 0) + 
                (pixelMetrics?.clicks["Request Growth Audit"] || 0) +
                (pixelMetrics?.clicks["Schedule a Growth Audit"] || 0) +
                (pixelMetrics?.clicks["button-CLEbFRjXN7_btn"] || 0)
            ),
            subValue: "Revenue Qualified Output",
            metrics: [
                { label: "Step #2 Clicks", value: (pixelMetrics?.clicks["Go To Step #2"] || 0).toString() },
                { label: "Request Audit", value: (pixelMetrics?.clicks["Request Growth Audit"] || 0).toString() },
                { label: "Schedule Audit", value: (pixelMetrics?.clicks["Schedule a Growth Audit"] || 0).toString() },
                { label: "School Logins", value: (pixelMetrics?.clicks["button-CLEbFRjXN7_btn"] || 0).toString() }
            ]
        }
    }

    useEffect(() => {
        setMounted(true)
        const timer = setInterval(() => setCurrentTime(new Date()), 1000)
        return () => clearInterval(timer)
    }, [])

    if (isLoading) {
        return (
            <div className="min-h-screen bg-background flex items-center justify-center">
                <Loader2 className="h-8 w-8 animate-spin text-primary" />
            </div>
        )
    }

    return (
        <div className="flex-1 flex flex-col min-h-0 relative h-full">
            {/* Background ambient gradients */}
            <div className="absolute top-0 right-[10%] w-[600px] h-[600px] bg-primary/20 rounded-full blur-[140px] opacity-20 animate-pulse pointer-events-none z-0" />
            <div className="absolute bottom-[20%] left-[-10%] w-[500px] h-[500px] bg-accent/20 rounded-full blur-[120px] opacity-10 pointer-events-none z-0" />

            <AgencyHeader 
                userData={userData} 
                currentTime={currentTime} 
                mounted={mounted} 
                onMenuOpen={() => setIsSidebarOpen(true)}
                portalName="Global Conversion Intelligence"
            />

            <main className="flex-1 overflow-y-auto custom-scrollbar relative z-10 w-full px-6 py-10">
                <div className="max-w-7xl mx-auto space-y-12">
                    {/* Hero Section */}
                    <div className="flex flex-col md:flex-row md:items-end justify-between gap-6 pb-8 border-b border-white/5">
                        <div className="space-y-4">
                            <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-primary/10 border border-primary/20">
                                <Sparkles className="h-3.5 w-3.5 text-primary" />
                                <span className="text-[10px] font-black uppercase tracking-[0.25em] text-primary italic">Intelligence Activated</span>
                            </div>
                            <h1 className="text-4xl md:text-5xl font-black text-foreground tracking-tight">
                                Funnels <span className="text-primary font-light italic">& Intelligence</span>
                            </h1>
                            <p className="text-muted-foreground text-sm md:text-base max-w-2xl leading-relaxed">
                                Visualize the transformation of noise into signals. Track how social awareness pulses through your engagement pools and crystallizes into business opportunities.
                            </p>
                        </div>
                        <div className="flex items-center gap-3">
                            <Button variant="outline" className="glass-panel border-white/10 hover:bg-white/5 transition-all h-11 px-6 font-bold uppercase text-[10px] tracking-widest gap-2">
                                <Plus className="h-4 w-4" />
                                Define New Funnel
                            </Button>
                        </div>
                    </div>

                    {/* Funnel Matrix Tabs */}
                    <div className="flex flex-wrap items-center gap-3">
                        <Button variant="default" className="bg-primary text-primary-foreground h-12 px-8 font-black uppercase text-[11px] tracking-widest rounded-2xl shadow-[0_0_20px_rgba(59,130,246,0.2)]">
                            Omni-Channel Stream
                        </Button>
                        <Button variant="ghost" className="h-12 px-8 font-bold uppercase text-[11px] tracking-widest text-muted-foreground hover:text-foreground hover:bg-white/5 rounded-2xl">
                            Freelancer Freedom Pipeline
                        </Button>
                        <Button variant="ghost" className="h-12 px-8 font-bold uppercase text-[11px] tracking-widest text-muted-foreground hover:text-foreground hover:bg-white/5 rounded-2xl">
                            Software Dev Funnel
                        </Button>
                    </div>

                    {/* The Sankey Component */}
                    <section className="relative p-10 rounded-[3rem] border border-white/10 bg-black/40 backdrop-blur-3xl overflow-hidden shadow-2xl">
                         <div className="absolute top-6 left-10 flex items-center gap-3 z-20">
                            <div className="h-2 w-2 rounded-full bg-emerald-400 animate-pulse shadow-[0_0_8px_rgba(52,211,153,0.5)]" />
                            <span className="text-[10px] font-black uppercase tracking-[0.3em] text-muted-foreground">Live Telemetry Rendering Engine</span>
                         </div>

                         <div className="absolute top-6 right-10 flex items-center gap-6 z-20">
                            <div className="flex flex-col items-end">
                                <span className="text-[9px] font-bold text-muted-foreground uppercase tracking-widest">Global Reach</span>
                                <span className="text-sm font-black text-white tracking-tight">
                                    {((youtubeMetrics?.views || 0) + (tiktokMetrics?.totalViews || 0) + (linkedinMetrics?.views || 0) + (instagramMetrics?.reach || 0)).toLocaleString()}
                                </span>
                            </div>
                            <div className="flex flex-col items-end">
                                <span className="text-[9px] font-bold text-white/50 uppercase tracking-widest">Efficiency index</span>
                                <span className="text-sm font-black text-emerald-400 tracking-tight">8.5 / 10</span>
                            </div>
                         </div>

                         <div className="relative min-h-[600px] flex items-center justify-center">
                            <SankeyFunnel data={funnelData} />
                         </div>
                    </section>

                    {/* Analysis Grid */}
                    <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                        {[
                            { title: "Awareness Velocity", value: "+15.2%", status: "UP", icon: TrendingUp, color: "text-emerald-400", bg: "bg-emerald-500/10" },
                            { title: "Lead Saturation", value: "82.4%", status: "OPTIMAL", icon: Target, color: "text-blue-400", bg: "bg-blue-500/10" },
                            { title: "Drop-off Pressure", value: "2.1%", status: "LOW", icon: Filter, color: "text-amber-400", bg: "bg-amber-500/10" }
                        ].map((stat) => (
                            <div key={stat.title} className="p-6 rounded-3xl border border-white/5 bg-white/5 backdrop-blur-sm group hover:border-white/20 transition-all duration-300">
                                <div className="flex items-center justify-between mb-4">
                                    <div className={`p-2 rounded-xl ${stat.bg} ${stat.color}`}>
                                        <stat.icon className="h-4 w-4" />
                                    </div>
                                    <span className={`text-[9px] font-black px-2 py-0.5 rounded-full ${stat.bg} ${stat.color}`}>{stat.status}</span>
                                </div>
                                <p className="text-[10px] font-black uppercase tracking-[0.25em] text-white/60 mb-1 group-hover:text-white transition-colors">{stat.title}</p>
                                <p className="text-2xl font-black text-white">{stat.value}</p>
                            </div>
                        ))}
                    </div>
                </div>
            </main>
        </div>
    )
}
