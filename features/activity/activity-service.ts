import { SupabaseClient, RealtimeChannel } from "@supabase/supabase-js"
import { ActivityEntry, RawActivityLog } from "./types"

export class ActivityService {
    constructor(private supabase: SupabaseClient) { }

    // Helper: format relative time
    formatTime(dateStr: string): string {
        const date = new Date(dateStr)
        const seconds = Math.floor((new Date().getTime() - date.getTime()) / 1000)

        if (seconds < 60) return "Just now"
        const minutes = Math.floor(seconds / 60)
        if (minutes < 60) return `${minutes}m ago`
        const hours = Math.floor(minutes / 60)
        if (hours < 24) return `${hours}h ago`
        return date.toLocaleDateString()
    }

    async getProjectId(projectSlug: string): Promise<string | undefined> {
        const { data, error } = await this.supabase
            .from("projects")
            .select("id")
            .eq("slug", projectSlug)
            .maybeSingle()

        if (error) throw error
        return data?.id
    }

    async getRecentActivity(projectId: string, limit: number = 10): Promise<ActivityEntry[]> {
        const { data, error } = await this.supabase
            .from("activity_log")
            .select("*")
            .eq("project_id", projectId)
            .order("created_at", { ascending: false })
            .limit(limit)

        if (error) throw error

        const records = data as RawActivityLog[]
        return records.map(l => ({
            action: l.action,
            category: l.category,
            time: this.formatTime(l.created_at),
            created_at: l.created_at
        }))
    }

    subscribeToActivity(
        projectId: string,
        onNewEntry: (entry: ActivityEntry) => void,
        onStatusChange?: (status: string) => void
    ): RealtimeChannel {
        const channel = this.supabase
            .channel(`activity-feed-${projectId}`)
            .on(
                "postgres_changes",
                {
                    event: "INSERT",
                    schema: "public",
                    table: "activity_log",
                    filter: `project_id=eq.${projectId}`
                },
                (payload) => {
                    const l = payload.new as RawActivityLog
                    const newEntry: ActivityEntry = {
                        action: l.action,
                        category: l.category,
                        time: "Just now",
                        created_at: l.created_at
                    }
                    onNewEntry(newEntry)
                }
            )
            .subscribe((status) => {
                onStatusChange?.(status)
            })

        return channel
    }
}

export const DEMO_MOCK_ACTIVITY: ActivityEntry[] = [
    { time: "2m ago", action: "System Optimization Completed", category: "Performance" },
    { time: "45m ago", action: "Campaign Intelligence Updated", category: "Strategy" },
    { time: "2h ago", action: "Conversion Funnel Verified", category: "Growth" },
    { time: "5h ago", action: "CRM Contact Sync Active", category: "Infrastructure" },
]
