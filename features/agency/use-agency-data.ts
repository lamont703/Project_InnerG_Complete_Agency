import { useState, useEffect, useCallback } from "react"
import { useRouter } from "next/navigation"
import { createBrowserClient, supabaseAnonKey } from "@/lib/supabase/browser"
import { AgencyService } from "./agency-service"
import { SignalService } from "../signals/signal-service"
import {
    AgencyProject,
    StrategicSignal,
    OperationalSignal,
    AgencyUserData
} from "./types"

export function useAgencyData() {
    const router = useRouter()
    const [userData, setUserData] = useState<AgencyUserData | null>(null)
    const [projects, setProjects] = useState<AgencyProject[]>([])
    const [strategicSignals, setStrategicSignals] = useState<StrategicSignal[]>([])
    const [operationalSignals, setOperationalSignals] = useState<OperationalSignal[]>([])

    const [isLoading, setIsLoading] = useState(true)
    const [isSyncing, setIsSyncing] = useState(false)
    const [resolvingId, setResolvingId] = useState<string | null>(null)
    const [newSignalId, setNewSignalId] = useState<string | null>(null)

    const [supabase] = useState(() => createBrowserClient())
    const [service] = useState(() => new AgencyService(supabase))
    const [signalService] = useState(() => new SignalService(supabase))

    const fetchData = useCallback(async () => {
        try {
            const { data: { user } } = await supabase.auth.getUser()
            if (!user) {
                router.push("/login")
                return
            }

            const profile = await service.getAdminProfile(user.id)
            if (!profile) {
                router.push("/select-portal")
                return
            }
            setUserData(profile)

            // Parallel fetch for performance
            const [projData, signalData] = await Promise.all([
                service.getActiveProjects(),
                service.getAllAgencySignals()
            ])

            setProjects(projData)
            setStrategicSignals(signalData.strategic)
            setOperationalSignals(signalData.operational)

        } catch (err) {
            console.error("[useAgencyData] Error:", err)
        } finally {
            setIsLoading(false)
        }
    }, [router, service, supabase])

    const handleSyncGHL = async () => {
        setIsSyncing(true)
        try {
            const { data: { session } } = await supabase.auth.getSession()
            if (!session) throw new Error("No active session")

            await service.syncGHL(session.access_token, supabaseAnonKey)
            alert("GHL Pipeline Sync Successful!")
            await fetchData()
        } catch (err: any) {
            console.error("Sync failed:", err)
            alert("Sync failed: " + (err.message || "Unknown error"))
        } finally {
            setIsSyncing(false)
        }
    }

    const handleResolveSignal = async (signalId: string) => {
        setResolvingId(signalId)
        try {
            // Handle mock signals (demo data) locally
            if (signalId.startsWith('sig-')) {
                setStrategicSignals(prev => prev.filter(s => s.id !== signalId))
                setOperationalSignals(prev => prev.filter(s => s.id !== signalId))
                return
            }

            const { data: { session } } = await supabase.auth.getSession()
            if (!session) throw new Error("No active session")

            // Find the signal to get its project_id
            const signal = [...strategicSignals, ...operationalSignals].find(s => s.id === signalId)
            if (!signal) throw new Error("Signal not found")

            await signalService.resolveSignal({
                signalId,
                projectId: signal.project_id,
                accessToken: session.access_token
            })

            // Remove real signals from local state after successful API call
            setStrategicSignals(prev => prev.filter(s => s.id !== signalId))
            setOperationalSignals(prev => prev.filter(s => s.id !== signalId))
        } catch (err: any) {
            console.error("[useAgencyData] Resolve failed:", err)
        } finally {
            setResolvingId(null)
        }
    }

    useEffect(() => {
        fetchData()

        // Realtime Hot-Reload
        const signalChannel = supabase
            .channel('agency-data-hotreload')
            .on('postgres_changes', { event: 'INSERT', schema: 'public', table: 'ai_signals' }, (payload) => {
                setNewSignalId(payload.new.id)
                fetchData()
                setTimeout(() => setNewSignalId(null), 5000)
            })
            .subscribe()

        return () => {
            supabase.removeChannel(signalChannel)
        }
    }, [fetchData, supabase])

    return {
        userData,
        projects,
        strategicSignals,
        operationalSignals,
        isLoading,
        isSyncing,
        resolvingId,
        newSignalId,
        refresh: fetchData,
        syncGHL: handleSyncGHL,
        resolveSignal: handleResolveSignal
    }
}
