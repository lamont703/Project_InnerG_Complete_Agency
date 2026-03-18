"use client"

import { useEffect, useState } from "react"
import { useFacebook } from "@/components/providers/facebook-sdk"

interface MetaLoginButtonProps {
    configId?: string
    scopes?: string[]
    size?: 'small' | 'medium' | 'large'
    buttonText?: string
}

/**
 * MetaLoginButton
 * Renders the official Meta (Facebook) Login Button using the FB.XFBML.parse() method.
 * It is pre-configured to automatically call the global checkLoginState() 
 * which updates our centralized useFacebook() status.
 */
export function MetaLoginButton({
    configId,
    projectId,
    scopes = ['public_profile', 'email', 'instagram_basic', 'instagram_manage_insights', 'pages_show_list', 'pages_read_engagement'],
    size = 'medium',
    buttonText = 'Connect with Facebook',
    useRedirect = true
}: MetaLoginButtonProps & { projectId?: string, useRedirect?: boolean }) {
    const { status } = useFacebook()
    const appId = process.env.NEXT_PUBLIC_META_APP_ID || "929507499941848"
    
    // Determine redirect URI dynamically based on current origin
    const [redirectUri, setRedirectUri] = useState("https://agency.innergcomplete.com/instagram/callback")

    useEffect(() => {
        if (typeof window !== 'undefined') {
            const currentOrigin = window.location.origin
            const safeOrigin = currentOrigin.replace(/\/$/, "") // Strip trailing slash
            const forcedHttpsOrigin = safeOrigin.replace("http://", "https://")
            setRedirectUri(`${forcedHttpsOrigin}/instagram/callback`)
        }
    }, [])

    const oauthUrl = configId 
        ? `https://www.facebook.com/v23.0/dialog/oauth?client_id=${appId}&redirect_uri=${encodeURIComponent(redirectUri)}&state=${projectId || ""}&config_id=${configId}`
        : `https://www.facebook.com/v23.0/dialog/oauth?client_id=${appId}&redirect_uri=${encodeURIComponent(redirectUri)}&state=${projectId || ""}&scope=${encodeURIComponent(scopes.join(','))}`

    useEffect(() => {
        // @ts-ignore
        if (typeof FB !== 'undefined' && !useRedirect) {
            // @ts-ignore
            FB.XFBML.parse();
        }
    }, [status, useRedirect])

    if (useRedirect) {
        return (
            <a 
                href={oauthUrl}
                className={`flex items-center justify-center gap-2 font-bold transition-all px-6 py-3 rounded-xl bg-[#1877F2] hover:bg-[#166fe5] text-white shadow-lg shadow-blue-500/20 active:scale-95`}
            >
                <svg viewBox="0 0 24 24" fill="currentColor" className="w-5 h-5">
                    <path d="M24 12.073c0-6.627-5.373-12-12-12s-12 5.373-12 12c0 5.99 4.388 10.954 10.125 11.854v-8.385H7.078v-3.47h3.047V9.43c0-3.007 1.792-4.669 4.533-4.669 1.312 0 2.686.235 2.686.235v2.953H15.83c-1.491 0-1.956.925-1.956 1.874v2.25h3.328l-.532 3.47h-2.796v8.385C19.612 23.027 24 18.062 24 12.073z"/>
                </svg>
                <span className="text-sm">{buttonText}</span>
            </a>
        )
    }

    return (
        <div className="flex flex-col items-center gap-3">
             <div 
                // The official Facebook SDK tag
                className="fb-login-button" 
                data-width=""
                data-size={size}
                data-button-type="continue_with"
                data-layout="default"
                data-auto-logout-link="false"
                data-use-continue-as="true"
                // This string must match the window.checkLoginState function we defined in FacebookSDK.tsx
                data-onlogin="checkLoginState();"
                data-scope={scopes.join(',')}
                {...(configId ? { "data-config_id": configId } : {})}
            ></div>
            
            {status.status === 'connected' && (
                <p className="text-[10px] text-emerald-500 font-bold uppercase tracking-widest mt-2">
                    ✓ Connected
                </p>
            )}
        </div>
    )
}
