"use client"

import { useState, useEffect } from "react"
import { Loader2, TrendingUp, Target, Filter, Sparkles, Plus } from "lucide-react"
import { AgencyHeader } from "@/features/agency/components/AgencyHeader"
import { useAdminSidebar } from "@/features/agency/context/AdminSidebarContext"
import { useAgencyData } from "@/features/agency/use-agency-data"
import { Button } from "@/components/ui/button"
import { OmniChannelStream } from "@/features/funnels/components/OmniChannelStream"

export default function FunnelVisualizationPage() {
    const { 
        userData, 
        isLoading, 
    } = useAgencyData()
    const { isSidebarOpen, setIsSidebarOpen } = useAdminSidebar()
    const [currentTime, setCurrentTime] = useState(new Date())
    const [mounted, setMounted] = useState(false)

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
                    <OmniChannelStream 
                        projectSlug="innergcomplete" 
                        title="Global Conversion Intelligence" 
                    />

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
