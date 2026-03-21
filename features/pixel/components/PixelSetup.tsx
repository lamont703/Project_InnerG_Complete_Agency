"use client"

import React, { useState, useEffect } from "react"
import { 
    ShieldCheck, 
    Copy, 
    Check, 
    Terminal, 
    ExternalLink,
    AlertCircle,
    CheckCircle2,
    Activity
} from "lucide-react"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { createBrowserClient } from "@/lib/supabase/browser"
import { formatDistanceToNow } from "date-fns"

interface PixelSetupProps {
    projectId: string
    projectName: string
    isAgency?: boolean
}

export function PixelSetup({ projectId, projectName, isAgency = false }: PixelSetupProps) {
    const [copied, setCopied] = useState(false)
    const [lastHit, setLastHit] = useState<Date | null>(null)
    const [isLoading, setIsLoading] = useState(true)
    const supabase = createBrowserClient()

    const pixelCode = `<!-- Inner G Complete Agency Pixel -->
<script 
  src="https://senkwhdxgtypcrtoggyf.supabase.co/storage/v1/object/public/pixel/inner-g-pixel.js" 
  data-client-id="${projectId}"
  async
></script>
<!-- End Inner G Complete Agency Pixel -->`

    const handleCopy = () => {
        navigator.clipboard.writeText(pixelCode)
        setCopied(true)
        setTimeout(() => setCopied(false), 2000)
    }

    useEffect(() => {
        const fetchLastHit = async () => {
            const { data } = await supabase
                .from("pixel_events")
                .select("created_at")
                .eq("project_id", projectId)
                .order("created_at", { ascending: false })
                .limit(1)
                .maybeSingle() as any

            if (data?.created_at) {
                setLastHit(new Date(data.created_at))
            }
            setIsLoading(false)
        }

        fetchLastHit()

        // Real-time subscription
        const channel = supabase
            .channel(`pixel-status-${projectId}`)
            .on(
                "postgres_changes",
                {
                    event: "INSERT",
                    schema: "public",
                    table: "pixel_events",
                    filter: `project_id=eq.${projectId}`
                },
                (payload: any) => {
                    setLastHit(new Date(payload.new.created_at))
                }
            )
            .subscribe()

        return () => {
            supabase.removeChannel(channel)
        }
    }, [projectId, supabase])

    return (
        <div className="space-y-6 max-w-4xl mx-auto p-4 lg:p-8">
            <div className="space-y-2">
                <div className="flex items-center gap-2">
                    <ShieldCheck className="h-6 w-6 text-primary" />
                    <h1 className="text-3xl font-bold tracking-tight">
                        {isAgency ? "Agency Tracking Pixel" : "Web Tracking Setup"}
                    </h1>
                </div>
                <p className="text-muted-foreground text-lg">
                    Connect {projectName} to the Inner G Agentic Operating System to begin stitching data metrics.
                </p>
            </div>

            <div className="grid gap-6">
                <Card className="glass-panel border-border/50 overflow-hidden">
                    <CardHeader className="bg-primary/5 border-b border-border/50">
                        <div className="flex items-center justify-between">
                            <div className="space-y-1">
                                <CardTitle className="text-xl">Your Unique Pixel</CardTitle>
                                <CardDescription>
                                    Copy and paste this code into the <code className="bg-secondary px-1 py-0.5 rounded text-xs">&lt;head&gt;</code> of your website.
                                </CardDescription>
                            </div>
                            <Badge variant="outline" className="bg-background/50 backdrop-blur-sm px-3 py-1 border-primary/20 text-primary">
                                {projectId}
                            </Badge>
                        </div>
                    </CardHeader>
                    <CardContent className="p-0">
                        <div className="relative group">
                            <pre className="p-6 bg-[#0d1117] text-[#e6edf3] font-mono text-sm overflow-x-auto leading-relaxed min-h-[160px]">
                                {pixelCode}
                            </pre>
                            <Button
                                size="sm"
                                variant="secondary"
                                className="absolute top-4 right-4 gap-2 bg-background/80 hover:bg-background border-border"
                                onClick={handleCopy}
                            >
                                {copied ? (
                                    <>
                                        <Check className="h-4 w-4 text-green-500" />
                                        <span>Copied!</span>
                                    </>
                                ) : (
                                    <>
                                        <Copy className="h-4 w-4" />
                                        <span>Copy Script</span>
                                    </>
                                )}
                            </Button>
                        </div>
                    </CardContent>
                </Card>

                <div className="grid md:grid-cols-2 gap-6">
                    <Card className="glass-panel border-border/50">
                        <CardHeader>
                            <CardTitle className="text-lg flex items-center gap-2">
                                <Terminal className="h-5 w-5 text-primary" />
                                Developer Installation
                            </CardTitle>
                        </CardHeader>
                        <CardContent className="space-y-4">
                            <div className="flex gap-3">
                                <div className="h-6 w-6 rounded-full bg-primary/10 text-primary flex items-center justify-center text-xs font-bold shrink-0">1</div>
                                <div className="space-y-1">
                                    <p className="text-sm font-medium">Where to Place</p>
                                    <p className="text-xs text-muted-foreground">
                                        Paste the snippet at the very bottom of your <code className="bg-secondary px-1 rounded">&lt;head&gt;</code> section, just before the closing <code className="bg-secondary px-1 rounded">&lt;/head&gt;</code> tag.
                                    </p>
                                </div>
                            </div>
                            <div className="flex gap-3">
                                <div className="h-6 w-6 rounded-full bg-primary/10 text-primary flex items-center justify-center text-xs font-bold shrink-0">2</div>
                                <div className="space-y-1">
                                    <p className="text-sm font-medium">Automatic Tracking</p>
                                    <p className="text-xs text-muted-foreground">
                                        Once installed, the pixel immediately starts tracking page views, sessions, and visitor origins without further configuration.
                                    </p>
                                </div>
                            </div>
                            <div className="pt-2 border-t border-border/50">
                                <p className="text-[10px] text-muted-foreground uppercase font-bold tracking-wider mb-2">Supported Platforms</p>
                                <div className="flex flex-wrap gap-2 opacity-70">
                                    <Badge variant="secondary" className="text-[9px]">Shopify</Badge>
                                    <Badge variant="secondary" className="text-[9px]">Webflow</Badge>
                                    <Badge variant="secondary" className="text-[9px]">WordPress</Badge>
                                    <Badge variant="secondary" className="text-[9px]">React/Next.js</Badge>
                                    <Badge variant="secondary" className="text-[9px]">HTML</Badge>
                                </div>
                            </div>
                        </CardContent>
                    </Card>

                    <Card className="glass-panel border-border/50">
                        <CardHeader>
                            <CardTitle className="text-lg flex items-center gap-2">
                                <Activity className={`h-5 w-5 ${lastHit ? "text-green-500 animate-pulse" : "text-primary"}`} />
                                Live Status
                            </CardTitle>
                        </CardHeader>
                        <CardContent className="space-y-4">
                            <div className={`flex items-center justify-between p-3 rounded-lg border border-border/50 ${lastHit ? "bg-green-500/10 border-green-500/20" : "bg-secondary/30"}`}>
                                <div className="flex items-center gap-2">
                                    <div className={`h-2 w-2 rounded-full ${lastHit ? "bg-green-500" : "bg-yellow-500 animate-pulse"}`} />
                                    <span className="text-sm font-medium">
                                        {lastHit ? "Receiving Data" : "Waiting for Ping..."}
                                    </span>
                                </div>
                                <Badge variant={lastHit ? "default" : "secondary"} className={`text-[10px] uppercase ${lastHit ? "bg-green-600 hover:bg-green-600" : ""}`}>
                                    {lastHit ? "Active" : "Inactive"}
                                </Badge>
                            </div>
                            
                            {lastHit && (
                                <p className="text-sm text-center font-medium text-green-600/80 animate-in fade-in slide-in-from-bottom-1">
                                    Last hit received {formatDistanceToNow(lastHit, { addSuffix: true })}
                                </p>
                            )}

                            <p className="text-xs text-muted-foreground italic leading-relaxed">
                                {lastHit 
                                    ? "Your Agentic Operating System is currently processing real-time visitor data from this project."
                                    : "Once installed correctly, the status above will turn green as soon as a user visits any page on your site."
                                }
                            </p>
                        </CardContent>
                    </Card>
                </div>

                <Card className="glass-panel border-border/50">
                    <CardHeader>
                        <CardTitle className="text-lg flex items-center gap-2">
                            <CheckCircle2 className="h-5 w-5 text-primary" />
                            Identity Stitching (Advanced)
                        </CardTitle>
                        <CardDescription>
                            Link website visitors to known users by calling the identify function during login or checkout.
                        </CardDescription>
                    </CardHeader>
                    <CardContent>
                        <div className="relative group">
                            <pre className="p-4 bg-[#0d1117] text-[#e6edf3] font-mono text-xs overflow-x-auto rounded-lg border border-border/50">
{`// Call this whenever a user identifies themselves (e.g. logs in)
window.innerG.identify("user@email.com", {
  name: "John Doe",
  plan: "premium"
});`}
                            </pre>
                            <Button
                                size="icon"
                                variant="ghost"
                                className="absolute top-2 right-2 h-7 w-7 opacity-0 group-hover:opacity-100 transition-opacity"
                                onClick={() => {
                                    navigator.clipboard.writeText(`window.innerG.identify("user@email.com", { name: "John Doe", plan: "premium" });`)
                                    setCopied(true)
                                    setTimeout(() => setCopied(false), 2000)
                                }}
                            >
                                {copied ? <Check className="h-3 w-3 text-green-500" /> : <Copy className="h-3 w-3" />}
                            </Button>
                        </div>
                    </CardContent>
                </Card>

                <div className="p-4 rounded-xl bg-primary/5 border border-primary/10 flex gap-4 items-start">
                    <AlertCircle className="h-5 w-5 text-primary mt-0.5" />
                    <div className="space-y-1">
                        <p className="text-sm font-semibold text-primary">Data Privacy & Ethics</p>
                        <p className="text-sm text-muted-foreground leading-relaxed">
                            The Inner G Pixel is a first-party tracking solution designed for the Agentic Operating System. All data collected is stored securely in your private database and used for smarter automation, attribution, and customer intelligence.
                        </p>
                    </div>
                </div>
            </div>
        </div>
    )
}
