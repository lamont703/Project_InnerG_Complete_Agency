"use client"

import { useEffect, useState, Suspense } from "react"
import { useRouter, useSearchParams } from "next/navigation"
import { Loader2, CheckCircle2, XCircle, Linkedin } from "lucide-react"
import { createBrowserClient } from "@/lib/supabase/browser"

function LinkedInCallbackContent() {
    const router = useRouter()
    const searchParams = useSearchParams()
    const [status, setStatus] = useState<"processing" | "success" | "error">("processing")
    const [message, setMessage] = useState("Connecting your LinkedIn account...")

    useEffect(() => {
        const handleCallback = async () => {
            const code = searchParams.get("code")
            const state = searchParams.get("state")
            const error = searchParams.get("error")

            if (error) {
                setStatus("error")
                setMessage(`LinkedIn Authorization failed: ${searchParams.get("error_description") || error}`)
                return
            }

            if (!code) {
                setStatus("error")
                setMessage("Missing authorization code from LinkedIn.")
                return
            }

            if (!state) {
                setStatus("error")
                setMessage("Project context missing. Please return and try connecting again.")
                return
            }

            try {
                const supabase = createBrowserClient()
                const { data: { session } } = await supabase.auth.getSession()

                if (!session) {
                    setStatus("error")
                    setMessage("Session lost. Please log in again.")
                    return
                }

                // Retrieve security context
                const storedRedirectUri = sessionStorage.getItem("linkedin_redirect_uri")
                const currentRedirectUri = storedRedirectUri || (window.location.origin + "/linkedin/callback")

                // 1. Call our Edge Function to complete the LinkedIn auth
                const { data: responseBody, error: functionError } = await supabase.functions.invoke("complete-linkedin-auth", {
                    body: { 
                        code, 
                        state, 
                        redirectUri: currentRedirectUri 
                    }
                })

                console.log("[LinkedIn Callback] invoke response body →", responseBody)

                if (functionError) {
                    throw new Error(functionError.message || "Failed to exchange LinkedIn token.")
                }

                // Handle standardized response format { data: { success, ... }, error }
                const data = responseBody?.data || responseBody
                const success = data?.success || (!functionError && responseBody?.data)

                if (!success) {
                    const errorMsg = data?.error?.message || data?.error || responseBody?.error?.message || "Failed to exchange LinkedIn token."
                    throw new Error(errorMsg)
                }

                setStatus("success")
                setMessage(data?.message || `LinkedIn account connected!`)

                // 2. Redirect back
                setTimeout(() => {
                    router.push(`/admin/connectors`)
                }, 2000)

            } catch (err: any) {
                console.error("[LinkedIn Callback] Error:", err)
                setStatus("error")
                setMessage(err.message || "An unexpected error occurred while connecting LinkedIn.")
            }
        }

        handleCallback()
    }, [router, searchParams])

    return (
        <div className="max-w-md w-full glass-panel border border-border rounded-3xl p-8 text-center animate-in fade-in zoom-in duration-300 bg-card/40 backdrop-blur-xl">
            <div className="flex justify-center mb-6">
                <div className="h-16 w-16 rounded-2xl bg-blue-600 flex items-center justify-center shadow-lg border border-white/10 relative overflow-hidden group">
                    <Linkedin className="h-10 w-10 text-white relative z-10 fill-white" />
                    <div className="absolute inset-0 bg-gradient-to-tr from-blue-400/20 to-blue-900/20 opacity-40" />
                </div>
            </div>

            <h1 className="text-xl font-bold text-foreground mb-4">
                {status === "processing" ? "Syncing LinkedIn Bridge" : status === "success" ? "All Set!" : "Connection Failed"}
            </h1>

            <div className="flex flex-col items-center gap-4">
                {status === "processing" && (
                    <>
                        <Loader2 className="h-8 w-8 animate-spin text-blue-500" />
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
                            Return to Connectors
                        </button>
                    </>
                )}
            </div>
        </div>
    )
}

export default function LinkedInCallbackPage() {
    return (
        <div className="min-h-screen bg-background flex items-center justify-center p-6 relative">
             <div className="absolute top-0 left-0 w-full h-full bg-[radial-gradient(circle_at_center,_var(--tw-gradient-stops))] from-blue-500/5 via-background to-background pointer-events-none" />
            <Suspense fallback={
                <div className="max-w-md w-full glass-panel border border-border rounded-3xl p-12 flex flex-col items-center gap-4">
                    <Loader2 className="h-8 w-8 animate-spin text-blue-500" />
                    <p className="text-sm text-muted-foreground font-black uppercase tracking-widest text-center">Waking up LinkedIn Bridge...</p>
                </div>
            }>
                <LinkedInCallbackContent />
            </Suspense>
        </div>
    )
}
