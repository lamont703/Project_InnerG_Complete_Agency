"use client"

import { useEffect, useState } from "react"
import { Music2 } from "lucide-react"

interface TikTokLoginButtonProps {
    projectId?: string
    size?: 'small' | 'medium' | 'large'
    buttonText?: string
}

/**
 * TikTokLoginButton
 * Handles the TikTok OAuth 2.0 flow for content sync.
 * Redirects to the TikTok authorization page and handles the callback
 * to complete the connection in our Supabase backend.
 */
export function TikTokLoginButton({
    projectId,
    size = 'medium',
    buttonText = 'Connect with TikTok'
}: TikTokLoginButtonProps) {
    const [redirectUri, setRedirectUri] = useState("https://agency.innergcomplete.com/tiktok/callback")

    // TikTok App Config (Production)
    const clientKey = process.env.NEXT_PUBLIC_TIKTOK_CLIENT_KEY || "awm639z2ylg9rhgo"
    
    // Scopes needed for syncing video data and profile info
    const scopes = [
        'user.info.basic',
        'user.info.profile',
        'user.info.stats',
        'video.list'
    ].join(',')

    useEffect(() => {
        if (typeof window !== 'undefined') {
            const currentOrigin = window.location.origin
            const safeOrigin = currentOrigin.replace(/\/$/, "")
            const isLocalhost = safeOrigin.includes("localhost")
            const finalOrigin = isLocalhost ? safeOrigin : safeOrigin.replace("http://", "https://")
            
            setRedirectUri(`${finalOrigin}/tiktok/callback`)
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

    const handleTikTokLogin = async () => {
        if (!projectId) {
            alert("Please select a project before connecting TikTok.")
            return
        }

        const { verifier, challenge } = await generatePKCE()
        
        // Save verifier to sessionStorage so we can get it back on callback
        sessionStorage.setItem("tiktok_code_verifier", verifier)

        // TikTok OAuth 2.0 Auth URL
        const csrfState = Math.random().toString(36).substring(7)
        // We pack the projectId into the state so we know where to save the token on callback
        const state = `${projectId}__${csrfState}`
        
        const oauthUrl = `https://www.tiktok.com/v2/auth/authorize/` +
            `?client_key=${clientKey}` +
            `&scope=${encodeURIComponent(scopes)}` +
            `&response_type=code` +
            `&redirect_uri=${encodeURIComponent(redirectUri)}` +
            `&state=${state}` +
            `&code_challenge=${challenge}` +
            `&code_challenge_method=S256`

        window.location.href = oauthUrl
    }

    if (!projectId) {
        return (
            <div className="flex flex-col items-center gap-2 p-4 rounded-xl bg-pink-500/10 border border-pink-500/20 text-center">
                <p className="text-[10px] font-black text-pink-500 uppercase tracking-widest">
                    Project Context Required
                </p>
                <p className="text-[9px] text-muted-foreground italic">
                    Select a project to enable TikTok connection.
                </p>
            </div>
        )
    }

    return (
        <button
            onClick={handleTikTokLogin}
            className={`flex items-center justify-center gap-3 font-bold transition-all px-6 py-3 rounded-xl bg-black hover:bg-zinc-900 text-white shadow-lg shadow-pink-500/10 active:scale-95 border border-white/10`}
        >
            <Music2 className="w-5 h-5 text-pink-500" />
            <span className="text-sm">{buttonText}</span>
        </button>
    )
}
