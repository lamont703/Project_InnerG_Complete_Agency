import { useState, useEffect, useCallback } from "react"
import { useRouter } from "next/navigation"
import { createBrowserClient, supabaseAnonKey } from "@/lib/supabase/browser"
import { AgencyService } from "./agency-service"
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
    const [newSignalId, setNewSignalId] = useState<string | null>(null)

    const [supabase] = useState(() => createBrowserClient())
    const [service] = useState(() => new AgencyService(supabase))

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
        newSignalId,
        refresh: fetchData,
        syncGHL: handleSyncGHL
    }
}
