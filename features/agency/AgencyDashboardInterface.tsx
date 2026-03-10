"use client"

import { useState, useEffect } from "react"
import { Loader2, Building2, AlertTriangle, Sparkles, Activity } from "lucide-react"

// Modular Components
import { AgencySidebar } from "./components/AgencySidebar"
import { AgencyHeader } from "./components/AgencyHeader"
import { PortfolioGrid } from "./components/PortfolioGrid"
import { AgencyChatInterface } from "./components/AgencyChat"
import { StrategyInsights } from "./components/StrategyInsights"
import { ActiveProjectsList } from "./components/ActiveProjectsList"
import { AgencyActivityFeed } from "./components/AgencyActivityFeed"
import { OperationalSignals } from "./components/OperationalSignals"

// Hooks
import { useAgencyData } from "./use-agency-data"

// Types
import { PortfolioMetric } from "./types"

/**
 * AgencyDashboardInterface - The Orchestrator.
 * Connects the UI to the logical state.
 */
export function AgencyDashboardInterface() {
    const {
        userData,
        projects,
        strategicSignals,
        operationalSignals,
        recentActivity,
        isLoading,
        isSyncing,
        newSignalId,
        syncGHL
    } = useAgencyData()

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

    const portfolioMetrics: PortfolioMetric[] = [
        {
            label: "Active Client Projects",
            value: projects.length,
            icon: Building2,
            color: "bg-blue-500/20 text-blue-400",
        },
        {
            label: "Unresolved Signals",
            value: operationalSignals.filter(s => !s.is_resolved).length,
            change: operationalSignals.filter(s => !s.is_resolved).length > 0 ? "Active monitoring" : "All clear",
            trend: operationalSignals.filter(s => !s.is_resolved).length > 0 ? "neutral" : "up",
            icon: AlertTriangle,
            color: operationalSignals.filter(s => !s.is_resolved).length > 0 ? "bg-amber-500/20 text-amber-400" : "bg-emerald-500/20 text-emerald-400",
        },
        {
            label: "Agency Intelligence",
            value: strategicSignals.length,
            icon: Sparkles,
            color: "bg-violet-500/20 text-violet-400",
        },
        {
            label: "Recent Activities",
            value: recentActivity.length,
            icon: Activity,
            color: "bg-cyan-500/20 text-cyan-400",
        },
    ]

    return (
        <div className="min-h-screen bg-background flex flex-col lg:flex-row">
            <AgencySidebar
                isSidebarOpen={isSidebarOpen}
                onClose={() => setIsSidebarOpen(false)}
            />

            <main className="flex-1 flex flex-col min-h-screen bg-[#020617] relative w-full">
                {/* Background ambient gradients */}
                <div className="absolute top-0 right-0 w-[500px] h-[500px] bg-primary/20 rounded-full blur-[120px] opacity-20 pointer-events-none" />
                <div className="absolute bottom-0 left-0 w-[400px] h-[400px] bg-accent/20 rounded-full blur-[100px] opacity-10 pointer-events-none" />

                <AgencyHeader
                    userData={userData}
                    currentTime={currentTime}
                    mounted={mounted}
                    isSyncing={isSyncing}
                    onSyncGHL={syncGHL}
                    onMenuOpen={() => setIsSidebarOpen(true)}
                />

                {/* Content */}
                <div className="flex-1 p-4 md:p-8 relative z-10 max-w-7xl mx-auto w-full overflow-x-hidden">
                    {/* Welcome Section */}
                    <div className="mb-8 md:mb-10">
                        <h1 className="text-2xl md:text-3xl font-bold text-foreground">
                            Welcome Back, {userData?.name?.split(" ")[0] || "Admin"}
                        </h1>
                        <p className="text-muted-foreground text-sm md:text-base mt-2 max-w-2xl leading-relaxed text-balance">
                            Your <span className="text-foreground font-medium">Inner G Complete</span> agency portfolio overview.
                            Monitoring <span className="text-foreground font-medium">{projects.length} active project{projects.length !== 1 ? "s" : ""}</span> as of{" "}
                            <span className="text-foreground font-medium">{mounted && currentTime.toLocaleTimeString()}</span>.
                        </p>
                    </div>

                    <PortfolioGrid metrics={portfolioMetrics} />

                    {/* Main Grid: Chat + Signals */}
                    <div className="grid grid-cols-1 lg:grid-cols-2 gap-8 mb-12">
                        <div className="rounded-2xl border border-white/5 overflow-hidden flex flex-col min-h-0">
                            <AgencyChatInterface />
                        </div>

                        <div className="space-y-6">
                            <StrategyInsights
                                signals={strategicSignals}
                                newSignalId={newSignalId}
                            />

                            <ActiveProjectsList projects={projects} />

                            <OperationalSignals
                                signals={operationalSignals}
                                newSignalId={newSignalId}
                            />
                        </div>
                    </div>

                    <AgencyActivityFeed activities={recentActivity} />
                </div>
            </main>
        </div>
    )
}
