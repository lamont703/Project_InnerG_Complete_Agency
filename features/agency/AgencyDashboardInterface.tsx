"use client"

import { useState, useEffect } from "react"
import { Loader2, Building2, AlertTriangle, Sparkles } from "lucide-react"

// Modular Components
import { AgencySidebar } from "./components/AgencySidebar"
import { AgencyHeader } from "./components/AgencyHeader"
import { AgencyChatInterface } from "./components/AgencyChat"
import { UnifiedStream } from "./components/UnifiedStream"

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
        <AgencyDashboardContent />
    )
}

function AgencyDashboardContent() {
    const {
        userData,
        projects,
        strategicSignals,
        operationalSignals,
        socialDrafts,
        isLoading,
        isSyncing,
        resolvingId,
        newSignalId,
        newDraftId,
        syncGHL,
        syncGithub,
        resolveSignal,
        publishPost
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
                    onSyncGithub={syncGithub}
                    onMenuOpen={() => setIsSidebarOpen(true)}
                />

                {/* Main Content Area */}
                <div className="flex-1 flex flex-col lg:flex-row p-4 md:p-6 lg:p-8 gap-6 lg:gap-8 relative z-10 w-full overflow-hidden">
                    
                    {/* 1. Intelligence Hub (Chat) - Occupies the primary center */}
                    <div className="flex-1 min-w-0 h-full flex flex-col">
                        {/* Compact Status Header */}
                        <div className="mb-6 flex items-center justify-between">
                            <div>
                                <h1 className="text-xl font-black text-white tracking-tight flex items-center gap-3">
                                    Aura Dashboard
                                    <span className="text-primary font-light italic">God Mode</span>
                                </h1>
                                <p className="text-[10px] text-muted-foreground font-bold uppercase tracking-[0.2em] mt-1">
                                    {projects.length} Active Architectures <span className="mx-2 opacity-20">|</span> 98.4% Efficiency
                                </p>
                            </div>
                        </div>

                        <div className="flex-1 min-h-[500px]">
                            <AgencyChatInterface />
                        </div>
                    </div>

                    {/* 2. Unified Signal Feed & Social Orchestration - Sidecar positioned to the far right */}
                    <div className="w-full lg:w-[450px] shrink-0 h-full flex flex-col">
                        <UnifiedStream 
                            signals={allAgencySignalsMapped}
                            drafts={socialDrafts}
                            onResolveSignal={resolveSignal}
                            onPublishDraft={publishPost}
                            isResolving={!!resolvingId}
                            highlightId={newSignalId || newDraftId}
                        />
                    </div>
                </div>
            </main>
        </div>
    )
}
