import { useState, useEffect, useCallback, useRef } from "react"
import { createBrowserClient } from "@/lib/supabase/browser"
import { ActivityService, DEMO_MOCK_ACTIVITY } from "./activity-service"
import { ActivityEntry } from "./types"

export function useActivity(projectSlug: string, initialEntries?: ActivityEntry[]) {
    const [entries, setEntries] = useState<ActivityEntry[]>(initialEntries || [])
    const [isLoading, setIsLoading] = useState(!initialEntries)
    const [error, setError] = useState<string | null>(null)
    const [isRealtime, setIsRealtime] = useState(false)

    const [supabase] = useState(() => createBrowserClient())
    const [activityService] = useState(() => new ActivityService(supabase))
    const channelRef = useRef<any>(null)

    const fetchActivity = useCallback(async () => {
        try {
            setIsLoading(true)
            const projectId = await activityService.getProjectId(projectSlug)
            if (!projectId) throw new Error("Project not found")

            const logs = await activityService.getRecentActivity(projectId)

            if (logs.length === 0) {
                setEntries(DEMO_MOCK_ACTIVITY)
            } else {
                setEntries(logs)
            }

            // Realtime setup
            if (channelRef.current) {
                supabase.removeChannel(channelRef.current)
            }

            channelRef.current = activityService.subscribeToActivity(
                projectId,
                (newEntry) => {
                    setEntries(prev => [newEntry, ...prev.slice(0, 9)])
                },
                (status) => {
                    setIsRealtime(status === "SUBSCRIBED")
                }
            )

        } catch (err: any) {
            console.error("[useActivity] Error:", err)
            setError("Activity stream unavailable.")
            if (entries.length === 0) {
                setEntries(DEMO_MOCK_ACTIVITY)
            }
        } finally {
            setIsLoading(false)
        }
    }, [projectSlug, activityService, supabase])

    useEffect(() => {
        if (!initialEntries) {
            fetchActivity()
        }

        return () => {
            if (channelRef.current) {
                supabase.removeChannel(channelRef.current)
            }
        }
    }, [fetchActivity, initialEntries, supabase])

    return {
        entries,
        isLoading,
        error,
        isRealtime,
        refresh: fetchActivity
    }
}
