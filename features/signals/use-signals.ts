import { useState, useEffect, useCallback } from "react"
import { createBrowserClient } from "@/lib/supabase/browser"
import { SignalService, DEMO_MOCK_SIGNALS } from "./signal-service"
import { AgencyService } from "../agency/agency-service"
import { Signal } from "./types"

export function useSignals(projectSlug: string, initialSignals?: Signal[]) {
    const [signals, setSignals] = useState<Signal[]>(initialSignals || [])
    const [drafts, setDrafts] = useState<any[]>([])
    const [isLoading, setIsLoading] = useState(!initialSignals)
    const [resolvingId, setResolvingId] = useState<string | null>(null)
    const [error, setError] = useState<string | null>(null)
    const [projectId, setProjectId] = useState<string | null>(null)

    const [supabase] = useState(() => createBrowserClient())
    const [signalService] = useState(() => new SignalService(supabase))
    const [agencyService] = useState(() => new AgencyService(supabase))

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
            
            const [activeSignals, activeDrafts] = await Promise.all([
                signalService.getActiveSignals(pId, isAgencySentinel),
                agencyService.getSocialDrafts(pId)
            ])

            setSignals(activeSignals)
            setDrafts(activeDrafts)
        } catch (err: any) {
            console.error("[useSignals] Error:", err)
            setError("Unable to process funnel intelligence.")
            if (signals.length === 0) {
                setSignals(DEMO_MOCK_SIGNALS)
            }
        } finally {
            setIsLoading(false)
        }
    }, [projectSlug, signalService, agencyService, initialSignals, signals.length])

    useEffect(() => {
        fetchSignals()
    }, [fetchSignals])

    const resolveSignal = async (signalId: string, params?: { platforms?: string[], scheduledAt?: string }) => {
        if (!projectId) return
        setResolvingId(signalId)

        try {
            const { data: { session }, error: authError } = await supabase.auth.getSession()
            if (authError || !session) throw new Error("Authentication required")

            await signalService.resolveSignal({
                signalId,
                projectId,
                accessToken: session.access_token,
                platforms: params?.platforms,
                scheduledAt: params?.scheduledAt
            })

            // Remove from local state
            setSignals(prev => prev.filter(s => s.id !== signalId))
            // Refresh drafts as resolution might have created one
            const updatedDrafts = await agencyService.getSocialDrafts(projectId)
            setDrafts(updatedDrafts)
        } catch (err) {
            console.error("[useSignals] Resolve error:", err)
        } finally {
            setResolvingId(null)
        }
    }

    const publishDraft = async (draftId: string, params?: { platforms?: string[], scheduledAt?: string }) => {
        if (!projectId) return
        try {
            const { data: { session } } = await supabase.auth.getSession()
            if (!session) return

            await agencyService.publishSocialPost(
                session.access_token,
                process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
                draftId,
                params?.platforms,
                params?.scheduledAt
            )
            // Refresh
            const updatedDrafts = await agencyService.getSocialDrafts(projectId)
            setDrafts(updatedDrafts)
        } catch (err) {
            console.error("[useSignals] Publish error:", err)
        }
    }

    const deleteDraft = async (draftId: string, pId: string) => {
        try {
            await agencyService.deleteSocialDraft(draftId, pId)
            setDrafts(prev => prev.filter(d => d.id !== draftId))
        } catch (err) {
            console.error("[useSignals] Delete error:", err)
        }
    }

    return {
        signals,
        drafts,
        isLoading,
        resolvingId,
        error,
        resolveSignal,
        publishDraft,
        deleteDraft,
        refresh: fetchSignals
    }
}
