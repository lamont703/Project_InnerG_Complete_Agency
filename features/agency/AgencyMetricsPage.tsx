"use client"

import { useState, useEffect } from "react"
import { Loader2, Building2, AlertTriangle, Sparkles, Layout, Target, Activity, Zap, Check, EyeOff } from "lucide-react"
import { Button } from "@/components/ui/button"

// Modular Components
import { AgencySidebar } from "./components/AgencySidebar"
import { AgencyHeader } from "./components/AgencyHeader"
import { MetricSlotGrid } from "@/features/metrics/components/MetricSlotGrid"
import { SlotProvider, useSlotContext } from "@/features/metrics/SlotContext"
import { getIcon } from "@/features/metrics/utils/icon-map"

// Hooks
import { useAgencyData } from "./use-agency-data"

export function AgencyMetricsPage() {
    return (
        <SlotProvider userRole="super-admin">
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
        isLoading,
        isSyncing,
        syncGHL,
        syncGithub,
    } = useAgencyData()

    const { activeSlotIds, availableSlots, toggleSlot } = useSlotContext()

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
                    <p className="text-sm text-muted-foreground">Loading Metrics Intelligence...</p>
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

    return (
        <div className="min-h-screen bg-background flex flex-col lg:flex-row overflow-x-hidden w-full text-foreground">
            <AgencySidebar
                isSidebarOpen={isSidebarOpen}
                onClose={() => setIsSidebarOpen(false)}
            />

            <main className="flex-1 flex flex-col min-h-screen bg-[#020617] relative w-full selection:bg-primary/30 overflow-x-hidden">
                {/* Background ambient gradients */}
                <div className="absolute top-0 right-[10%] w-[600px] h-[600px] bg-primary/20 rounded-full blur-[140px] opacity-20 animate-pulse pointer-events-none" />
                <div className="absolute bottom-[20%] left-[-10%] w-[500px] h-[500px] bg-accent/20 rounded-full blur-[120px] opacity-10 pointer-events-none" />

                <AgencyHeader
                    userData={userData}
                    currentTime={currentTime}
                    mounted={mounted}
                    isSyncing={isSyncing}
                    onSyncGHL={syncGHL}
                    onSyncGithub={syncGithub}
                    onMenuOpen={() => setIsSidebarOpen(true)}
                />

                <div className="flex-1 p-6 md:p-10 relative z-10 max-w-7xl mx-auto w-full overflow-x-hidden">
                    {/* Header Section */}
                    <div className="mb-12">
                        <div className="flex flex-col md:flex-row md:items-end justify-between gap-6 pb-6 border-b border-white/[0.05]">
                            <div>
                                <h1 className="text-2xl sm:text-3xl md:text-4xl font-black text-white tracking-tight flex items-center gap-3">
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
                            <h2 className="text-xs font-black uppercase tracking-[0.3em] text-white">Live Preview (Primary Grid)</h2>
                        </div>
                        
                        <MetricSlotGrid
                            slotIds={activeSlotIds}
                            metrics={mappedAgencyMetrics}
                            isAgency={true}
                            className="!mb-0"
                        />
                    </section>

                    {/* Slot Registry Management */}
                    <section>
                        <div className="flex items-center justify-between mb-8">
                            <div className="flex items-center gap-3">
                                <div className="h-8 w-8 rounded-lg bg-accent/10 flex items-center justify-center border border-accent/20">
                                    <Target className="h-4 w-4 text-accent" />
                                </div>
                                <h2 className="text-xs font-black uppercase tracking-[0.3em] text-white">Slot Registry & Port Configuration</h2>
                            </div>
                            <div className="px-4 py-1.5 rounded-full bg-white/5 border border-white/10 text-[10px] font-black uppercase tracking-widest text-muted-foreground">
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
                                            ? 'bg-primary/[0.03] border-primary/30 shadow-[0_0_40px_rgba(var(--primary),0.05)]'
                                            : 'bg-white/[0.01] border-white/5 hover:border-white/20'
                                            }`}
                                    >
                                        <div className="flex items-start gap-5 mb-6">
                                            <div className={`h-12 w-12 rounded-2xl flex items-center justify-center border transition-all duration-500 ${isActive ? 'bg-primary text-primary-foreground border-primary shadow-lg shadow-primary/20 scale-110' : 'bg-white/5 text-muted-foreground border-white/10'
                                                }`}>
                                                <Icon className="h-6 w-6" />
                                            </div>
                                            <div className="flex-1">
                                                <div className="flex items-center justify-between">
                                                    <span className={`text-base font-bold tracking-tight ${isActive ? 'text-white' : 'text-muted-foreground transition-colors group-hover:text-foreground'}`}>
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

                                        <div className="mt-8 pt-6 border-t border-white/[0.03] flex items-center justify-between">
                                            <div className="flex items-center gap-2">
                                                <div className={`h-1.5 w-1.5 rounded-full ${isActive ? 'bg-emerald-500 shadow-[0_0_8px_rgba(16,185,129,0.5)]' : 'bg-white/10'}`} />
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
                    <div className="mt-20 p-8 rounded-3xl bg-white/[0.01] border border-white/5 border-dashed flex flex-col md:flex-row items-center justify-between gap-8">
                        <div className="flex items-center gap-6">
                            <Activity className="h-10 w-10 text-primary/20" />
                            <div>
                                <p className="text-xs font-black uppercase tracking-widest text-primary">Intelligence Sync Protocol</p>
                                <p className="text-sm text-muted-foreground mt-1 max-w-md">Your configuration affects how the AI prioritizes signal generation and real-time alerts. Pinned ports receive high-frequency stream updates.</p>
                            </div>
                        </div>
                        <Button className="h-12 px-10 rounded-2xl font-black uppercase tracking-widest text-[11px] shadow-2xl shadow-primary/20 border-b-2 border-black/20">
                            Apply Changes Systemwide
                        </Button>
                    </div>
                </div>
            </main>
        </div>
    )
}
