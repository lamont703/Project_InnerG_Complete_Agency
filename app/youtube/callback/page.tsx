"use client"

import React, { useEffect, useState, Suspense } from "react"
import { useRouter, useSearchParams } from "next/navigation"
import { createBrowserClient } from "@/lib/supabase/browser"
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Loader2, CheckCircle2, XCircle, Home, MonitorPlay } from "lucide-react"

const YouTubeCallbackContent = () => {
    const searchParams = useSearchParams()
    const router = useRouter()
    const [status, setStatus] = useState<"loading" | "success" | "error">("loading")
    const [message, setMessage] = useState("Authenticating with Google...")
    const [details, setDetails] = useState<any>(null)

    useEffect(() => {
        const handleCallback = async () => {
            const code = searchParams.get("code")
            const state = searchParams.get("state")
            const error = searchParams.get("error")

            if (error) {
                setStatus("error")
                setMessage(`YouTube access denied: ${error}`)
                return
            }

            if (!code || !state) {
                setStatus("error")
                setMessage("Missing authorization code or state from Google.")
                return
            }

            try {
                const supabase = createBrowserClient()
                
                // Call our complete-youtube-auth Edge Function
                const { data: response, error: fnError } = await supabase.functions.invoke("complete-youtube-auth", {
                    body: { 
                        code, 
                        state,
                        redirectUri: window.location.origin + "/youtube/callback"
                    }
                })

                if (fnError) throw fnError

                // Handle the Project's standard okResponse wrapping { data: payload, error: null }
                const data = response?.data || response

                if (data && data.success) {
                    setStatus("success")
                    setMessage(data.message || `Successfully connected your YouTube account!`)
                    setDetails(data)
                    
                    // Redirect back to connectors after 3 seconds
                    setTimeout(() => router.push("/admin/connectors"), 3000)
                } else {
                    const errMsg = data?.message || "Failed to complete YouTube authentication."
                    throw new Error(errMsg)
                }
            } catch (err: any) {
                console.error("YouTube OAuth Error Profile:", err)
                setStatus("error")
                
                // Extract more descriptive error if available
                const displayMessage = err.message || "An unexpected error occurred during YouTube connection."
                setMessage(displayMessage)
            }
        }

        handleCallback()
    }, [searchParams, router])

    return (
        <div className="min-h-screen flex items-center justify-center bg-background p-4">
            <Card className="w-full max-w-md shadow-2xl border-primary/20">
                <CardHeader className="text-center">
                    <div className="flex justify-center mb-4">
                        <div className={`p-4 rounded-full ${
                            status === "loading" ? "bg-primary/10" : 
                            status === "success" ? "bg-green-500/10" : "bg-destructive/10"
                        }`}>
                            {status === "loading" && <Loader2 className="w-10 h-10 text-primary animate-spin" />}
                            {status === "success" && <CheckCircle2 className="w-10 h-10 text-green-500" />}
                            {status === "error" && <XCircle className="w-10 h-10 text-destructive" />}
                        </div>
                    </div>
                    <CardTitle className="text-2xl font-bold tracking-tight">
                        {status === "loading" ? "Connecting YouTube" : 
                         status === "success" ? "Connection Successful!" : "Connection Failed"}
                    </CardTitle>
                    <CardDescription className="text-base mt-2">
                        {message}
                    </CardDescription>
                </CardHeader>
                
                <CardContent className="space-y-6 pt-2">
                    {status === "success" && details && (
                        <div className="bg-muted p-4 rounded-lg flex items-center gap-4">
                            <MonitorPlay className="w-8 h-8 text-primary" />
                            <div>
                                <p className="font-semibold text-foreground">{details.name}</p>
                                <p className="text-sm text-muted-foreground">{details.email}</p>
                            </div>
                        </div>
                    )}

                    <div className="flex flex-col gap-3">
                        {status === "error" ? (
                            <Button onClick={() => router.push("/admin/connectors")} className="w-full">
                                Return to Connectors
                            </Button>
                        ) : status === "success" ? (
                            <Button variant="outline" onClick={() => router.push("/admin/connectors")} className="w-full">
                                Return to Connectors
                            </Button>
                        ) : (
                            <Button variant="ghost" disabled className="w-full">
                                Please wait...
                            </Button>
                        )}
                        <Button variant="secondary" onClick={() => router.push("/")} className="w-full flex items-center gap-2">
                            <Home className="w-4 h-4" /> Go Home
                        </Button>
                    </div>
                </CardContent>
            </Card>
        </div>
    )
}

const YouTubeCallbackPage = () => {
    return (
        <Suspense fallback={
            <div className="min-h-screen flex items-center justify-center bg-background">
                <Loader2 className="w-10 h-10 text-primary animate-spin" />
            </div>
        }>
            <YouTubeCallbackContent />
        </Suspense>
    )
}

export default YouTubeCallbackPage
