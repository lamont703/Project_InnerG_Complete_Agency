"use client"

import { useEffect, useState } from "react"
import { Instagram } from "lucide-react"

interface InstagramLoginButtonProps {
    configId?: string
    projectId?: string
    scopes?: string[]
    size?: 'small' | 'medium' | 'large'
    buttonText?: string
}

/**
 * InstagramLoginButton (Native Branding)
 * Uses the Instagram Login for Business flow to provide an Instagram-branded
 * authorization screen, avoiding the Facebook-blue branding.
 * It targets the same Meta App ID but uses the Instagram-specific OAuth endpoint.
 */
export function InstagramLoginButton({
    configId,
    projectId,
    scopes = [
        'instagram_business_basic',
        'instagram_business_content_publish',
        'instagram_business_manage_comments',
        'instagram_business_manage_insights',
        'pages_show_list',
        'pages_read_engagement',
        'business_management'
    ],
    size = 'medium',
    buttonText = 'Connect with Instagram'
}: InstagramLoginButtonProps) {
    const appId = process.env.NEXT_PUBLIC_META_APP_ID || "929507499941848"
    
    // Determine redirect URI dynamically, same as Facebook but for clarity on the Instagram callback
    const [redirectUri, setRedirectUri] = useState("https://agency.innergcomplete.com/instagram/callback")

    useEffect(() => {
        if (typeof window !== 'undefined') {
            const currentOrigin = window.location.origin
            const safeOrigin = currentOrigin.replace(/\/$/, "")
            const isLocalhost = safeOrigin.includes("localhost")
            const finalOrigin = isLocalhost ? safeOrigin : safeOrigin.replace("http://", "https://")
            
            setRedirectUri(`${finalOrigin}/instagram/callback`)
        }
    }, [])

    /**
     * Instagram Login for Business URL
     * Uses the instagram.com domain instead of facebook.com to show the 
     * Instagram-branded login experience.
     */
    const oauthUrl = `https://www.instagram.com/oauth/authorize` +
        `?client_id=${appId}` +
        `&redirect_uri=${encodeURIComponent(redirectUri)}` +
        `&scope=${encodeURIComponent(scopes.join(','))}` +
        `&response_type=code` +
        `&state=${projectId || ""}` +
        (configId ? `&config_id=${configId}` : "")

    if (!projectId) {
        return (
            <div className="flex flex-col items-center gap-2 p-4 rounded-xl bg-pink-500/10 border border-pink-500/20 text-center">
                <p className="text-[10px] font-black text-pink-500 uppercase tracking-widest">
                    Project Context Required
                </p>
                <p className="text-[9px] text-muted-foreground italic">
                    Select a project to enable Instagram connection.
                </p>
            </div>
        )
    }

    return (
        <a 
            href={oauthUrl}
            className={`flex items-center justify-center gap-3 font-bold transition-all px-6 py-3 rounded-xl bg-gradient-to-tr from-[#f09433] via-[#e6683c] to-[#bc1888] hover:opacity-90 text-white shadow-lg shadow-pink-500/20 active:scale-95 border border-white/10 group`}
        >
            <div className="bg-white/10 p-1.5 rounded-lg group-hover:bg-white/20 transition-colors">
                <Instagram className="h-5 w-5" />
            </div>
            <span className="text-sm">{buttonText}</span>
        </a>
    )
}
