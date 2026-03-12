"use client"

import { useState, useEffect } from "react"
import { Loader2, Building2, AlertTriangle, Sparkles } from "lucide-react"

// Modular Components
import { AgencySidebar } from "./components/AgencySidebar"
import { AgencyHeader } from "./components/AgencyHeader"
import { AgencyChatInterface } from "./components/AgencyChat"
import { SignalSlotFeed } from "@/features/signals/components/SignalSlotFeed"
import { MetricSlotGrid } from "@/features/metrics/components/MetricSlotGrid"
import { DashboardCustomizer } from "@/features/metrics/components/DashboardCustomizer"
import { SlotProvider, useSlotContext } from "@/features/metrics/SlotContext"

// Hooks
import { useAgencyData } from "./use-agency-data"

// Types
import { PortfolioMetric } from "./types"

/**
 * AgencyDashboardInterface - The Orchestrator.
 * Connects the UI to the logical state.
 */
export function AgencyDashboardInterface() {
    return (
        <SlotProvider userRole="super-admin">
            <AgencyDashboardContent />
        </SlotProvider>
    )
}

function AgencyDashboardContent() {
    const {
        userData,
        projects,
        strategicSignals,
        operationalSignals,
        isLoading,
        isSyncing,
        resolvingId,
        newSignalId,
        syncGHL,
        resolveSignal
    } = useAgencyData()

    const { activeSlotIds } = useSlotContext()

    const [isSidebarOpen, setIsSidebarOpen] = useState(false)
    const [currentTime, setCurrentTime] = useState(new Date())
    const [mounted, setMounted] = useState(false)

    useEffect(() => {
        setMounted(true)
        const timer = setInterval(() => setCurrentTime(new Date()), 1000)
        return () => clearInterval(timer)
    }, [])

    if (isLoading) {
        return (
            <div className="min-h-screen bg-[#020617] flex items-center justify-center">
                <div className="flex flex-col items-center gap-4">
                    <Loader2 className="h-8 w-8 animate-spin text-primary" />
                    <p className="text-sm text-muted-foreground">Loading Agency Command Center...</p>
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
    ]

    const agencySlots = ["active_architectures", "system_health", "agency_intelligence"] // Deprecated hardcoded slots

    // Map agency signals to standard Signal type for unified Card usage
    const allAgencySignalsMapped: any[] = [
        ...strategicSignals.map(s => ({
            id: s.id,
            signalType: 'strategic',
            title: s.title,
            body: s.body,
            actionLabel: "STRATEGY ACK",
            severity: s.severity,
            color: s.severity === 'critical' ? 'bg-red-500' : s.severity === 'warning' ? 'bg-amber-500' : 'bg-primary',
            buttonColor: 'bg-primary',
            isAgencyOnly: true,
            projectName: s.projects?.name,
            createdAt: s.created_at
        })),
        ...operationalSignals.map(s => ({
            id: s.id,
            signalType: s.signal_type,
            title: s.title,
            body: s.body,
            actionLabel: "RESOLVE",
            severity: s.severity,
            color: s.severity === 'critical' ? 'bg-red-500' : s.severity === 'warning' ? 'bg-amber-500' : 'bg-primary',
            buttonColor: 'bg-primary',
            isAgencyOnly: false,
            projectName: s.projects?.name,
            createdAt: s.created_at
        }))
    ].sort((a, b) => new Date(b.createdAt!).getTime() - new Date(a.createdAt!).getTime())

    return (
        <div className="min-h-screen bg-background flex flex-col lg:flex-row overflow-x-hidden w-full">
            <AgencySidebar
                isSidebarOpen={isSidebarOpen}
                onClose={() => setIsSidebarOpen(false)}
            />

            <main className="flex-1 flex flex-col min-h-screen bg-[#020617] relative w-full selection:bg-primary/30 overflow-x-hidden">
                {/* Background ambient gradients - Strategic placement for depth */}
                <div className="absolute top-0 right-[10%] w-[600px] h-[600px] bg-primary/20 rounded-full blur-[140px] opacity-20 animate-pulse pointer-events-none" />
                <div className="absolute bottom-[20%] left-[-10%] w-[500px] h-[500px] bg-accent/20 rounded-full blur-[120px] opacity-10 pointer-events-none" />
                <div className="absolute top-[40%] left-[30%] w-[400px] h-[400px] bg-violet-500/10 rounded-full blur-[100px] opacity-10 pointer-events-none" />

                <AgencyHeader
                    userData={userData}
                    currentTime={currentTime}
                    mounted={mounted}
                    isSyncing={isSyncing}
                    onSyncGHL={syncGHL}
                    onMenuOpen={() => setIsSidebarOpen(true)}
                />

                {/* Content */}
                <div className="flex-1 p-6 md:p-10 relative z-10 max-w-7xl mx-auto w-full overflow-x-hidden">
                    {/* Welcome Section - Interconnected & Dynamic */}
                    <div className="mb-12">
                        <div className="flex flex-col md:flex-row md:items-end justify-between gap-6 pb-6 border-b border-white/[0.05]">
                            <div>
                                <h1 className="text-2xl sm:text-3xl md:text-4xl font-black text-white tracking-tight flex items-center gap-3">
                                    Aura Dashboard
                                    <span className="text-primary font-light italic">God Mode</span>
                                </h1>
                                <p className="text-muted-foreground text-sm md:text-base mt-3 max-w-2xl leading-relaxed">
                                    Synchronizing <span className="text-foreground font-bold">{projects.length} client architectures</span> across the global stream.
                                    Your agency is currently performing at <span className="text-emerald-400 font-black">98.4% efficiency</span>.
                                </p>
                            </div>
                            <div className="flex items-center gap-4 text-right">
                                <div className="hidden md:block">
                                    <p className="text-[10px] font-black uppercase tracking-[0.2em] text-muted-foreground/50 mb-1">Portfolio Pulse</p>
                                    <p className="text-xs font-bold text-foreground">{mounted && currentTime.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', second: '2-digit' })}</p>
                                </div>
                            </div>
                        </div>
                    </div>

                    <MetricSlotGrid
                        slotIds={activeSlotIds}
                        metrics={mappedAgencyMetrics}
                        isAgency={true}
                    />

                    {/* Main Grid: "The Big Three" Alignment */}
                    <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 md:gap-10 mb-16 items-start h-[calc(100vh-450px)] min-h-[700px]">
                        {/* 1. Intelligence Hub (Chat) - 60% Width approx */}
                        <div className="lg:col-span-7 h-full">
                            <AgencyChatInterface />
                        </div>

                        {/* 2. Unified Signal Feed - 40% Width approx */}
                        <div className="lg:col-span-5 h-full min-h-0">
                            <SignalSlotFeed
                                slotId="global_portfolio_monitoring"
                                signals={allAgencySignalsMapped}
                                isAgencyMode={true}
                                onResolve={resolveSignal}
                                isResolving={!!resolvingId}
                            />
                        </div>
                    </div>
                </div>
                <DashboardCustomizer />
            </main>
        </div>
    )
}
