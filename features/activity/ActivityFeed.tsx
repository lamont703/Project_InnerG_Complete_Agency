"use client"

import { Radio, AlertCircle } from "lucide-react"
import { Button } from "@/components/ui/button"
import { useActivity } from "./use-activity"
import { ActivityItem } from "./components/ActivityItem"
import { ActivityEntry } from "./types"

interface ActivityFeedProps {
    projectSlug: string
    initialEntries?: ActivityEntry[]
}

export function ActivityFeed({ projectSlug, initialEntries }: ActivityFeedProps) {
    const {
        entries,
        isLoading,
        error,
        isRealtime
    } = useActivity(projectSlug, initialEntries)

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
                            <ActivityItem key={`${activity.created_at || idx}-${idx}`} activity={activity} />
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
