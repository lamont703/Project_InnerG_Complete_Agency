"use client"

import { useState, useEffect } from "react"
import { Loader2, AlertCircle, Radio } from "lucide-react"
import { Button } from "@/components/ui/button"
import { createBrowserClient } from "@/lib/supabase/browser"
import type { ActivityEntry } from "@/types"

interface ActivityFeedProps {
    projectSlug: string
    /** Optional: Override fetch if parent provides logs */
    entries?: ActivityEntry[]
}

/**
 * Recent Activity Feed
 * 
 * Implements Supabase Realtime for a live audit log of project events.
 */
export function ActivityFeed({ entries: initialEntries, projectSlug }: ActivityFeedProps) {
    const [entries, setEntries] = useState<ActivityEntry[]>(initialEntries || [])
    const [isLoading, setIsLoading] = useState(!initialEntries)
    const [error, setError] = useState<string | null>(null)
    const [isRealtime, setIsRealtime] = useState(false)

    // Helper: format relative time
    const formatTime = (dateStr: string) => {
        const date = new Date(dateStr)
        const seconds = Math.floor((new Date().getTime() - date.getTime()) / 1000)

        if (seconds < 60) return "Just now"
        const minutes = Math.floor(seconds / 60)
        if (minutes < 60) return `${minutes}m ago`
        const hours = Math.floor(minutes / 60)
        if (hours < 24) return `${hours}h ago`
        return date.toLocaleDateString()
    }

    useEffect(() => {
        const supabase = createBrowserClient()
        let channel: any = null

        const fetchLogs = async () => {
            try {
                // 1. Get project ID
                const { data: project } = await supabase
                    .from("projects")
                    .select("id")
                    .eq("slug", projectSlug)
                    .single() as any

                if (!project) throw new Error("Project not found")

                // 2. Initial fetch
                const { data: logs, error: logError } = await supabase
                    .from("activity_log")
                    .select("*")
                    .eq("project_id", project.id)
                    .order("created_at", { ascending: false })
                    .limit(10) as any

                if (logError) throw logError

                const initialLogs = logs.map((l: any) => ({
                    action: l.action,
                    category: l.category,
                    time: formatTime(l.created_at)
                }))

                setEntries(initialLogs)

                // 3. Setup Realtime Subscription
                channel = supabase
                    .channel(`activity-feed-${project.id}`)
                    .on(
                        "postgres_changes",
                        {
                            event: "INSERT",
                            schema: "public",
                            table: "activity_log",
                            filter: `project_id=eq.${project.id}`
                        },
                        (payload: any) => {
                            const newEntry: ActivityEntry = {
                                action: payload.new.action,
                                category: payload.new.category,
                                time: "Just now"
                            }
                            setEntries(prev => [newEntry, ...prev.slice(0, 9)])
                        }
                    )
                    .subscribe((status) => {
                        setIsRealtime(status === "SUBSCRIBED")
                    })

            } catch (err: any) {
                console.error("[ActivityFeed] Error:", err)
                setError("Activity stream unavailable.")
            } finally {
                setIsLoading(false)
            }
        }

        if (!initialEntries) {
            fetchLogs()
        }

        return () => {
            if (channel) supabase.removeChannel(channel)
        }
    }, [projectSlug, initialEntries])

    if (isLoading) {
        return (
            <div className="max-w-xl">
                <div className="rounded-2xl glass-panel-strong border border-white/5 p-8 h-80 animate-pulse bg-white/5" />
            </div>
        )
    }

    return (
        <div className="max-w-xl">
            <div className="rounded-2xl glass-panel-strong border border-white/5 p-8 relative overflow-hidden group">
                {/* Realtime indicator */}
                <div className="absolute top-8 right-8 flex items-center gap-1.5">
                    <Radio className={`h-3 w-3 ${isRealtime ? "text-emerald-500 animate-pulse" : "text-muted-foreground opacity-50"}`} />
                    <span className="text-[9px] font-bold uppercase tracking-widest text-muted-foreground opacity-50">
                        {isRealtime ? "Live Feed" : "Stream Paused"}
                    </span>
                </div>

                <h3 className="text-xl font-bold mb-6">Recent Activity</h3>
                <div className="space-y-6 min-h-[160px]">
                    {entries.length > 0 ? (
                        entries.map((activity, idx) => (
                            <div key={idx} className="flex gap-4 items-start transition-all duration-500 animate-in fade-in slide-in-from-top-1">
                                <div className="h-2 w-2 rounded-full bg-primary mt-2 shrink-0 shadow-sm shadow-primary/50" />
                                <div>
                                    <p className="text-sm font-medium text-foreground">{activity.action}</p>
                                    <p className="text-[11px] text-muted-foreground opacity-70 mt-0.5">
                                        {activity.category} &bull; {activity.time}
                                    </p>
                                </div>
                            </div>
                        ))
                    ) : (
                        <div className="flex flex-col items-center justify-center py-10 opacity-30">
                            <AlertCircle className="h-8 w-8 mb-2" />
                            <p className="text-sm">No activity records found.</p>
                        </div>
                    )}
                </div>

                <Button
                    id="btn-view-historical-activity"
                    className="w-full mt-10 bg-secondary/50 hover:bg-secondary text-foreground text-[11px] font-bold uppercase tracking-widest py-6 transition-colors border border-white/5"
                >
                    View Historical Audit Data
                </Button>
            </div>
        </div>
    )
}

/** Default mock activity entries for Phase 1 Kane's Bookstore demo */
export const KANES_MOCK_ACTIVITY: ActivityEntry[] = [
    { time: "2m ago", action: "Inventory Sync Completed", category: "Retail Ops" },
    { time: "45m ago", action: "Personalization Engine Updated", category: "Growth" },
    { time: "2h ago", action: "Komet Card Variant Verified", category: "Revenue" },
    { time: "5h ago", action: "New GHL Contact Synced", category: "CRM" },
]
