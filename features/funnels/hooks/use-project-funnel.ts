import { useState, useEffect, useCallback } from "react"
import { createBrowserClient } from "@/lib/supabase/browser"
import { AgencyService } from "@/features/agency/agency-service"

export function useProjectFunnel(projectSlug: string) {
    const [isLoading, setIsLoading] = useState(true)
    const [youtubeMetrics, setYoutubeMetrics] = useState<any>(null)
    const [tiktokMetrics, setTiktokMetrics] = useState<any>(null)
    const [linkedinMetrics, setLinkedinMetrics] = useState<any>(null)
    const [instagramMetrics, setInstagramMetrics] = useState<any>(null)
    const [twitterMetrics, setTwitterMetrics] = useState<any>(null)
    const [facebookMetrics, setFacebookMetrics] = useState<any>(null)
    const [pixelMetrics, setPixelMetrics] = useState<any>(null)
    const [pixelMetrics24h, setPixelMetrics24h] = useState<any>(null)
    const [funnelConfig, setFunnelConfig] = useState<any>(null)

    const [supabase] = useState(() => createBrowserClient())
    const [service] = useState(() => new AgencyService(supabase))

    const fetchData = useCallback(async () => {
        if (!projectSlug) return
        
        setIsLoading(true)
        try {
            const [yt, tt, li, ig, tw, fb, pixel, pixel24h, config] = await Promise.all([
                service.getYouTubeMetrics(projectSlug),
                service.getTikTokMetrics(projectSlug),
                service.getLinkedInMetrics(projectSlug),
                service.getInstagramMetrics(projectSlug),
                service.getTwitterMetrics(projectSlug),
                service.getFacebookMetrics(projectSlug),
                service.getPixelMetrics(projectSlug),
                service.getRolling24hPixelMetrics(projectSlug),
                service.getFunnelConfig(projectSlug)
            ])

            setYoutubeMetrics(yt)
            setTiktokMetrics(tt)
            setLinkedinMetrics(li)
            setInstagramMetrics(ig)
            setTwitterMetrics(tw)
            setFacebookMetrics(fb)
            setPixelMetrics(pixel)
            setPixelMetrics24h(pixel24h)
            setFunnelConfig(config)
        } catch (err) {
            console.error("[useProjectFunnel] Error:", err)
        } finally {
            setIsLoading(false)
        }
    }, [projectSlug, service])

    useEffect(() => {
        fetchData()
    }, [fetchData])

    return {
        isLoading,
        youtubeMetrics,
        tiktokMetrics,
        linkedinMetrics,
        instagramMetrics,
        facebookMetrics,
        twitterMetrics,
        pixelMetrics,
        pixelMetrics24h,
        funnelConfig,
        refresh: fetchData
    }
}
