"use client"

import React from "react"
import { Button } from "@/components/ui/button"
import { MonitorPlay } from "lucide-react"
import { SITE_URL } from "@/lib/site";

interface YouTubeLoginButtonProps {
    projectId: string
    visitorId?: string
    variant?: "default" | "outline" | "secondary" | "ghost"
    size?: "default" | "sm" | "lg" | "icon"
    className?: string
    label?: string
    disabled?: boolean
}

export const YouTubeLoginButton: React.FC<YouTubeLoginButtonProps> = ({
    projectId,
    visitorId,
    variant = "outline",
    size = "default",
    className,
    label = "Connect YouTube",
    disabled = false
}) => {
    // async because the PKCE challenge is a SubtleCrypto digest.
    const handleLogin = async () => {
        if (!projectId) {
            alert("Please select a project first.")
            return
        }
        
        // Internal-tools web client, NOT the customer-facing app client.
        //
        // This admin connector asks for youtube.force-ssl — a sensitive write
        // scope — and none of these YouTube scopes are declared on the app
        // client's Data Access page. Requesting them through the same client
        // that shows barbershop owners a business.manage consent screen is what
        // makes that app look, to Google, like it reaches for a user's whole
        // account. Keeping them apart leaves the app client with exactly the
        // three non-sensitive scopes it declares.
        //
        // Must be a WEB client (this is a browser redirect to an https
        // callback), so it's a different client from the Desktop one used by
        // the CLI scripts — see lib/google-internal-oauth.ts.
        //
        // The exchange (supabase/functions/complete-youtube-auth) and the
        // refresh (connector-sync) must use the SAME client, or the token
        // fails with unauthorized_client. All three flip together.
        const clientId =
            process.env.NEXT_PUBLIC_GOOGLE_INTERNAL_WEB_CLIENT_ID ||
            process.env.NEXT_PUBLIC_GOOGLE_CLIENT_ID
        if (!process.env.NEXT_PUBLIC_GOOGLE_INTERNAL_WEB_CLIENT_ID) {
            console.warn(
                "[youtube-connect] NEXT_PUBLIC_GOOGLE_INTERNAL_WEB_CLIENT_ID is not set — " +
                "requesting sensitive YouTube scopes through the customer-facing app client."
            )
        }
        const redirectUri = typeof window !== "undefined" && window.location.origin.includes("localhost")
            ? "http://localhost:3000/youtube/callback"
            : `${SITE_URL}/youtube/callback`

        // youtube.force-ssl is a WRITE scope but genuinely required — the
        // connector's caption/transcript sync fails with 403 without it (see
        // supabase/functions/connector-sync/providers/youtube/client.ts).
        // `openid` was dropped: nothing reads the id_token, and userinfo.email /
        // userinfo.profile already cover the name and email the auth function
        // stores. Fewer scopes, smaller consent screen, simpler verification.
        const scopes = [
            "https://www.googleapis.com/auth/youtube.readonly",
            "https://www.googleapis.com/auth/yt-analytics.readonly",
            "https://www.googleapis.com/auth/youtube.force-ssl",
            "https://www.googleapis.com/auth/userinfo.profile",
            "https://www.googleapis.com/auth/userinfo.email",
        ].join(" ")

        // `state` used to be `projectId:…__visitor:…` — predictable, and the
        // callback never checked it, so anyone could hand a signed-in user a
        // forged callback URL and attach their own Google account to a project.
        // It's now an unguessable nonce that the callback must match against
        // this tab's sessionStorage; the project/visitor ids ride along there
        // instead of in the URL.
        //
        // PKCE goes in the same envelope: a browser-initiated flow can't set an
        // httpOnly cookie, so the verifier lives in sessionStorage (per-tab,
        // same-origin only, gone when the tab closes) and only its SHA-256 hash
        // is sent to Google.
        const randomUrlSafe = (bytes: number) => {
            const buf = new Uint8Array(bytes)
            crypto.getRandomValues(buf)
            return btoa(String.fromCharCode(...buf)).replace(/\+/g, "-").replace(/\//g, "_").replace(/=+$/, "")
        }

        const state = randomUrlSafe(16)
        const codeVerifier = randomUrlSafe(32)
        const digest = await crypto.subtle.digest("SHA-256", new TextEncoder().encode(codeVerifier))
        const codeChallenge = btoa(String.fromCharCode(...new Uint8Array(digest)))
            .replace(/\+/g, "-").replace(/\//g, "_").replace(/=+$/, "")

        sessionStorage.setItem(
            `yt_oauth_${state}`,
            JSON.stringify({ codeVerifier, projectId, visitorId: visitorId || null })
        )

        const authUrl = new URL("https://accounts.google.com/o/oauth2/v2/auth")
        authUrl.searchParams.append("client_id", clientId!)
        authUrl.searchParams.append("redirect_uri", redirectUri)
        authUrl.searchParams.append("response_type", "code")
        authUrl.searchParams.append("scope", scopes)
        authUrl.searchParams.append("state", state)
        authUrl.searchParams.append("access_type", "offline")
        authUrl.searchParams.append("prompt", "consent") // Required to always get a refresh token
        // Keeps previously-granted scopes attached when we ask for more later,
        // which is what Google's "incremental authorization" check looks for.
        authUrl.searchParams.append("include_granted_scopes", "true")
        authUrl.searchParams.append("code_challenge", codeChallenge)
        authUrl.searchParams.append("code_challenge_method", "S256")

        window.location.href = authUrl.toString()
    }

    return (
        <Button
            variant={variant}
            size={size}
            disabled={disabled}
            className={`flex items-center gap-2 bg-[#FF0000] hover:bg-[#CC0000] text-white border-none ${className}`}
            onClick={handleLogin}
        >
            <MonitorPlay className="w-4 h-4" />
            {label}
        </Button>
    )
}
