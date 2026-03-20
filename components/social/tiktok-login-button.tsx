"use client"

import { useEffect, useState } from "react"
import { Music2, Loader2 } from "lucide-react"

interface TikTokLoginButtonProps {
    projectId?: string
    size?: 'small' | 'medium' | 'large'
    buttonText?: string
}

/**
 * TikTokLoginButton
 * Handles the TikTok OAuth 2.0 PKCE flow for content sync.
 *
 * IMPORTANT: redirectUri is initialized to null and only set after mount so that
 * the OAuth dialog URL always uses the *actual* current origin (critical for ngrok).
 * The button is disabled until the URI is known to prevent mismatches between the
 * redirect_uri sent to TikTok and the one sent during code exchange.
 */
export function TikTokLoginButton({
    projectId,
    size = 'medium',
    buttonText = 'Connect with TikTok'
}: TikTokLoginButtonProps) {
    // null = not yet determined (before mount). Must NOT default to prod URL.
    const [redirectUri, setRedirectUri] = useState<string | null>(null)

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
            const currentOrigin = window.location.origin.replace(/\/$/, "")
            // Keep http:// for localhost; force https:// everywhere else (ngrok is always https)
            const finalOrigin = currentOrigin.includes("localhost")
                ? currentOrigin
                : currentOrigin.replace(/^http:\/\//, "https://")
            
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

        // Guard: should never happen since button is hidden until redirectUri is set
        if (!redirectUri) {
            alert("Still determining your redirect URI. Please try again in a moment.")
            return
        }

        const { verifier, challenge } = await generatePKCE()
        
        // Save verifier to sessionStorage so we can retrieve it on callback
        sessionStorage.setItem("tiktok_code_verifier", verifier)
        // Also persist the redirectUri so the callback page can send the exact same value
        sessionStorage.setItem("tiktok_redirect_uri", redirectUri)

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
            `&code_challenge_method=S256` +
            `&disable_auto_auth=1` +
            `&prompt=login`

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

    // Don't allow clicking until we know the correct redirect URI
    if (!redirectUri) {
        return (
            <div className="flex items-center justify-center gap-3 font-bold px-6 py-3 rounded-xl bg-black opacity-60 text-white shadow-lg shadow-pink-500/10 border border-white/10 cursor-wait">
                <Loader2 className="w-5 h-5 text-pink-500 animate-spin" />
                <span className="text-sm">Preparing...</span>
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

