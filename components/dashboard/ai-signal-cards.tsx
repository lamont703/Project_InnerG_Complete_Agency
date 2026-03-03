"use client"

import { useState, useEffect } from "react"
import { ArrowUpRight, Database, Zap, Instagram, Loader2, AlertCircle } from "lucide-react"
import { Button } from "@/components/ui/button"
import { createBrowserClient } from "@/lib/supabase/browser"
import type { SignalCard } from "@/types"

interface AiSignalCardsProps {
    projectSlug: string
    /** Optional: Initial signals if parent provides them */
    signals?: SignalCard[]
    campaignLabel?: string
    /** Called when a signal action button is clicked */
    onResolve?: (signalId: string) => void
}

const TYPE_ICONS: Record<string, any> = {
    inventory: Database,
    conversion: Zap,
    social: Instagram,
}

const TYPE_COLORS: Record<string, string> = {
    inventory: "bg-emerald-500",
    conversion: "bg-primary",
    social: "bg-pink-500",
}

const SEVERITY_BUTTONS: Record<string, string> = {
    info: "bg-pink-600 hover:bg-pink-700 text-white",
    warning: "bg-emerald-600 hover:bg-emerald-700 text-white",
    critical: "bg-primary text-primary-foreground hover:bg-primary/90",
}

/**
 * AI Signal Cards — "Campaign Funnel Intelligence" section.
 * 
 * Fetches un-resolved AI signals for the given project.
 */
export function AiSignalCards({
    projectSlug,
    signals: initialSignals,
    campaignLabel = "Active Campaign",
    onResolve: parentOnResolve,
}: AiSignalCardsProps) {
    const [signals, setSignals] = useState<SignalCard[]>(initialSignals || [])
    const [isLoading, setIsLoading] = useState(!initialSignals)
    const [resolvingId, setResolvingId] = useState<string | null>(null)
    const [error, setError] = useState<string | null>(null)
    const [projectId, setProjectId] = useState<string | null>(null)

    useEffect(() => {
        if (initialSignals) return

        const fetchSignals = async () => {
            try {
                const supabase = createBrowserClient()

                // 1. Get Project ID
                const { data: project } = await supabase
                    .from("projects")
                    .select("id")
                    .eq("slug", projectSlug)
                    .single() as any

                if (!project) throw new Error("Project not found")
                setProjectId(project.id)

                // 2. Fetch Active Signals
                const { data: signalData, error: signalError } = await supabase
                    .from("ai_signals")
                    .select("*")
                    .eq("project_id", project.id)
                    .eq("is_resolved", false)
                    .order("created_at", { ascending: false }) as any

                if (signalError) throw signalError

                const mapped = signalData.map((s: any) => ({
                    id: s.id,
                    signalType: s.signal_type,
                    title: s.title,
                    body: s.body,
                    actionLabel: s.action_label || "Resolve",
                    severity: s.severity,
                    color: TYPE_COLORS[s.signal_type] || "bg-muted",
                    buttonColor: SEVERITY_BUTTONS[s.severity] || "bg-secondary",
                }))

                setSignals(mapped)
            } catch (err: any) {
                console.error("[AiSignalCards] Error:", err)
                setError("Unable to process funnel intelligence.")
            } finally {
                setIsLoading(false)
            }
        }

        fetchSignals()
    }, [projectSlug, initialSignals])

    const handleResolve = async (signalId: string) => {
        if (!projectId) return
        setResolvingId(signalId)

        try {
            const supabase = createBrowserClient()
            const { error: invokeError } = await supabase.functions.invoke("resolve-signal", {
                body: {
                    signal_id: signalId,
                    project_id: projectId
                }
            })

            if (invokeError) throw invokeError

            // Remove from UI
            setSignals(prev => prev.filter(s => s.id !== signalId))
            parentOnResolve?.(signalId)
        } catch (err) {
            console.error("[AiSignalCards] Resolve error:", err)
            // Error handling could be more robust here (toast)
        } finally {
            setResolvingId(null)
        }
    }

    if (isLoading) {
        return (
            <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 mb-12">
                {[1, 2, 3].map(i => (
                    <div key={i} className="glass-panel h-64 animate-pulse rounded-2xl" />
                ))}
            </div>
        )
    }

    if (signals.length === 0 && !error) return null

    return (
        <div className="mb-12">
            <div className="flex items-center justify-between mb-6">
                <div>
                    <h2 className="text-2xl font-bold text-foreground">Campaign Funnel Intelligence</h2>
                    <p className="text-sm text-muted-foreground">
                        Real-time signals from your integrated data stack.
                    </p>
                </div>
                <div className="flex gap-2">
                    <span className="px-3 py-1 rounded-full bg-primary/10 text-primary text-[10px] font-bold uppercase tracking-wider border border-primary/20">
                        Live Analytics
                    </span>
                </div>
            </div>

            {error ? (
                <div className="p-8 glass-panel text-center border-destructive/20">
                    <AlertCircle className="h-8 w-8 text-destructive mx-auto mb-2" />
                    <p className="text-sm text-destructive font-medium">{error}</p>
                </div>
            ) : (
                <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
                    {signals.map((signal) => {
                        const Icon = TYPE_ICONS[signal.signalType] || Zap
                        return (
                            <div
                                key={signal.id}
                                className="glass-panel-strong rounded-2xl p-6 border border-white/[0.03] relative overflow-hidden group transition-all hover:border-white/10"
                            >
                                {/* Pulse indicator */}
                                <div className="absolute top-0 right-0 p-3">
                                    <span className={`flex h-2 w-2 rounded-full animate-pulse ${signal.color}`} />
                                </div>

                                <div className="flex items-center gap-3 mb-4">
                                    <Icon className={`h-5 w-5 ${signal.color.replace('bg-', 'text-')}`} />
                                    <span className="text-xs font-bold uppercase tracking-widest text-muted-foreground">
                                        {signal.signalType.replace("_", " ")} Signal
                                    </span>
                                </div>

                                <h3 className="text-lg font-bold mb-2">{signal.title}</h3>
                                <p className="text-sm text-muted-foreground mb-6 line-clamp-3 leading-relaxed">{signal.body}</p>

                                <Button
                                    id={`btn-signal-action-${signal.id}`}
                                    className={`w-full ${signal.buttonColor} gap-2 h-11 font-bold shadow-lg shadow-black/20 transition-transform active:scale-95`}
                                    onClick={() => handleResolve(signal.id)}
                                    disabled={resolvingId === signal.id}
                                >
                                    {resolvingId === signal.id ? (
                                        <Loader2 className="h-4 w-4 animate-spin" />
                                    ) : (
                                        <>
                                            {signal.actionLabel}
                                            <ArrowUpRight className="h-4 w-4" />
                                        </>
                                    )}
                                </Button>
                            </div>
                        )
                    })}
                </div>
            )}
        </div>
    )
}

