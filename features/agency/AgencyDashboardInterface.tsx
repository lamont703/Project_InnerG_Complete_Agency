"use client"

import { useState, useEffect } from "react"
import { useParams } from "next/navigation"
import { Loader2, Building2, AlertTriangle, Sparkles } from "lucide-react"

// Modular Components
import { AgencySidebar } from "./components/AgencySidebar"
import { AgencyHeader } from "./components/AgencyHeader"
import { AgencyChatInterface } from "./components/AgencyChat"
import { UnifiedStream } from "./components/UnifiedStream"
import { MetricSlotGrid } from "@/features/metrics/components/MetricSlotGrid"
import { DashboardMobileNav, type MobileTab } from "@/components/dashboard/MobileNav"

// Hooks
import { useAgencyData } from "./use-agency-data"

// Types
import { PortfolioMetric } from "./types"

import { MobileNavProvider, useMobileNav } from "./context/MobileNavContext"

/**
 * AgencyDashboardInterface - The Orchestrator.
 * Connects the UI to the logical state.
 */
export function AgencyDashboardInterface() {
    return (
        <MobileNavProvider>
            <AgencyDashboardContent />
        </MobileNavProvider>
    )
}

function AgencyDashboardContent() {
    const params = useParams()
    const slug = (params?.slug as string) ?? "innergcomplete"

    const {
        userData,
        projects,
        strategicSignals,
        operationalSignals,
        socialDrafts,
        isLoading,
        resolvingId,
        newSignalId,
        newDraftId,
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

    const { activeTab, setActiveTab } = useMobileNav()

    if (isLoading) {
        return (
            <div className="min-h-screen bg-background flex items-center justify-center">
                <div className="flex flex-col items-center gap-4">
                    <Loader2 className="h-8 w-8 animate-spin text-primary" />
                    <p className="text-sm text-muted-foreground">Initializing Command Intelligence...</p>
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

    const portalName = projects.find(p => p.slug === slug)?.name

    return (
        <>
            {/* Background ambient gradients - Strategic placement for depth */}
            <div className="absolute top-0 right-[10%] w-[600px] h-[600px] bg-primary/20 rounded-full blur-[140px] opacity-20 animate-pulse pointer-events-none" />
            <div className="absolute bottom-[20%] left-[-10%] w-[500px] h-[500px] bg-accent/20 rounded-full blur-[120px] opacity-10 pointer-events-none" />
            <div className="absolute top-[40%] left-[30%] w-[400px] h-[400px] bg-violet-500/10 rounded-full blur-[100px] opacity-10 pointer-events-none" />

            <div className="hidden lg:block">
                <AgencyHeader
                    userData={userData}
                    currentTime={currentTime}
                    mounted={mounted}
                    onMenuOpen={() => setIsSidebarOpen(true)}
                    portalName={portalName}
                />
            </div>

            {/* Main Content Area - Tabbed for Mobile, Side-by-Side for Desktop */}
            <div className="flex-1 flex flex-col lg:flex-row relative z-10 w-full overflow-hidden h-full">
                
                {/* 1. Intelligence Hub (Chat) - Primary Center */}
                <div className={`flex-1 min-w-0 flex flex-col overflow-hidden ${activeTab === 'chat' ? 'flex' : 'hidden lg:flex'}`}>
                    <AgencyChatInterface />
                </div>

                {/* 2. Unified Signal Feed & Social Orchestration - Flush to the right edge */}
                <div className={`w-full lg:w-[450px] shrink-0 flex flex-col bg-card/50 backdrop-blur-xl border-l border-border overflow-y-auto custom-scrollbar ${activeTab === 'signals' ? 'flex' : 'hidden lg:flex'}`}>
                    <UnifiedStream 
                        signals={allAgencySignalsMapped}
                        drafts={socialDrafts}
                        onResolveSignal={resolveSignal}
                        onPublishDraft={publishPost}
                        isResolving={!!resolvingId}
                        highlightId={newSignalId || newDraftId}
                        isFlush={true}
                    />
                </div>
            </div>
        </>
    )
}
