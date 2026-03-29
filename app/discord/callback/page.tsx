"use client"

import { useEffect, useState, Suspense } from "react"
import { useRouter, useSearchParams } from "next/navigation"
import { Loader2, CheckCircle2, XCircle, MessageSquare } from "lucide-react"
import { createBrowserClient } from "@/lib/supabase/browser"

/**
 * Discord OAuth Callback Page
 * Finalizes the link between the Agency Project and the Discord Server.
 */
function DiscordCallbackContent() {
    const router = useRouter()
    const searchParams = useSearchParams()
    const [status, setStatus] = useState<"processing" | "success" | "error">("processing")
    const [message, setMessage] = useState("Establishing Neural Bridge with Discord...")

    useEffect(() => {
        const handleCallback = async () => {
            const code = searchParams.get("code")
            const state = searchParams.get("state") // State contains the Project ID
            const guildId = searchParams.get("guild_id")
            const error = searchParams.get("error")

            if (error) {
                setStatus("error")
                setMessage(`Authorization failed: ${searchParams.get("error_description") || error}`)
                return
            }

            if (!code) {
                setStatus("error")
                setMessage("Missing authorization code from Discord.")
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

                // Determine current redirect URI (must match what was sent to Discord)
                const currentRedirectUri = window.location.origin + window.location.pathname

                console.log(`[Discord Callback] Provisioning Bridge: ${guildId}, redirectUri: ${currentRedirectUri}`)

                // 1. Call our Edge Function to exchange the code for bot credentials
                const { data: response, error: functionError } = await (supabase.functions.invoke as any)("complete-discord-auth", {
                    body: { 
                        code, 
                        state, 
                        redirect_uri: currentRedirectUri 
                    },
                    headers: {
                        Authorization: `Bearer ${session.access_token}`
                    }
                })

                if (functionError) {
                    throw new Error(functionError?.message || "Failed to finalize Discord handshake.")
                }

                // Handle standardized okResponse wrapping
                const data = response?.data || response
                
                if (data?.error) {
                    throw new Error(data.error)
                }

                setStatus("success")
                setMessage(`Neural Bridge stabilized! Successfully linked to ${data?.guild_name || 'Discord server'}.`)

                // 2. Redirect back to community dashboard
                setTimeout(() => {
                    const slug = data?.project_slug
                    if (slug) {
                        router.push(`/dashboard/${slug}/community`)
                    } else {
                        router.push(`/dashboard`)
                    }
                }, 2500)

            } catch (err: any) {
                console.error("[Discord Callback] Error:", err)
                setStatus("error")
                setMessage(err.message || "An unexpected error occurred while linking Discord.")
            }
        }

        handleCallback()
    }, [router, searchParams])

    return (
        <div className="max-w-md w-full glass-panel border border-border rounded-3xl p-8 text-center animate-in fade-in zoom-in duration-300">
            <div className="flex justify-center mb-6">
                <div className="h-16 w-16 rounded-2xl bg-indigo-500/10 border border-indigo-500/20 flex items-center justify-center shadow-lg shadow-indigo-500/10">
                    <MessageSquare className="h-10 w-10 text-indigo-400" />
                </div>
            </div>

            <h1 className="text-xl font-bold text-foreground mb-4">
                {status === "processing" ? "Stabilizing Neural Bridge" : status === "success" ? "Connection Established" : "Bridge Failed"}
            </h1>

            <div className="flex flex-col items-center gap-4">
                {status === "processing" && (
                    <>
                        <Loader2 className="h-8 w-8 animate-spin text-primary" />
                        <p className="text-sm text-muted-foreground italic uppercase tracking-widest text-[10px] font-bold">{message}</p>
                    </>
                )}

                {status === "success" && (
                    <>
                        <CheckCircle2 className="h-8 w-8 text-emerald-500" />
                        <p className="text-sm text-emerald-400 font-medium italic">{message}</p>
                        <p className="text-[10px] text-muted-foreground mt-2 uppercase font-black tracking-[0.2em] animate-pulse">Redirecting to Dashboard...</p>
                    </>
                )}

                {status === "error" && (
                    <>
                        <XCircle className="h-8 w-8 text-red-500" />
                        <p className="text-sm text-red-400 font-medium">{message}</p>
                        <button 
                            onClick={() => router.push("/dashboard")}
                            className="mt-4 px-6 py-2 bg-secondary/50 hover:bg-secondary rounded-xl text-[10px] font-bold text-foreground uppercase tracking-widest"
                        >
                            Return to Hub
                        </button>
                    </>
                )}
            </div>
        </div>
    )
}

export default function DiscordCallbackPage() {
    return (
        <div className="min-h-screen bg-background flex items-center justify-center p-6 bg-[radial-gradient(circle_at_center,_var(--tw-gradient-stops))] from-indigo-500/5 via-transparent to-transparent">
            <Suspense fallback={
                <div className="max-w-md w-full glass-panel border border-border rounded-3xl p-12 flex flex-col items-center gap-4">
                    <Loader2 className="h-8 w-8 animate-spin text-primary" />
                    <p className="text-[10px] text-muted-foreground font-black uppercase tracking-widest">Waking up Neural Bridge...</p>
                </div>
            }>
                <DiscordCallbackContent />
            </Suspense>
        </div>
    )
}
