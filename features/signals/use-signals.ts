import { useState, useEffect, useCallback } from "react"
import { createBrowserClient } from "@/lib/supabase/browser"
import { SignalService, DEMO_MOCK_SIGNALS } from "./signal-service"
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
            if (!pId) {
                console.warn(`[useSignals] Project with slug "${projectSlug}" not found. Falling back to demo data.`)
                setSignals(DEMO_MOCK_SIGNALS)
                return
            }
            setProjectId(pId)

            const isAgencySentinel = pId === "00000000-0000-0000-0000-000000000001"
            const activeSignals = await signalService.getActiveSignals(pId, isAgencySentinel)
            setSignals(activeSignals)
        } catch (err: any) {
            console.error("[useSignals] Error:", err)
            setError("Unable to process funnel intelligence.")
            if (signals.length === 0) {
                setSignals(DEMO_MOCK_SIGNALS)
            }
        } finally {
            setIsLoading(false)
        }
    }, [projectSlug, signalService, initialSignals, signals.length]) // Added signals.length to dependencies for the catch block check

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
