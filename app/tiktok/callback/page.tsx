"use client"

import { useEffect, useState, Suspense } from "react"
import { useRouter, useSearchParams } from "next/navigation"
import { Loader2, CheckCircle2, XCircle, Music2 } from "lucide-react"
import { createBrowserClient } from "@/lib/supabase/browser"


function TikTokCallbackContent() {
    const router = useRouter()
    const searchParams = useSearchParams()
    const [status, setStatus] = useState<"processing" | "success" | "error">("processing")
    const [message, setMessage] = useState("Connecting your TikTok account...")

    useEffect(() => {
        const handleCallback = async () => {
            const code = searchParams.get("code")
            const state = searchParams.get("state")
            const error = searchParams.get("error")

            if (error) {
                setStatus("error")
                setMessage(`TikTok Authorization failed: ${searchParams.get("error_description") || error}`)
                return
            }

            if (!code) {
                setStatus("error")
                setMessage("Missing authorization code from TikTok.")
                return
            }

            if (!state) {
                setStatus("error")
                setMessage("Project context missing accurately. Please return to your dashboard and try connecting again.")
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

                // Determine current redirect URI.
                // We read it from sessionStorage where the login button saved it — this
                // guarantees an exact character-for-character match with what was sent
                // to TikTok during the auth dialog (ngrok URL, localhost, etc.)
                const storedRedirectUri = sessionStorage.getItem("tiktok_redirect_uri")
                const currentRedirectUri = storedRedirectUri || (window.location.origin + "/tiktok/callback")

                // Retrieve the code_verifier we saved before redirect
                const codeVerifier = sessionStorage.getItem("tiktok_code_verifier")

                if (!codeVerifier) {
                    setStatus("error")
                    setMessage("Security context (PKCE) lost. Please try connecting again.")
                    return
                }

                // 1. Call our Edge Function to complete the TikTok auth
                // NOTE: Do NOT pass Authorization/apikey here — supabase.functions.invoke
                // auto-injects the session credentials. Duplicating them causes a header
                // conflict that results in functionError with an empty message.
                const { data: response, error: functionError } = await supabase.functions.invoke("complete-tiktok-auth", {
                    body: { 
                        code, 
                        state, 
                        codeVerifier,
                        redirectUri: currentRedirectUri 
                    }
                })

                // Debug: log exactly what we got back so we can diagnose future issues
                console.log("[TikTok Callback] invoke result →", { response, functionError })
                
                // Handle the Project's standard okResponse wrapping { data: payload, error: null }
                const data = response?.data || response

                if (functionError) {
                    const errMsg = (data?.error || data?.message || functionError?.message) && 
                                  functionError.message !== "Edge Function returned a non-2xx status code"
                        ? (data?.error || data?.message || functionError.message)
                        : "Failed to exchange TikTok token."
                    throw new Error(errMsg)
                }

                if (data && !data.success) {
                    throw new Error(data?.error || data?.message || "Failed to exchange TikTok token.")
                }

                setStatus("success")
                setMessage(`TikTok account "${data?.display_name || 'Success'}" successfully connected!`)

                // 2. Redirect back to admin connectors after a short delay
                setTimeout(() => {
                    router.push(`/admin/connectors`)
                }, 2000)

            } catch (err: any) {
                console.error("[TikTok Callback] Error:", err)
                setStatus("error")
                setMessage(err.message || "An unexpected error occurred while connecting TikTok.")
            }
        }

        handleCallback()
    }, [router, searchParams])

    return (
        <div className="max-w-md w-full glass-panel border border-border rounded-3xl p-8 text-center animate-in fade-in zoom-in duration-300 bg-card/40 backdrop-blur-xl">
            <div className="flex justify-center mb-6">
                <div className="h-16 w-16 rounded-2xl bg-black flex items-center justify-center shadow-lg border border-white/10 relative overflow-hidden group">
                    <Music2 className="h-10 w-10 text-pink-500 relative z-10" />
                    <div className="absolute inset-0 bg-gradient-to-tr from-pink-500/20 to-cyan-500/20 opacity-40" />
                </div>
            </div>

            <h1 className="text-xl font-bold text-foreground mb-4">
                {status === "processing" ? "Syncing TikTok Bridge" : status === "success" ? "All Set!" : "Connection Failed"}
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
                        <p className="text-xs text-muted-foreground mt-2 font-bold tracking-tight">Redirecting you back...</p>
                    </>
                )}

                {status === "error" && (
                    <>
                        <XCircle className="h-8 w-8 text-red-500" />
                        <p className="text-sm text-red-400 font-medium">{message}</p>
                        <button 
                            onClick={() => router.push("/admin/connectors")}
                            className="mt-4 px-6 py-2 bg-secondary/50 hover:bg-secondary rounded-xl text-xs font-bold text-foreground transition-all"
                        >
                            Return to Bridges
                        </button>
                    </>
                )}
            </div>
        </div>
    )
}

export default function TikTokCallbackPage() {
    return (
        <div className="min-h-screen bg-background flex items-center justify-center p-6 relative">
             <div className="absolute top-0 left-0 w-full h-full bg-[radial-gradient(circle_at_center,_var(--tw-gradient-stops))] from-pink-500/5 via-background to-background pointer-events-none" />
            <Suspense fallback={
                <div className="max-w-md w-full glass-panel border border-border rounded-3xl p-12 flex flex-col items-center gap-4">
                    <Loader2 className="h-8 w-8 animate-spin text-primary" />
                    <p className="text-sm text-muted-foreground font-black uppercase tracking-widest">Waking up TikTok SDK...</p>
                </div>
            }>
                <TikTokCallbackContent />
            </Suspense>
        </div>
    )
}
