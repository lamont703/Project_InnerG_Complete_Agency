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
    Activity,
    Loader2
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
    onSync?: () => Promise<void>
    isSyncing?: boolean
}

export function PixelSetup({ projectId, projectName, isAgency = false, onSync, isSyncing = false }: PixelSetupProps) {
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
        <div className="space-y-6 max-w-4xl mx-auto p-4 md:p-6 lg:p-8">
            <div className="space-y-2">
                <div className="flex items-center gap-3">
                    <ShieldCheck className="h-6 w-6 sm:h-8 sm:w-8 text-primary shrink-0" />
                    <h1 className="text-2xl sm:text-3xl font-black tracking-tight leading-tight">
                        {isAgency ? "Agency Tracking Pixel" : "Web Tracking Setup"}
                    </h1>
                </div>
                <p className="text-muted-foreground text-base sm:text-lg leading-relaxed">
                    Connect <span className="text-foreground font-semibold">{projectName}</span> to the Inner G Agentic Operating System to begin stitching data metrics.
                </p>
            </div>

            <div className="grid gap-6">
                <Card className="glass-panel border-border/50 overflow-hidden shadow-2xl shadow-primary/5">
                    <CardHeader className="bg-primary/5 border-b border-border/50 p-4 sm:p-6">
                        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                            <div className="space-y-1">
                                <CardTitle className="text-lg sm:text-xl font-bold">Your Unique Pixel</CardTitle>
                                <CardDescription className="text-xs sm:text-sm">
                                    Copy and paste this code into the <code className="bg-secondary px-1 py-0.5 rounded text-[10px] sm:text-xs">&lt;head&gt;</code> of your website.
                                </CardDescription>
                            </div>
                            <Badge variant="outline" className="bg-background/50 backdrop-blur-sm px-3 py-1 border-primary/20 text-primary font-mono text-[10px] sm:text-xs w-fit">
                                {projectId}
                            </Badge>
                        </div>
                    </CardHeader>
                    <CardContent className="p-0">
                        <div className="relative group">
                            <pre className="p-4 sm:p-6 bg-[#0d1117] text-[#e6edf3] font-mono text-[11px] sm:text-sm overflow-x-auto leading-relaxed min-h-[140px] scrollbar-hide">
                                {pixelCode}
                            </pre>
                            <Button
                                size="sm"
                                variant="secondary"
                                className="absolute top-2 right-2 sm:top-4 sm:right-4 gap-2 bg-background/80 hover:bg-background border-border text-[10px] sm:text-xs h-7 sm:h-9"
                                onClick={handleCopy}
                            >
                                {copied ? (
                                    <>
                                        <Check className="h-3 w-3 sm:h-4 sm:w-4 text-green-500" />
                                        <span>Copied!</span>
                                    </>
                                ) : (
                                    <>
                                        <Copy className="h-3 w-3 sm:h-4 sm:w-4" />
                                        <span>Copy Script</span>
                                    </>
                                )}
                            </Button>
                        </div>
                    </CardContent>
                </Card>

                <div className="grid lg:grid-cols-2 gap-6">
                    <Card className="glass-panel border-border/50">
                        <CardHeader className="pb-2">
                            <CardTitle className="text-base sm:text-lg flex items-center gap-2">
                                <Terminal className="h-5 w-5 text-primary" />
                                Developer Installation
                            </CardTitle>
                        </CardHeader>
                        <CardContent className="space-y-6">
                            <div className="flex gap-4">
                                <div className="h-6 w-6 rounded-full bg-primary/10 text-primary flex items-center justify-center text-[10px] font-bold shrink-0 mt-0.5">1</div>
                                <div className="space-y-1">
                                    <p className="text-sm font-bold">Where to Place</p>
                                    <p className="text-xs text-muted-foreground leading-relaxed">
                                        Paste the snippet at the very bottom of your <code className="bg-secondary px-1 rounded text-[10px]">&lt;head&gt;</code> section, just before the closing <code className="bg-secondary px-1 rounded text-[10px]">&lt;/head&gt;</code> tag.
                                    </p>
                                </div>
                            </div>
                            <div className="flex gap-4">
                                <div className="h-6 w-6 rounded-full bg-primary/10 text-primary flex items-center justify-center text-[10px] font-bold shrink-0 mt-0.5">2</div>
                                <div className="space-y-1">
                                    <p className="text-sm font-bold">Automatic Tracking</p>
                                    <p className="text-xs text-muted-foreground leading-relaxed">
                                        Once installed, the pixel immediately starts tracking page views, sessions, and visitor origins without further configuration.
                                    </p>
                                </div>
                            </div>
                            <div className="pt-4 border-t border-border/50">
                                <p className="text-[10px] text-muted-foreground uppercase font-black tracking-widest mb-3">Supported Platforms</p>
                                <div className="flex flex-wrap gap-2">
                                    {["Shopify", "Webflow", "WordPress", "Next.js", "HTML"].map(p => (
                                        <Badge key={p} variant="secondary" className="text-[9px] px-2 py-0 font-bold bg-secondary/50 border-border/50">{p}</Badge>
                                    ))}
                                </div>
                            </div>
                        </CardContent>
                    </Card>

                    <Card className="glass-panel border-border/50 border-t-2 border-t-primary/20">
                        <CardHeader className="pb-2">
                            <CardTitle className="text-base sm:text-lg flex items-center gap-2">
                                <Activity className={`h-5 w-5 ${lastHit ? "text-green-500 animate-pulse" : "text-primary"}`} />
                                Live Engine Status
                            </CardTitle>
                        </CardHeader>
                        <CardContent className="space-y-6">
                            <div className={`flex flex-col sm:flex-row sm:items-center justify-between p-4 rounded-2xl border border-border/50 gap-4 ${lastHit ? "bg-green-500/5 border-green-500/10" : "bg-secondary/10"}`}>
                                <div className="flex items-center gap-3">
                                    <div className="relative">
                                        <div className={`h-3 w-3 rounded-full ${lastHit ? "bg-green-500 shadow-[0_0_12px_rgba(34,197,94,0.5)]" : "bg-yellow-500 animate-pulse shadow-[0_0_12px_rgba(234,179,8,0.5)]"}`} />
                                        {lastHit && <div className="absolute inset-0 h-3 w-3 rounded-full bg-green-500 animate-ping opacity-75" />}
                                    </div>
                                    <span className="text-sm font-black uppercase tracking-widest text-foreground/80">
                                        {lastHit ? "Link Established" : "Signal Wait..."}
                                    </span>
                                </div>
                                <div className="flex items-center gap-2 justify-end">
                                    <Button 
                                        variant="outline" 
                                        size="icon" 
                                        className="h-8 w-8 rounded-xl border-border bg-background/50 backdrop-blur hover:bg-background"
                                        onClick={async () => {
                                            setIsLoading(true);
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
                                            setIsLoading(false);
                                        }}
                                        disabled={isLoading}
                                    >
                                        <Activity className={`h-4 w-4 ${isLoading ? "animate-spin" : ""}`} />
                                    </Button>
                                    <Badge variant={lastHit ? "default" : "secondary"} className={`text-[10px] px-3 py-1 font-black ${lastHit ? "bg-green-600 shadow-lg shadow-green-600/20" : ""}`}>
                                        {lastHit ? "ACTIVE" : "STANDBY"}
                                    </Badge>
                                </div>
                            </div>
                            
                            {lastHit && (
                                <div className="text-center p-2 rounded-xl bg-green-500/10 border border-green-500/20 animate-in fade-in slide-in-from-bottom-2 duration-700">
                                    <p className="text-[10px] sm:text-xs font-bold text-green-600 uppercase tracking-widest">
                                        Data Port Responsive • Last Activity {formatDistanceToNow(lastHit, { addSuffix: true })}
                                    </p>
                                </div>
                            )}

                            <div className="space-y-4">
                                <p className="text-[11px] text-muted-foreground italic leading-relaxed text-center px-4">
                                    {lastHit 
                                        ? "Neural bridges are active. Intelligence data is being synthesized into your agency grid in real-time."
                                        : "Protocol initialized. Awaiting source signal... The status will engage as soon as the first visit is detected."
                                    }
                                </p>
                                <Button 
                                    className="w-full h-10 text-[10px] font-black uppercase tracking-[0.2em] shadow-xl shadow-primary/10 border-b-2 border-black/20"
                                    onClick={onSync || (() => window.location.reload())}
                                    disabled={isSyncing}
                                >
                                    {isSyncing ? (
                                        <>
                                            <Loader2 className="h-3 w-3 animate-spin mr-3" />
                                            Synchronizing Port...
                                        </>
                                    ) : (
                                        "Sync to Dashboard Hub"
                                    )}
                                </Button>
                            </div>
                        </CardContent>
                    </Card>
                </div>

                <Card className="glass-panel border-border/50">
                    <CardHeader className="p-4 sm:p-6">
                        <CardTitle className="text-base sm:text-lg flex items-center gap-2 font-bold uppercase tracking-widest text-primary/80">
                            <CheckCircle2 className="h-5 w-5" />
                            Identity Stitching (Advanced)
                        </CardTitle>
                        <CardDescription className="text-xs sm:text-sm">
                            Link website visitors to known users by calling the identify function during login or checkout to unify their social profiles.
                        </CardDescription>
                    </CardHeader>
                    <CardContent className="px-4 pb-4 sm:px-6 sm:pb-6">
                        <div className="relative group">
                            <pre className="p-3 sm:p-5 bg-[#0d1117] text-[#e6edf3] font-mono text-[10px] sm:text-xs overflow-x-auto rounded-2xl border border-border/50 scrollbar-hide">
{`// Call this whenever a user identifies themselves
window.innerG.identify("user@email.com", {
  name: "John Doe",
  plan: "premium"
});`}
                            </pre>
                            <Button
                                size="icon"
                                variant="ghost"
                                className="absolute top-2 right-2 h-7 w-7 opacity-0 group-hover:opacity-100 transition-opacity bg-background/50 backdrop-blur rounded-lg"
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

                <div className="p-4 sm:p-6 rounded-3xl bg-primary/5 border border-primary/10 flex flex-col sm:flex-row gap-4 items-center sm:items-start text-center sm:text-left transition-all hover:bg-primary/[0.07]">
                    <AlertCircle className="h-6 w-6 text-primary shrink-0" />
                    <div className="space-y-2">
                        <p className="text-xs font-black uppercase tracking-[0.2em] text-primary">Data Privacy & Intelligence Ethics</p>
                        <p className="text-[11px] sm:text-xs text-muted-foreground leading-relaxed max-w-2xl">
                            The Inner G Pixel is a proprietary first-party tracking solution. All data collected is stored securely in your private database and used exclusively for smarter automation, attribution, and customer intelligence.
                        </p>
                    </div>
                </div>
            </div>
        </div>
    )
}
