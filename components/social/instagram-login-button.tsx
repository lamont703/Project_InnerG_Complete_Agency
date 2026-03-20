"use client"

import { useEffect, useState } from "react"
import { Instagram, Loader2 } from "lucide-react"

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
 *
 * IMPORTANT: redirectUri is initialized to null and only set after mount so that
 * the OAuth dialog URL always uses the *actual* current origin (critical for ngrok
 * and any non-production environment). The button is disabled until the URI is known
 * to prevent a mismatch between the dialog redirect_uri and the token-exchange
 * redirect_uri — which is the exact error Meta returns as "invalid verification code".
 */
export function InstagramLoginButton({
    configId,
    projectId,
    scopes = [
        'instagram_business_basic',
        'instagram_business_content_publish',
        'instagram_business_manage_comments',
        'instagram_business_manage_insights',
        'instagram_business_manage_messages'
    ],
    size = 'medium',
    buttonText = 'Connect with Instagram'
}: InstagramLoginButtonProps) {
    const appId = process.env.NEXT_PUBLIC_INSTAGRAM_APP_ID || "1341582051161091"
    
    // null = not yet determined (before mount). We must NOT fall back to a
    // hardcoded production URL here, because if the user is on ngrok the dialog
    // would be launched with the wrong redirect_uri and the exchange will fail.
    const [redirectUri, setRedirectUri] = useState<string | null>(null)

    useEffect(() => {
        if (typeof window !== 'undefined') {
            const currentOrigin = window.location.origin.replace(/\/$/, "")
            // Keep http:// for localhost (Meta allows it); force https:// elsewhere
            const finalOrigin = currentOrigin.includes("localhost")
                ? currentOrigin
                : currentOrigin.replace(/^http:\/\//, "https://")
            
            setRedirectUri(`${finalOrigin}/instagram/callback`)
        }
    }, [])

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

    // Don't render a clickable link until we know the correct redirect URI.
    // This prevents the race where oauthUrl is built before the useEffect fires.
    if (!redirectUri) {
        return (
            <div className="flex items-center justify-center gap-3 font-bold px-6 py-3 rounded-xl bg-gradient-to-tr from-[#f09433] via-[#e6683c] to-[#bc1888] opacity-60 text-white shadow-lg shadow-pink-500/20 border border-white/10 cursor-wait">
                <Loader2 className="h-5 w-5 animate-spin" />
                <span className="text-sm">Preparing...</span>
            </div>
        )
    }

    /**
     * Instagram Login for Business URL — built ONLY after redirectUri is confirmed
     * so the dialog and the token exchange always use the identical redirect_uri.
     */
    const oauthUrl = `https://www.instagram.com/oauth/authorize` +
        `?force_reauth=true` +
        `&client_id=${appId}` +
        `&redirect_uri=${encodeURIComponent(redirectUri)}` +
        `&response_type=code` +
        `&scope=${encodeURIComponent(scopes.join(','))}` +
        (projectId ? `&state=${projectId}__instagram` : "") +
        (configId ? `&config_id=${configId}` : "")

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
