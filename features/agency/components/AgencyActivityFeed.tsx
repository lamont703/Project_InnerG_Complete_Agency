"use client"

import { Activity } from "lucide-react"

export interface ActivityLogEntry {
    id: string
    action: string
    category: string
    created_at: string
    projects?: {
        name: string
    }
}

interface AgencyActivityFeedProps {
    activities: ActivityLogEntry[]
}

export function AgencyActivityFeed({ activities }: AgencyActivityFeedProps) {
    return (
        <div className="glass-panel rounded-2xl p-6 border border-white/5 mb-12">
            <div className="flex items-center justify-between mb-4">
                <h3 className="text-sm font-bold text-foreground flex items-center gap-2">
                    <Activity className="h-4 w-4 text-cyan-400" />
                    Cross-Project Activity Feed
                </h3>
            </div>
            <div className="space-y-3">
                {activities.length === 0 ? (
                    <p className="text-sm text-muted-foreground text-center py-4">No recent activity</p>
                ) : (
                    activities.map((activity) => (
                        <div key={activity.id} className="flex items-center gap-3 p-3 rounded-xl bg-white/[0.02] border border-white/5">
                            <div className="h-2 w-2 rounded-full bg-primary shrink-0" />
                            <div className="flex-1 min-w-0">
                                <p className="text-sm text-foreground truncate">{activity.action}</p>
                                <p className="text-[10px] text-muted-foreground">
                                    {activity.projects?.name || "System"} • {new Date(activity.created_at).toLocaleString()}
                                </p>
                            </div>
                            <span className="text-[10px] font-medium px-2 py-0.5 rounded-full bg-white/5 text-muted-foreground shrink-0">
                                {activity.category}
                            </span>
                        </div>
                    ))
                )}
            </div>
        </div>
    )
}
