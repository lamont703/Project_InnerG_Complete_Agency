"use client"

import { useState, useEffect } from "react"
import { useParams } from "next/navigation"
import { Loader2 } from "lucide-react"

// Modular Components
import { AgencyHeader } from "./components/AgencyHeader"
import { AgencyChatInterface } from "./components/AgencyChat"
import { UnifiedStream } from "./components/UnifiedStream"

// Hooks
import { useAgencyData } from "./use-agency-data"
import { useAdminSidebar } from "./context/AdminSidebarContext"
import { useMobileNav } from "./context/MobileNavContext"

/**
 * AgencyDashboardInterface - The Orchestrator.
 * Handles the display logic for Chat and Signals within the Agency Admin shell.
 */
export function AgencyDashboardInterface() {
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
        publishPost,
        deleteDraft,
        generateImage,
        generateVideo,
        clearMedia
    } = useAgencyData(slug)

    const { setIsSidebarOpen } = useAdminSidebar()
    const { activeTab } = useMobileNav()

    const [currentTime, setCurrentTime] = useState(new Date())
    const [mounted, setMounted] = useState(false)

    useEffect(() => {
        setMounted(true)
        const timer = setInterval(() => setCurrentTime(new Date()), 1000)
        return () => clearInterval(timer)
    }, [])

    if (isLoading) {
        return (
            <div className="h-full flex items-center justify-center">
                <div className="flex flex-col items-center gap-4">
                    <Loader2 className="h-8 w-8 animate-spin text-primary" />
                    <p className="text-sm text-muted-foreground">Initializing Command Intelligence...</p>
                </div>
            </div>
        )
    }

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
            createdAt: s.created_at,
            actionUrl: s.action_url,
            metadata: s.metadata,
            project_id: s.project_id
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
            createdAt: s.created_at,
            actionUrl: s.action_url,
            metadata: s.metadata,
            project_id: s.project_id
        }))
    ].sort((a, b) => new Date(b.createdAt!).getTime() - new Date(a.createdAt!).getTime())

    const portalName = projects.find(p => p.slug === slug)?.name

    return (
        <div className="flex-1 flex flex-col h-full relative overflow-hidden">
            {/* Background ambient gradients */}
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
            <div className="flex-1 flex flex-col lg:flex-row relative z-10 w-full overflow-hidden min-h-0">
                
                {/* 1. Intelligence Hub (Chat) - Primary Center */}
                <div className={`flex-1 min-w-0 flex flex-col overflow-hidden min-h-0 ${activeTab === 'chat' ? 'flex' : 'hidden lg:flex'}`}>
                    <AgencyChatInterface />
                </div>

                {/* 2. Unified Signal Feed & Social Orchestration - Flush to the right edge */}
                <div className={`w-full lg:w-[450px] flex-1 lg:flex-none lg:shrink-0 flex flex-col bg-card/50 backdrop-blur-xl border-l border-border min-h-0 ${activeTab === 'signals' ? 'flex' : 'hidden lg:flex'}`}>
                    <UnifiedStream 
                        signals={allAgencySignalsMapped}
                        drafts={socialDrafts}
                        onResolveSignal={resolveSignal}
                        onPublishDraft={publishPost}
                        onDeleteDraft={deleteDraft}
                        onGenerateImage={generateImage}
                        onGenerateVideo={generateVideo}
                        onClearMedia={clearMedia}
                        isResolving={!!resolvingId}
                        highlightId={newSignalId || newDraftId}
                        isFlush={true}
                    />
                </div>
            </div>
        </div>
    )
}
