"use client"

import { useEffect, useState } from "react"
import { Twitter, Loader2 } from "lucide-react"

interface TwitterLoginButtonProps {
    projectId?: string
    size?: 'small' | 'medium' | 'large'
    buttonText?: string
}

/**
 * TwitterLoginButton
 * Handles the X (Twitter) OAuth 2.0 PKCE flow for content sync.
 *
 * Uses the same PKCE pattern as TikTok to satisfy strict security requirements.
 */
export function TwitterLoginButton({
    projectId,
    size = 'medium',
    buttonText = 'Connect with X'
}: TwitterLoginButtonProps) {
    const [redirectUri, setRedirectUri] = useState<string | null>(null)
    const [visitorId, setVisitorId] = useState<string | null>(null)

    // X App Config (Twitter API v2)
    const clientId = process.env.NEXT_PUBLIC_TWITTER_CLIENT_ID || "gkWLEGjUs8PdmrE1T7rrApZzu"
    
    // Scopes needed for syncing tweet data and profile info
    const scopes = [
        'tweet.read',
        'users.read'
    ].join(' ') // X scopes use SPACE separator

    useEffect(() => {
        if (typeof window !== 'undefined') {
            const currentOrigin = window.location.origin.replace(/\/$/, "")
            const finalOrigin = currentOrigin.includes("localhost")
                ? currentOrigin
                : currentOrigin.replace(/^http:\/\//, "https://")
            
            // Following the user's preferred format
            setRedirectUri(`${finalOrigin}/x/callback`)

            // Capture the Pixel Visitor ID from localStorage
            const storedVisitorId = localStorage.getItem("inner_g_visitor_id")
            if (storedVisitorId) {
                setVisitorId(storedVisitorId)
            }
        }
    }, [])

    const generatePKCE = async () => {
        const array = new Uint8Array(32)
        window.crypto.getRandomValues(array)
        const verifier = btoa(String.fromCharCode(...array))
            .replace(/\+/g, '-')
            .replace(/\//g, '_')
            .replace(/=/g, '')
        
        const encoder = new TextEncoder()
        const data = encoder.encode(verifier)
        const hash = await window.crypto.subtle.digest("SHA-256", data)
        const challenge = btoa(String.fromCharCode(...new Uint8Array(hash)))
            .replace(/\+/g, '-')
            .replace(/\//g, '_')
            .replace(/=/g, '')
            
        return { verifier, challenge }
    }

    const handleTwitterLogin = async () => {
        if (!projectId) {
            alert("Please select a project before connecting X (Twitter).")
            return
        }

        if (!redirectUri) {
            alert("Still determining your redirect URI. Please try again in a moment.")
            return
        }

        const { verifier, challenge } = await generatePKCE()
        
        // Save verifier and state data
        sessionStorage.setItem("twitter_code_verifier", verifier)
        sessionStorage.setItem("twitter_redirect_uri", redirectUri)

        // X OAuth 2.0 Auth URL
        const csrfState = Math.random().toString(36).substring(7)
        const state = `projectId:${projectId}__state:${csrfState}${visitorId ? `__visitor:${visitorId}` : ""}`
        
        const oauthUrl = `https://twitter.com/i/oauth2/authorize` +
            `?response_type=code` +
            `&client_id=${clientId}` +
            `&redirect_uri=${encodeURIComponent(redirectUri)}` +
            `&scope=${encodeURIComponent(scopes)}` +
            `&state=${encodeURIComponent(state)}` +
            `&code_challenge=${challenge}` +
            `&code_challenge_method=S256`

        window.location.href = oauthUrl
    }

    if (!projectId) {
        return (
            <div className="flex flex-col items-center gap-2 p-4 rounded-xl bg-zinc-900 border border-white/10 text-center">
                <p className="text-[10px] font-black text-muted-foreground uppercase tracking-widest">
                    Project Context Required
                </p>
            </div>
        )
    }

    if (!redirectUri) {
        return (
            <div className="flex items-center justify-center gap-3 font-bold px-6 py-3 rounded-xl bg-black opacity-60 text-white shadow-lg border border-white/10 cursor-wait">
                <Loader2 className="w-5 h-5 text-zinc-500 animate-spin" />
                <span className="text-sm">Preparing X...</span>
            </div>
        )
    }

    return (
        <button
            onClick={handleTwitterLogin}
            className={`flex items-center justify-center gap-3 font-bold transition-all px-6 py-3 rounded-xl bg-black hover:bg-zinc-800 text-white shadow-lg shadow-white/5 active:scale-95 border border-white/20`}
        >
            <Twitter className="w-5 h-5 text-white" />
            <span className="text-sm">{buttonText}</span>
        </button>
    )
}
