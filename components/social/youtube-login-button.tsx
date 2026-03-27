"use client"

import React from "react"
import { Button } from "@/components/ui/button"
import { MonitorPlay } from "lucide-react"

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
    const handleLogin = () => {
        if (!projectId) {
            alert("Please select a project first.")
            return
        }
        
        const clientId = process.env.NEXT_PUBLIC_GOOGLE_CLIENT_ID
        const redirectUri = typeof window !== "undefined" && window.location.origin.includes("localhost")
            ? "http://localhost:3000/youtube/callback"
            : "https://agency.innergcomplete.com/youtube/callback"

        // Scopes for YouTube Readonly + Analytics + OpenID
        const scopes = [
            "https://www.googleapis.com/auth/youtube.readonly",
            "https://www.googleapis.com/auth/yt-analytics.readonly",
            "https://www.googleapis.com/auth/youtube.force-ssl",
            "https://www.googleapis.com/auth/userinfo.profile",
            "https://www.googleapis.com/auth/userinfo.email",
            "openid"
        ].join(" ")

        const state = `projectId:${projectId}__visitor:${visitorId || "none"}`
        
        const authUrl = new URL("https://accounts.google.com/o/oauth2/v2/auth")
        authUrl.searchParams.append("client_id", clientId!)
        authUrl.searchParams.append("redirect_uri", redirectUri)
        authUrl.searchParams.append("response_type", "code")
        authUrl.searchParams.append("scope", scopes)
        authUrl.searchParams.append("state", state)
        authUrl.searchParams.append("access_type", "offline")
        authUrl.searchParams.append("prompt", "consent") // Required to always get a refresh token

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
