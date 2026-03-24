"use client"

import { useEffect, useState } from "react"
import { Linkedin, Loader2 } from "lucide-react"

interface LinkedInLoginButtonProps {
    projectId?: string
    size?: 'small' | 'medium' | 'large'
    buttonText?: string
}

/**
 * LinkedInLoginButton
 * Handles the LinkedIn OAuth 2.0 flow for content sync and intelligence.
 */
export function LinkedInLoginButton({
    projectId,
    size = 'medium',
    buttonText = 'Connect LinkedIn'
}: LinkedInLoginButtonProps) {
    const [redirectUri, setRedirectUri] = useState<string | null>(null)
    const [visitorId, setVisitorId] = useState<string | null>(null)

    // LinkedIn App Config
    const clientId = process.env.NEXT_PUBLIC_LINKEDIN_CLIENT_ID || "78ybz51ay7vkol"
    
    // Scopes for OIDC profile access and social/marketing management
    const scopes = [
        'openid',
        'profile',
        'email',
        'r_ads',
        'r_ads_reporting',
        'r_organization_social',
        'r_organization_admin',
        'rw_organization_admin',
        'rw_ads',
        'w_member_social',
        'w_organization_social',
        'r_1st_connections_size',
        'r_basicprofile'
    ].join(' ') // LinkedIn scopes are SPACE separated

    useEffect(() => {
        if (typeof window !== 'undefined') {
            // Check for explicitly configured redirect URI first
            const envRedirectUri = process.env.NEXT_PUBLIC_LINKEDIN_REDIRECT_URI
            
            if (envRedirectUri) {
                setRedirectUri(envRedirectUri)
            } else {
                const currentOrigin = window.location.origin.replace(/\/$/, "")
                const finalOrigin = currentOrigin.includes("localhost")
                    ? currentOrigin
                    : currentOrigin.replace(/^http:\/\//, "https://")
                
                // Fallback to current origin + /linkedin/callback
                setRedirectUri(`${finalOrigin}/linkedin/callback`)
            }

            // Capture the Pixel Visitor ID if present
            const storedVisitorId = localStorage.getItem("inner_g_visitor_id")
            if (storedVisitorId) {
                setVisitorId(storedVisitorId)
            }
        }
    }, [])

    const handleLinkedInLogin = async () => {
        if (!projectId) {
            alert("Please select a project before connecting LinkedIn.")
            return
        }

        if (!redirectUri) {
            alert("Still determining your redirect URI. Please try again in a moment.")
            return
        }

        // Save redirect uri and state data in sessionStorage for the callback to use
        sessionStorage.setItem("linkedin_redirect_uri", redirectUri)

        // Generate a random state for CSRF protection
        const csrfState = Math.random().toString(36).substring(7)
        const state = `projectId:${projectId}__state:${csrfState}${visitorId ? `__visitor:${visitorId}` : ""}`
        
        // LinkedIn OAuth 2.0 Auth URL
        const oauthUrl = `https://www.linkedin.com/oauth/v2/authorization` +
            `?response_type=code` +
            `&client_id=${clientId}` +
            `&redirect_uri=${encodeURIComponent(redirectUri)}` +
            `&scope=${encodeURIComponent(scopes)}` +
            `&state=${encodeURIComponent(state)}`

        window.location.href = oauthUrl
    }

    if (!projectId) {
        return (
            <div className="flex flex-col items-center gap-2 p-4 rounded-xl bg-blue-900/10 border border-blue-500/10 text-center">
                <p className="text-[10px] font-black text-muted-foreground uppercase tracking-widest text-blue-400">
                    Project Context Required
                </p>
            </div>
        )
    }

    if (!redirectUri) {
        return (
            <div className="flex items-center justify-center gap-3 font-bold px-6 py-3 rounded-xl bg-blue-600/10 opacity-60 text-blue-400 shadow-lg border border-blue-500/10 cursor-wait">
                <Loader2 className="w-5 h-5 text-blue-400 animate-spin" />
                <span className="text-sm">Preparing LinkedIn...</span>
            </div>
        )
    }

    return (
        <button
            onClick={handleLinkedInLogin}
            className={`flex items-center justify-center gap-3 font-bold transition-all px-6 py-3 rounded-xl bg-blue-600 hover:bg-blue-700 text-white shadow-lg shadow-blue-500/20 active:scale-95 border border-blue-400/20`}
        >
            <Linkedin className="w-5 h-5 text-white fill-white" />
            <span className="text-sm">{buttonText}</span>
        </button>
    )
}
