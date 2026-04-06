"use client"

import { useEffect, useState } from "react"
import { Database, Loader2 } from "lucide-react"

interface AlpacaLoginButtonProps {
    projectId?: string
    size?: 'small' | 'medium' | 'large'
    buttonText?: string
}

/**
 * AlpacaLoginButton
 * Handles the Alpaca OAuth 2.0 flow for broker integration.
 */
export function AlpacaLoginButton({
    projectId,
    size = 'medium',
    buttonText = 'Connect Alpaca Broker'
}: AlpacaLoginButtonProps) {
    const [redirectUri, setRedirectUri] = useState<string | null>(null)

    // NEXT_PUBLIC_ALPACA_CLIENT_ID should be set in .env
    const clientId = process.env.NEXT_PUBLIC_ALPACA_CLIENT_ID || ""
    
    // Scopes needed for trading and viewing account info
    const scopes = [
        'account:read',
        'trading'
    ].join(' ')

    useEffect(() => {
        if (typeof window !== 'undefined') {
            const currentOrigin = window.location.origin.replace(/\/$/, "")
            const finalOrigin = currentOrigin.includes("localhost")
                ? currentOrigin
                : currentOrigin.replace(/^http:\/\//, "https://")
            
            // Standard callback route (adding trailing slash for stability)
            setRedirectUri(`${finalOrigin}/alpaca/callback/`)
        }
    }, [])

    const handleAlpacaLogin = async () => {
        if (!projectId) {
            alert("Please select a project before connecting Alpaca.")
            return
        }

        if (!clientId) {
            alert("Alpaca Client ID is not configured (NEXT_PUBLIC_ALPACA_CLIENT_ID).")
            return
        }

        if (!redirectUri) {
            alert("Still determining your redirect URI. Please try again in a moment.")
            return
        }

        // Alpaca OAuth 2.0 Auth URL
        const csrfState = Math.random().toString(36).substring(7)
        const state = `projectId:${projectId}__state:${csrfState}`
        
        // Save state for verification in callback
        sessionStorage.setItem("alpaca_oauth_state", csrfState)

        const oauthUrl = `https://app.alpaca.markets/oauth/authorize` +
            `?response_type=code` +
            `&client_id=${clientId}` +
            `&redirect_uri=${encodeURIComponent(redirectUri)}` +
            `&scope=${encodeURIComponent(scopes)}` +
            `&state=${encodeURIComponent(state)}`

        window.location.href = oauthUrl
    }

    if (!projectId) {
        return (
            <div className="flex flex-col items-center gap-2 p-4 rounded-xl bg-cyan-950/20 border border-cyan-500/10 text-center">
                <p className="text-[10px] font-black text-muted-foreground uppercase tracking-widest">
                    Project Context Required
                </p>
            </div>
        )
    }

    if (!redirectUri) {
        return (
            <div className="flex items-center justify-center gap-3 font-bold px-6 py-3 rounded-xl bg-cyan-600/10 opacity-60 text-cyan-400 shadow-lg border border-cyan-500/20 cursor-wait">
                <Loader2 className="w-5 h-5 text-cyan-500 animate-spin" />
                <span className="text-sm">Preparing Alpaca...</span>
            </div>
        )
    }

    return (
        <button
            onClick={handleAlpacaLogin}
            className={`flex items-center justify-center gap-3 font-bold transition-all px-6 py-3 rounded-xl bg-cyan-600 hover:bg-cyan-500 text-white shadow-lg shadow-cyan-500/20 active:scale-95 border border-cyan-400/20`}
        >
            <Database className="w-5 h-5 text-white" />
            <span className="text-sm font-black uppercase tracking-tight">{buttonText}</span>
        </button>
    )
}
