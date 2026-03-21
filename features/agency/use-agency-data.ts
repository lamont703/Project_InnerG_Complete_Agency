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
    const [socialDrafts, setSocialDrafts] = useState<any[]>([])
    const [linkedinMetrics, setLinkedinMetrics] = useState<any>(null)
    const [youtubeMetrics, setYoutubeMetrics] = useState<any>(null)
    const [instagramMetrics, setInstagramMetrics] = useState<any>(null)
    const [facebookMetrics, setFacebookMetrics] = useState<any>(null)
    const [tiktokMetrics, setTiktokMetrics] = useState<any>(null)
    const [pixelMetrics, setPixelMetrics] = useState<any>(null)


    const [isLoading, setIsLoading] = useState(true)
    const [isSyncing, setIsSyncing] = useState(false)
    const [resolvingId, setResolvingId] = useState<string | null>(null)
    const [newSignalId, setNewSignalId] = useState<string | null>(null)
    const [newDraftId, setNewDraftId] = useState<string | null>(null)

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

            const profile = await service.getAdminProfile(user.id, user.user_metadata)
            if (!profile) {
                router.push("/select-portal")
                return
            }
            setUserData(profile)

            // Parallel fetch for performance
            const [projData, signalData, liMetrics, ytMetrics, igMetrics, fbMetrics, ttMetrics, pixelMetricsData] = await Promise.all([
                service.getActiveProjects(),
                service.getAllAgencySignals(),
                service.getLinkedInMetrics(),
                service.getYouTubeMetrics(),
                service.getInstagramMetrics(),
                service.getFacebookMetrics(),
                service.getTikTokMetrics(),
                service.getPixelMetrics()
            ])


            setProjects(projData)
            setStrategicSignals(signalData.strategic)
            setOperationalSignals(signalData.operational)
            setLinkedinMetrics(liMetrics)
            setYoutubeMetrics(ytMetrics)
            setInstagramMetrics(igMetrics)
            setFacebookMetrics(fbMetrics)
            setTiktokMetrics(ttMetrics)
            setPixelMetrics(pixelMetricsData)


            const draftData = await service.getSocialDrafts()
            setSocialDrafts(draftData)

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

            const connectionId = await service.getGHLConnection()
            await service.syncGHL(session.access_token, supabaseAnonKey, connectionId)
            alert("GHL Pipeline & Social Data Sync Successful!")
            await fetchData()
        } catch (err: any) {
            console.error("Sync failed:", err)
            alert("Sync failed: " + (err.message || "Unknown error"))
        } finally {
            setIsSyncing(false)
        }
    }

    const handleSyncGithub = async () => {
        setIsSyncing(true)
        try {
            const { data: { session } } = await supabase.auth.getSession()
            if (!session) throw new Error("No active session")

            const connectionId = await service.getGitHubConnection()
            if (!connectionId) {
                alert("No active GitHub connection found. Please configure one in Admin > Connectors.")
                return
            }

            await service.syncGithub(session.access_token, supabaseAnonKey, connectionId)
            alert("GitHub Repository Sync Successful!")
            await fetchData()
        } catch (err: any) {
            console.error("GitHub Sync failed:", err)
            alert("GitHub Sync failed: " + (err.message || "Unknown error"))
        } finally {
            setIsSyncing(false)
        }
    }

    const handleSyncLinkedIn = async () => {
        setIsSyncing(true)
        try {
            const { data: { session } } = await supabase.auth.getSession()
            if (!session) throw new Error("No active session")

            const connectionId = await service.getLinkedInConnection()
            if (!connectionId) {
                alert("No active LinkedIn connection found. Please configure one in Admin > Connectors.")
                return
            }

            await service.syncLinkedIn(session.access_token, supabaseAnonKey, connectionId)
            alert("LinkedIn Data Sync Successful!")
            await fetchData()
        } catch (err: any) {
            console.error("LinkedIn Sync failed:", err)
            alert("LinkedIn Sync failed: " + (err.message || "Unknown error"))
        } finally {
            setIsSyncing(false)
        }
    }

    const handleResolveSignal = async (signalId: string, platforms?: string[]) => {
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

            // If this is a social signal with a draft, and platforms are selected, publish instead of just resolving
            const signalAny = signal as any
            if (signalAny.signal_type === 'social' && signalAny.metadata?.social_plan_id && platforms && platforms.length > 0) {
                await handlePublishPost(signalAny.metadata.social_plan_id, platforms)
                return
            }

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

    const handlePublishPost = async (draftId: string, platforms?: string[]) => {
        try {
            const { data: { session } } = await supabase.auth.getSession()
            if (!session) throw new Error("No active session")

            await service.publishSocialPost(session.access_token, supabaseAnonKey, draftId, platforms)
            
            // Optimistic update
            setSocialDrafts(prev => prev.filter(d => d.id !== draftId))
            alert("Social post successfully published!")
        } catch (err: any) {
            console.error("[useAgencyData] Publish failed:", err)
            alert("Publishing failed: " + (err.message || "Unknown error"))
        }
    }

    const handleGenerateImage = async (draftId: string, style?: string) => {
        try {
            const { data: { session } } = await supabase.auth.getSession()
            if (!session) throw new Error("No active session")

            const imageUrl = await service.generateSocialImage(session.access_token, supabaseAnonKey, draftId, style)
            
            // Refresh data to show new image
            await fetchData()
            return imageUrl
        } catch (err: any) {
            console.error("[useAgencyData] Image generation failed:", err)
            alert("Image generation failed: " + (err.message || "Unknown error"))
            throw err
        }
    }

    const handleGenerateVideo = async (draftId: string) => {
        try {
            const { data: { session } } = await supabase.auth.getSession()
            if (!session) throw new Error("No active session")

            const videoUrl = await service.generateSocialVideo(session.access_token, supabaseAnonKey, draftId)
            
            // Refresh data to show new video
            await fetchData()
            return videoUrl
        } catch (err: any) {
            console.error("[useAgencyData] Video generation failed:", err)
            alert("Video generation failed: " + (err.message || "Unknown error"))
            throw err
        }
    }

    const handleClearMedia = async (draftId: string) => {
        try {
            await service.clearDraftMedia(draftId)
            await fetchData()
        } catch (err: any) {
            console.error("[useAgencyData] Clear media failed:", err)
        }
    }

    const handleDeleteSocialDraft = async (draftId: string, projectId: string) => {
        try {
            await service.deleteSocialDraft(draftId, projectId)
            
            // Optimistic update
            setSocialDrafts(prev => prev.filter(d => d.id !== draftId))
            // Also need to refresh signals if this was called from somewhere else, 
            // but usually signals will refresh via realtime
        } catch (err: any) {
            console.error("[useAgencyData] Delete failed:", err)
            alert("Delete failed: " + (err.message || "Unknown error"))
        }
    }

    const handleSyncPixel = async (projectSlug: string = "innergcomplete") => {
        setIsSyncing(true)
        try {
            await service.syncPixelSnapshot(projectSlug)
            await fetchData()
            alert("Pixel data successfully synchronized to dashboard snapshots!")
        } catch (err: any) {
            console.error("Pixel Sync failed:", err)
            alert("Pixel Sync failed: " + (err.message || "Unknown error"))
        } finally {
            setIsSyncing(false)
        }
    }

    useEffect(() => {
        fetchData()

        // Realtime Hot-Reload for Signals and Social Drafts
        const hotReloadChannel = supabase
            .channel('agency-data-hotreload')
            .on('postgres_changes', { event: 'INSERT', schema: 'public', table: 'ai_signals' }, (payload) => {
                setNewSignalId(payload.new.id)
                fetchData()
                setTimeout(() => setNewSignalId(null), 5000)
            })
            .on('postgres_changes', { event: 'INSERT', schema: 'public', table: 'social_content_plan' }, (payload) => {
                setNewDraftId(payload.new.id)
                fetchData()
                setTimeout(() => setNewDraftId(null), 5000)
            })
            .subscribe()

        return () => {
            supabase.removeChannel(hotReloadChannel)
        }
    }, [fetchData, supabase])

    return {
        userData,
        projects,
        strategicSignals,
        operationalSignals,
        socialDrafts,
        linkedinMetrics,
        youtubeMetrics,
        instagramMetrics,
        facebookMetrics,
        tiktokMetrics,
        pixelMetrics,

        isLoading,
        isSyncing,
        resolvingId,
        newSignalId,
        newDraftId,
        refresh: fetchData,
        syncGHL: handleSyncGHL,
        syncGithub: handleSyncGithub,
        syncLinkedIn: handleSyncLinkedIn,
        resolveSignal: handleResolveSignal,
        publishPost: handlePublishPost,
        deleteDraft: handleDeleteSocialDraft,
        generateImage: handleGenerateImage,
        generateVideo: handleGenerateVideo,
        clearMedia: handleClearMedia,
        syncPixel: handleSyncPixel
    }
}