/** Default mock AI signal cards for Phase 1 Kane's Bookstore demo */
export const KANES_MOCK_SIGNALS: SignalCard[] = [
    {
        id: "sig-inventory-001",
        signalType: "inventory",
        title: "High Demand Prediction",
        body: "Database analysis indicates 'The Midnight Library' is trending. Current stock will deplete in 48 hours based on current velocity.",
        actionLabel: "Automate Restock Order",
        severity: "warning",
        color: "bg-orange-500",
        buttonColor: "bg-emerald-600 hover:bg-emerald-700 text-white",
    },
    {
        id: "sig-conversion-001",
        signalType: "conversion",
        title: "342 Stalled Checkouts",
        body: "GHL Data identifies a high-intent segment stuck at Step 2 of the 'Komet Card' funnel. Potential revenue gap: $12,400.",
        actionLabel: "Trigger Retargeting Flow",
        severity: "critical",
        color: "bg-primary",
        buttonColor: "bg-primary text-primary-foreground hover:bg-primary/90",
    },
    {
        id: "sig-social-001",
        signalType: "social",
        title: "Engagement Spike (+48%)",
        body: "Your latest Reel on 'Special Edition Hardcovers' is viral. Instagram API reports over 500+ comments asking for purchase links.",
        actionLabel: "Deploy Bio-Link Update",
        severity: "info",
        color: "bg-pink-500",
        buttonColor: "bg-pink-600 hover:bg-pink-700 text-white",
    },
]
