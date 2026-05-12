"use client"

import Script from "next/script"
import { useEffect, useState, createContext, useContext, useCallback } from "react"

interface FacebookLoginStatus {
    status: 'connected' | 'not_authorized' | 'unknown' | 'loading'
    authResponse?: {
        accessToken: string
        expiresIn: string
        signedRequest: string
        userID: string
    }
}

interface FacebookContextType {
    status: FacebookLoginStatus
    login: (scopes?: string[]) => Promise<FacebookLoginStatus>
    logout: () => void
    refreshStatus: () => void
}

const FacebookContext = createContext<FacebookContextType | undefined>(undefined)

export function useFacebook() {
    const context = useContext(FacebookContext)
    if (!context) {
        throw new Error("useFacebook must be used within a FacebookProvider or after FacebookSDK is mounted.")
    }
    return context
}

export function FacebookSDK({ children }: { children?: React.ReactNode }) {
    const appId = process.env.NEXT_PUBLIC_META_APP_ID || "929507499941848"
    const [loginStatus, setLoginStatus] = useState<FacebookLoginStatus>({ status: 'loading' })

    const refreshStatus = useCallback(() => {
        // @ts-ignore
        if (typeof FB !== 'undefined') {
            // Guard: FB Login requires HTTPS (strict protocol check to avoid SDK errors on http localhost)
            const isSecure = window.location.protocol === 'https:';
            
            if (!isSecure) {
                if (window.location.hostname === 'localhost' || window.location.hostname === '127.0.0.1') {
                    // Just log a silent warning once
                    setLoginStatus({ status: 'unknown' });
                    return;
                }
                console.warn("[Facebook SDK] FB.getLoginStatus requires HTTPS. Bypassing check.");
                setLoginStatus({ status: 'unknown' });
                return;
            }

            try {
                // @ts-ignore
                FB.getLoginStatus(function(response: any) {
                    console.log("[Facebook SDK] Status Updated:", response.status);
                    setLoginStatus({
                        status: response.status || 'unknown',
                        authResponse: response.authResponse
                    });
                });
            } catch (err) {
                console.error("[Facebook SDK] Error fetching login status:", err);
                setLoginStatus({ status: 'unknown' });
            }
        }
    }, [])

    useEffect(() => {
        // @ts-ignore
        window.fbAsyncInit = function() {
            // Guard: Strict HTTPS Requirement for Facebook SDK
            const isSecure = window.location.protocol === 'https:';
            if (!isSecure) {
                console.warn("[Facebook SDK] HTTPS required for SDK initialization. Pausing FB.init...");
                setLoginStatus({ status: 'unknown' });
                return;
            }

            // @ts-ignore
            FB.init({
                appId      : appId,
                cookie     : true,
                xfbml      : true,
                version    : 'v23.0'
            });

            // @ts-ignore
            FB.AppEvents.logPageView();

            // Define global callback for the Meta Login Button (onlogin="checkLoginState();")
            // @ts-ignore
            window.checkLoginState = function() {
                refreshStatus();
            };

            // Initial Login Status Check
            refreshStatus();
        };
    }, [appId, refreshStatus])

    const login = (scopes: string[] = ['public_profile', 'email']) => {
        return new Promise<FacebookLoginStatus>((resolve) => {
            // @ts-ignore
            FB.login((response: any) => {
                const newStatus: FacebookLoginStatus = {
                    status: response.status,
                    authResponse: response.authResponse
                };
                setLoginStatus(newStatus);
                resolve(newStatus);
            }, { scope: scopes.join(',') });
        });
    }

    const logout = () => {
        // @ts-ignore
        FB.logout(() => {
            setLoginStatus({ status: 'unknown' });
        });
    }

    return (
        <FacebookContext.Provider value={{ status: loginStatus, login, logout, refreshStatus }}>
            <Script
                id="facebook-jssdk"
                src="https://connect.facebook.net/en_US/sdk.js"
                strategy="afterInteractive"
            />
            {children}
        </FacebookContext.Provider>
    )
}
