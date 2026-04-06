"use client"

import { useEffect, useState, Suspense } from "react"
import { useRouter, useSearchParams } from "next/navigation"
import { Loader2, CheckCircle2, XCircle, Database } from "lucide-react"
import { createBrowserClient } from "@/lib/supabase/browser"

function AlpacaCallbackContent() {
    const router = useRouter()
    const searchParams = useSearchParams()
    const [status, setStatus] = useState<"processing" | "success" | "error">("processing")
    const [message, setMessage] = useState("Establishing secure broker bridge...")

    useEffect(() => {
        const handleCallback = async () => {
            const code = searchParams.get("code")
            const state = searchParams.get("state")
            const error = searchParams.get("error")

            if (error) {
                setStatus("error")
                setMessage(`Alpaca Authorization failed: ${searchParams.get("error_description") || error}`)
                return
            }

            if (!code) {
                setStatus("error")
                setMessage("Missing authorization code from Alpaca.")
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

                // 1. Call our Edge Function to complete the Alpaca auth
                const { data: responseBody, error: functionError } = await supabase.functions.invoke("complete-alpaca-auth", {
                    body: { 
                        code, 
                        state, 
                        redirectUri: window.location.origin + "/alpaca/callback" 
                    }
                })

                if (functionError) {
                    throw new Error(functionError.message || "Failed to exchange Alpaca token.")
                }

                const data = responseBody?.data || responseBody
                if (!data?.success) {
                    throw new Error(data?.error || "Failed to finalize broker connection.")
                }

                setStatus("success")
                setMessage("Alpaca Brokerage successfully linked!")

                // 2. Redirect back
                setTimeout(() => {
                    router.push(`/admin/connectors`)
                }, 2000)

            } catch (err: any) {
                console.error("[Alpaca Callback] Error:", err)
                setStatus("error")
                setMessage(err.message || "An unexpected error occurred while connecting Alpaca.")
            }
        }

        handleCallback()
    }, [router, searchParams])

    return (
        <div className="max-w-md w-full glass-panel border border-border rounded-3xl p-8 text-center animate-in fade-in zoom-in duration-300 bg-card/40 backdrop-blur-xl">
            <div className="flex justify-center mb-6">
                <div className="h-16 w-16 rounded-2xl bg-cyan-500/10 flex items-center justify-center shadow-lg border border-cyan-500/20 relative overflow-hidden group">
                    <Database className="h-10 w-10 text-cyan-400 relative z-10" />
                    <div className="absolute inset-0 bg-gradient-to-tr from-cyan-500/20 to-cyan-900/20 opacity-40" />
                </div>
            </div>

            <h1 className="text-xl font-bold text-foreground mb-4 font-black uppercase tracking-tight">
                {status === "processing" ? "Securing Broker Bridge" : status === "success" ? "Neural Bridge Established" : "Connection Failed"}
            </h1>

            <div className="flex flex-col items-center gap-4">
                {status === "processing" && (
                    <>
                        <Loader2 className="h-8 w-8 animate-spin text-cyan-500" />
                        <p className="text-sm text-muted-foreground font-bold italic">{message}</p>
                    </>
                )}

                {status === "success" && (
                    <>
                        <CheckCircle2 className="h-8 w-8 text-emerald-500" />
                        <p className="text-sm text-emerald-400 font-black uppercase tracking-tight">{message}</p>
                        <p className="text-xs text-muted-foreground mt-2 font-bold tracking-tight">Redirecting to Intelligence Hub...</p>
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

export default function AlpacaCallbackPage() {
    return (
        <div className="min-h-screen bg-background flex items-center justify-center p-6 relative overflow-hidden">
             {/* Background ambient gradients */}
             <div className="absolute top-0 right-[10%] w-[600px] h-[600px] bg-cyan-500/20 rounded-full blur-[140px] opacity-20 animate-pulse pointer-events-none z-0" />
             <div className="absolute bottom-[20%] left-[-10%] w-[500px] h-[500px] bg-primary/20 rounded-full blur-[120px] opacity-10 pointer-events-none z-0" />

            <Suspense fallback={
                <div className="max-w-md w-full glass-panel border border-border rounded-3xl p-12 flex flex-col items-center gap-4">
                    <Loader2 className="h-8 w-8 animate-spin text-cyan-500" />
                    <p className="text-sm text-muted-foreground font-black uppercase tracking-widest text-center">Synchronizing Alpaca Node...</p>
                </div>
            }>
                <AlpacaCallbackContent />
            </Suspense>
        </div>
    )
}
