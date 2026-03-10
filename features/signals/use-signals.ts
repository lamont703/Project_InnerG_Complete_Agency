import { useState, useEffect, useCallback } from "react"
import { createBrowserClient } from "@/lib/supabase/browser"
import { SignalService } from "./signal-service"
import { Signal } from "./types"

export function useSignals(projectSlug: string, initialSignals?: Signal[]) {
    const [signals, setSignals] = useState<Signal[]>(initialSignals || [])
    const [isLoading, setIsLoading] = useState(!initialSignals)
    const [resolvingId, setResolvingId] = useState<string | null>(null)
    const [error, setError] = useState<string | null>(null)
    const [projectId, setProjectId] = useState<string | null>(null)

    const [supabase] = useState(() => createBrowserClient())
    const [signalService] = useState(() => new SignalService(supabase))

    const fetchSignals = useCallback(async () => {
        if (initialSignals) return

        try {
            setIsLoading(true)
            const pId = await signalService.getProjectId(projectSlug)
            if (!pId) throw new Error("Project not found")
            setProjectId(pId)

            const activeSignals = await signalService.getActiveSignals(pId)
            setSignals(activeSignals)
        } catch (err: any) {
            console.error("[useSignals] Error:", err)
            setError("Unable to process funnel intelligence.")
        } finally {
            setIsLoading(false)
        }
    }, [projectSlug, signalService, initialSignals])

    useEffect(() => {
        fetchSignals()
    }, [fetchSignals])

    const resolveSignal = async (signalId: string) => {
        if (!projectId) return
        setResolvingId(signalId)

        try {
            const { data: { session }, error: authError } = await supabase.auth.getSession()
            if (authError || !session) throw new Error("Authentication required")

            await signalService.resolveSignal({
                signalId,
                projectId,
                accessToken: session.access_token
            })

            // Remove from local state
            setSignals(prev => prev.filter(s => s.id !== signalId))
        } catch (err) {
            console.error("[useSignals] Resolve error:", err)
            // Error handling can be enhanced (e.g. toast)
        } finally {
            setResolvingId(null)
        }
    }

    return {
        signals,
        isLoading,
        resolvingId,
        error,
        resolveSignal,
        refresh: fetchSignals
    }
}
