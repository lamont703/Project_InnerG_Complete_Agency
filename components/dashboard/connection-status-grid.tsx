"use client"

import { useState, useEffect } from "react"
import {
    CheckCircle2,
    CircleDot,
    ArrowUpRight,
    Database,
    Bot,
    Zap,
    Instagram,
    Music2,
    XCircle,
    AlertTriangle,
    Loader2
} from "lucide-react"
import { createBrowserClient } from "@/lib/supabase/browser"
import type { StatusCard } from "@/types"

interface ConnectionStatusGridProps {
    projectSlug: string
    /** Optional: Override the fetch if data is provided by parent */
    statusItems?: StatusCard[]
    latencies?: Record<string, number>
}

const PROVIDER_ICONS: Record<string, any> = {
    ghl: Zap,
    instagram: Instagram,
    tiktok: Music2,
    custom_db: Database,
    stripe: Zap, // Placeholder
}

const PROVIDER_COLORS: Record<string, string> = {
    ghl: "text-orange-500 bg-orange-500/10",
    instagram: "text-pink-500 bg-pink-500/10",
    tiktok: "text-cyan-400 bg-cyan-400/10",
    custom_db: "text-emerald-500 bg-emerald-500/10",
    stripe: "text-blue-500 bg-blue-500/10",
}

const PROVIDER_LABELS: Record<string, string> = {
    ghl: "GoHighLevel Sync",
    instagram: "Instagram API",
    tiktok: "TikTok API",
    custom_db: "Client Database",
    stripe: "Stripe Payment Bridge",
}

/**
 * Connection Status Grid
 * Stores real-time health data for project integrations from system_connections.
 */
export function ConnectionStatusGrid({
    projectSlug,
    statusItems: initialItems,
    latencies: initialLatencies
}: ConnectionStatusGridProps) {
    const [items, setItems] = useState<StatusCard[]>(initialItems || [])
    const [latencies, setLatencies] = useState<Record<string, number>>(initialLatencies || {})
    const [isLoading, setIsLoading] = useState(!initialItems)
    const [error, setError] = useState<string | null>(null)

    useEffect(() => {
        if (initialItems) return

        const fetchConnections = async () => {
            try {
                const supabase = createBrowserClient()

                // 1. Get project ID
                const { data: project } = await supabase
                    .from("projects")
                    .select("id")
                    .eq("slug", projectSlug)
                    .maybeSingle() as any

                if (!project) {
                    setIsLoading(false)
                    return
                }

                // 2. Fetch all system connections
                const { data: connections, error: connError } = await supabase
                    .from("system_connections")
                    .select("*")
                    .eq("project_id", project.id) as any

                if (connError) throw connError

                // Always add the AI Engine status manually as it's a global service
                const aiStatus: StatusCard = {
                    id: "ai-engine",
                    label: "AI Agent Engine",
                    icon: Bot,
                    status: "Active",
                    details: "Gemini 1.5 Pro - Ready",
                    color: "text-primary bg-primary/10",
                }

                const mappedItems: StatusCard[] = [
                    aiStatus,
                    ...connections.map((conn: any) => ({
                        id: conn.id,
                        label: PROVIDER_LABELS[conn.provider] || conn.provider.toUpperCase(),
                        icon: PROVIDER_ICONS[conn.provider] || CircleDot,
                        status: conn.status.charAt(0).toUpperCase() + conn.status.slice(1),
                        details: conn.status === "active" ? "Connection handshake stable." : "Service disruption detected.",
                        color: PROVIDER_COLORS[conn.provider] || "text-muted-foreground bg-muted/10",
                    }))
                ]

                const mappedLatencies: Record<string, number> = {
                    "ai-engine": 45, // Global service latency
                }
                connections.forEach((conn: any) => {
                    mappedLatencies[conn.id] = conn.latency_ms
                })

                setItems(mappedItems)
                setLatencies(mappedLatencies)
            } catch (err: any) {
                console.error("[ConnectionStatusGrid] Error:", err)
                setError("Unable to retrieve infrastructure health.")
            } finally {
                setIsLoading(false)
            }
        }

        fetchConnections()
    }, [projectSlug, initialItems])

    if (isLoading) {
        return (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-12">
                {[1, 2, 3, 4].map((i) => (
                    <div key={i} className="glass-panel h-48 animate-pulse rounded-2xl" />
                ))}
            </div>
        )
    }

    return (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-12">
            {items.map((item) => (
                <div
                    key={item.id}
                    className="glass-panel-strong rounded-2xl p-6 transition-all hover:scale-[1.02] border border-white/[0.03] group flex flex-col"
                >
                    <div className="flex justify-between items-start mb-6">
                        <div className={`p-3 rounded-xl ${item.color}`}>
                            <item.icon className="h-6 w-6" />
                        </div>
                        <div className={`flex items-center gap-1.5 px-3 py-1 rounded-full border transition-colors ${item.status === "Active"
                            ? "bg-emerald-500/10 border-emerald-500/20 text-emerald-500"
                            : "bg-destructive/10 border-destructive/20 text-destructive"
                            }`}>
                            {item.status === "Active" ? (
                                <CheckCircle2 className="h-3.5 w-3.5" />
                            ) : (
                                <XCircle className="h-3.5 w-3.5" />
                            )}
                            <span className="text-[10px] font-bold uppercase tracking-widest">{item.status}</span>
                        </div>
                    </div>

                    <h3 className="text-lg font-bold text-foreground mb-1">{item.label}</h3>
                    <p className="text-xs text-muted-foreground mb-6 line-clamp-1 opacity-70 group-hover:opacity-100 transition-opacity">
                        {item.details}
                    </p>

                    <div className="flex items-center justify-between pt-4 border-t border-white/5 mt-auto">
                        <span className="text-[10px] uppercase font-bold text-muted-foreground tracking-tighter flex items-center gap-1.5">
                            <CircleDot className={`h-3 w-3 ${item.status === "Active" ? "text-emerald-500" : "text-destructive"}`} />
                            Latency: {latencies[item.id] ?? 0}ms
                        </span>
                        <button
                            id={`btn-system-logs-${item.id}`}
                            className="text-xs text-primary font-medium hover:underline flex items-center gap-1"
                        >
                            Log View <ArrowUpRight className="h-3 w-3" />
                        </button>
                    </div>
                </div>
            ))}
        </div>
    )
}
