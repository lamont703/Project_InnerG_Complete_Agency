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
import { SocialOrchestrator } from "./components/SocialOrchestrator"

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
        <div className="h-screen bg-[#020617] flex flex-col overflow-hidden selection:bg-primary/30">
            {/* Slim Header - NotebookLM Style */}
            <AgencyHeader
                userData={userData}
                currentTime={currentTime}
                mounted={mounted}
                isSyncing={isSyncing}
                onSyncGHL={syncGHL}
                onSyncGithub={syncGithub}
                onMenuOpen={() => setIsSidebarOpen(true)}
            />

            <div className="flex-1 flex overflow-hidden w-full relative">
                {/* Background ambient gradients */}
                <div className="absolute top-0 right-[10%] w-[600px] h-[600px] bg-primary/10 rounded-full blur-[140px] opacity-10 animate-pulse pointer-events-none" />
                <div className="absolute bottom-[20%] left-[-10%] w-[500px] h-[500px] bg-accent/10 rounded-full blur-[120px] opacity-5 pointer-events-none" />

                {/* Left Column: Navigation (Sources) - 20% Width */}
                <div className="w-72 hidden lg:flex flex-col border-r border-white/5 bg-black/20 backdrop-blur-sm z-20">
                    <AgencySidebar
                        isSidebarOpen={isSidebarOpen}
                        onClose={() => setIsSidebarOpen(false)}
                    />
                </div>

                {/* Middle Column: Intelligence Hub (Chat) - 55% Width */}
                <div className="flex-1 flex flex-col min-w-0 bg-white/[0.01] border-r border-white/5 z-10 relative">
                    <div className="flex-1 min-h-0 flex flex-col p-4 md:p-6">
                        <AgencyChatInterface />
                    </div>
                </div>

                {/* Right Column: Studio (Signals & Social) - 25% Width */}
                <div className="w-[420px] hidden xl:flex flex-col gap-6 p-6 overflow-y-auto custom-scrollbar bg-black/40 z-10">
                    {/* Integrated Metrics - Compact vertically */}
                    <div className="mb-2">
                        <MetricSlotGrid
                            slotIds={activeSlotIds}
                            metrics={mappedAgencyMetrics}
                            isAgency={true}
                        />
                    </div>

                    <div className="flex flex-col gap-6">
                        <div className="min-h-[400px] flex-1">
                            <SignalSlotFeed
                                slotId="global_portfolio_monitoring"
                                signals={allAgencySignalsMapped}
                                isAgencyMode={true}
                                onResolve={resolveSignal}
                                isResolving={!!resolvingId}
                                highlightId={newSignalId}
                            />
                        </div>
                        <div className="min-h-[400px] flex-1">
                            <SocialOrchestrator 
                                drafts={socialDrafts}
                                onPublish={publishPost}
                                highlightId={newDraftId}
                            />
                        </div>
                    </div>
                </div>
            </div>

            {/* Mobile Drawer Wrapper */}
            <AgencySidebar
                isSidebarOpen={isSidebarOpen}
                onClose={() => setIsSidebarOpen(false)}
            />

            <DashboardCustomizer />
        </div>
    )
}
