"use client"

import { useEffect, useState, Suspense } from "react"
import { useRouter, useSearchParams } from "next/navigation"
import { Loader2, CheckCircle2, XCircle, Instagram } from "lucide-react"
import { createBrowserClient, supabaseAnonKey } from "@/lib/supabase/browser"

/**
 * Instagram OAuth Callback Page
 * Handles the redirect from Meta/Instagram (Facebook Login for Business).
 */
function InstagramCallbackContent() {
    const router = useRouter()
    const searchParams = useSearchParams()
    const [status, setStatus] = useState<"processing" | "success" | "error">("processing")
    const [message, setMessage] = useState("Connecting your Meta/Facebook login...")

    useEffect(() => {
        const handleCallback = async () => {
            const code = searchParams.get("code")
            const state = searchParams.get("state") // State should contain the redirect context (project slug/id)
            const error = searchParams.get("error")

            if (error) {
                setStatus("error")
                setMessage(`Authorization failed: ${searchParams.get("error_description") || error}`)
                return
            }

            if (!code) {
                setStatus("error")
                setMessage("Missing authorization code from Facebook.")
                return
            }

            if (!state) {
                setStatus("error")
                setMessage("Project context missing. Please return to your dashboard and try connecting again.")
                return
            }

            try {
                const supabase = createBrowserClient()
                const { data: { session } } = await supabase.auth.getSession()

                if (!session) {
                    setStatus("error")
                    setMessage("Authentication session lost. Please log in again.")
                    return
                }

                // Determine current redirect URI (must match what was sent to Meta)
                const currentRedirectUri = window.location.origin + window.location.pathname

                // Detect whether this is an Instagram-native OAuth flow.
                // The Instagram button embeds '__instagram' in the state param.
                // This tells the edge function to use INSTAGRAM_APP_ID/SECRET for the
                // token exchange instead of META_APP_ID/SECRET — they are different apps
                // and using the wrong client_id causes Meta to return a "redirect_uri
                // mismatch" error (Meta bundles both mismatches into the same message).
                const isInstagramFlow = state?.includes("__instagram") ?? false

                console.log(`[Instagram Callback] isInstagramFlow: ${isInstagramFlow}, redirectUri: ${currentRedirectUri}`)

                // 1. Call our Edge Function to exchange the code for a long-lived access token
                // We pass the code, the state, the redirectUri, and the isInstagram flag
                const { data: response, error: functionError } = await supabase.functions.invoke("complete-meta-auth", {
                    body: { 
                        code, 
                        state, 
                        redirectUri: currentRedirectUri,
                        isInstagram: isInstagramFlow
                    }
                })

                if (functionError) {
                    throw new Error(functionError?.message || "Failed to exchange token.")
                }

                // Handle the Project's standard okResponse wrapping { data: payload, error: null }
                const data = response?.data || response

                // If data is null but no functionError, the function succeeded but
                // the browser couldn't read the response body (CORS on response).
                // The connection IS saved in the database — proceed as success.
                const success = data?.success ?? true

                if (!success) {
                    throw new Error(data?.error || data?.message || "Failed to exchange token.")
                }

                setStatus("success")
                setMessage(data?.message || "Meta/Facebook account successfully connected!")

                
                // 2. Redirect back to connectors after a short delay
                setTimeout(() => {
                    router.push(`/admin/connectors`)
                }, 2000)

            } catch (err: any) {
                console.error("[Instagram Callback] Error:", err)
                setStatus("error")
                setMessage(err.message || "An unexpected error occurred while connecting Instagram.")
            }
        }

        handleCallback()
    }, [router, searchParams])

    return (
        <div className="max-w-md w-full glass-panel border border-border rounded-3xl p-8 text-center animate-in fade-in zoom-in duration-300">
            <div className="flex justify-center mb-6">
                <div className="h-16 w-16 rounded-2xl bg-gradient-to-tr from-yellow-400 via-red-500 to-purple-600 flex items-center justify-center shadow-lg">
                    <Instagram className="h-10 w-10 text-white" />
                </div>
            </div>

            <h1 className="text-xl font-bold text-foreground mb-4">
                {status === "processing" ? "Completing Connection" : status === "success" ? "All Set!" : "Connection Failed"}
            </h1>

            <div className="flex flex-col items-center gap-4">
                {status === "processing" && (
                    <>
                        <Loader2 className="h-8 w-8 animate-spin text-primary" />
                        <p className="text-sm text-muted-foreground">{message}</p>
                    </>
                )}

                {status === "success" && (
                    <>
                        <CheckCircle2 className="h-8 w-8 text-emerald-500" />
                        <p className="text-sm text-emerald-400 font-medium">{message}</p>
                        <p className="text-xs text-muted-foreground mt-2">Redirecting you back to your dashboard...</p>
                    </>
                )}

                {status === "error" && (
                    <>
                        <XCircle className="h-8 w-8 text-red-500" />
                        <p className="text-sm text-red-400 font-medium">{message}</p>
                        <button 
                            onClick={() => router.push("/admin/connectors")}
                            className="mt-4 px-6 py-2 bg-secondary/50 hover:bg-secondary rounded-xl text-xs font-bold text-foreground"
                        >
                            Back to Connectors
                        </button>
                    </>
                )}
            </div>
        </div>
    )
}

export default function InstagramCallbackPage() {
    return (
        <div className="min-h-screen bg-background flex items-center justify-center p-6">
            <Suspense fallback={
                <div className="max-w-md w-full glass-panel border border-border rounded-3xl p-12 flex flex-col items-center gap-4">
                    <Loader2 className="h-8 w-8 animate-spin text-primary" />
                    <p className="text-sm text-muted-foreground font-medium uppercase tracking-widest">Waking up Meta SDK...</p>
                </div>
            }>
                <InstagramCallbackContent />
            </Suspense>
        </div>
    )
}
