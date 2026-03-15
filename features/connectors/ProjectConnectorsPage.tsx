"use client"

import { useState, useEffect } from "react"
import { useParams } from "next/navigation"
import {
    Loader2,
    Database,
    RefreshCcw,
    CheckCircle2,
    XCircle,
    Clock,
    Zap,
    Github,
    Youtube,
    Linkedin,
    BookOpen,
    Newspaper,
    Plug,
    Activity,
    Lock
} from "lucide-react"
import { createBrowserClient } from "@/lib/supabase/browser"
import { DashboardHeader } from "@/components/layout/dashboard/header"

// PROVIDER ICONS + COLORS (Synced with Admin)
const providerMeta: Record<string, { color: string; bgColor: string; label: string }> = {
    supabase: { color: "text-emerald-400", bgColor: "bg-emerald-500/10 border-emerald-500/20", label: "Supabase" },
    ghl: { color: "text-orange-400", bgColor: "bg-orange-500/10 border-orange-500/20", label: "GoHighLevel" },
    github: { color: "text-violet-400", bgColor: "bg-violet-500/10 border-violet-500/20", label: "GitHub" },
    postgres: { color: "text-blue-400", bgColor: "bg-blue-500/10 border-blue-500/20", label: "PostgreSQL" },
    mysql: { color: "text-cyan-400", bgColor: "bg-cyan-500/10 border-cyan-500/20", label: "MySQL" },
    youtube: { color: "text-red-500", bgColor: "bg-red-500/10 border-red-500/20", label: "YouTube" },
    linkedin: { color: "text-blue-500", bgColor: "bg-blue-600/10 border-blue-600/20", label: "LinkedIn" },
    notion: { color: "text-slate-200", bgColor: "bg-slate-500/10 border-slate-500/20", label: "Notion" },
    tiktok: { color: "text-pink-500", bgColor: "bg-pink-500/10 border-pink-500/20", label: "TikTok" },
    newsapi: { color: "text-amber-500", bgColor: "bg-amber-500/10 border-amber-500/20", label: "NewsAPI" },
}

const statusMeta: Record<string, { icon: any; color: string; label: string }> = {
    success: { icon: CheckCircle2, color: "text-emerald-400", label: "Healthy" },
    error: { icon: XCircle, color: "text-red-400", label: "Issue Detected" },
    syncing: { icon: RefreshCcw, color: "text-amber-400", label: "Syncing..." },
    pending: { icon: Clock, color: "text-muted-foreground", label: "Idle" },
}

function formatDate(dateStr: string | null): string {
    if (!dateStr) return "Never"
    const d = new Date(dateStr)
    return d.toLocaleString([], { 
        month: 'short', 
        day: 'numeric', 
        hour: '2-digit', 
        minute: '2-digit' 
    })
}

export function ProjectConnectorsPage() {
    const params = useParams()
    const slug = (params?.slug as string) ?? "innergcomplete"

    const [userData, setUserData] = useState<{ name: string; role: string } | null>(null)
    const [projectName, setProjectName] = useState("")
    const [connections, setConnections] = useState<any[]>([])
    const [isLoading, setIsLoading] = useState(true)

    const [currentTime, setCurrentTime] = useState(new Date())
    const [mounted, setMounted] = useState(false)
    const [isSidebarOpen, setIsSidebarOpen] = useState(false)

    useEffect(() => {
        setMounted(true)

        const fetchData = async () => {
            try {
                const supabase = createBrowserClient()

                // 1. Fetch User data
                const { data: { user } } = await supabase.auth.getUser()
                if (user) {
                    const { data: profile } = await supabase
                        .from("users")
                        .select("full_name, role")
                        .eq("id", user.id)
                        .maybeSingle() as any

                    const meta = user.user_metadata || {}
                    const name = profile?.full_name || meta.full_name || meta.name || meta.display_name || "User"
                    const role = profile?.role?.replace("_", " ").toUpperCase() || "CLIENT"

                    setUserData({ name, role })
                }

                // 2. Fetch Project Data
                const { data: project } = await supabase
                    .from("projects")
                    .select("id, name")
                    .eq("slug", slug)
                    .maybeSingle() as any

                if (project) {
                    setProjectName(project.name)

                    // 3. Fetch Connections
                    const { data: conns } = await supabase
                        .from("client_db_connections")
                        .select(`
                            *,
                            connector_types(id, name, provider)
                        `)
                        .eq("project_id", project.id)
                        .order("created_at", { ascending: false })

                    setConnections(conns || [])
                }

            } catch (err) {
                console.error("[ProjectConnectors] Error fetching data:", err)
            } finally {
                setIsLoading(false)
            }
        }

        fetchData()
        const timer = setInterval(() => setCurrentTime(new Date()), 1000)
        return () => clearInterval(timer)
    }, [slug])

    if (isLoading) {
        return (
            <div className="min-h-screen bg-background flex items-center justify-center">
                <Loader2 className="h-8 w-8 animate-spin text-primary" />
            </div>
        )
    }

    return (
        <div className="flex-1 flex flex-col min-h-0 h-full overflow-hidden relative">
            {/* Background ambient gradients */}
            <div className="absolute top-0 right-[10%] w-[600px] h-[600px] bg-primary/20 rounded-full blur-[140px] opacity-20 animate-pulse pointer-events-none z-0" />
            <div className="absolute bottom-[20%] left-[-10%] w-[500px] h-[500px] bg-accent/20 rounded-full blur-[120px] opacity-10 pointer-events-none z-0" />

            <DashboardHeader
                userName={userData?.name || "User"}
                userRole={userData?.role || "CLIENT"}
                currentTime={currentTime}
                mounted={mounted}
                onMenuOpen={() => setIsSidebarOpen(true)}
                projectName={projectName}
            />

            <div className="flex-1 overflow-y-auto p-6 md:p-10 relative z-10 w-full custom-scrollbar">
                <div className="max-w-7xl mx-auto w-full pb-20">
                    {/* Header Section */}
                    <div className="mb-12">
                        <div className="flex flex-col md:flex-row md:items-end justify-between gap-6 pb-6 border-b border-border">
                            <div>
                                <h1 className="text-2xl sm:text-3xl md:text-4xl font-black text-foreground tracking-tight flex items-center gap-3">
                                    Data <span className="text-primary font-light italic">& Sync Bridges</span>
                                </h1>
                                <p className="text-muted-foreground text-sm md:text-base mt-3 max-w-2xl leading-relaxed">
                                    View your active data integrations. These connections are managed by the agency to ensure real-time intelligence and secure automated synchronization.
                                </p>
                            </div>
                            <div className="flex items-center gap-2 px-4 py-2 rounded-xl bg-orange-500/10 border border-orange-500/20 text-orange-500 text-xs font-bold uppercase tracking-wider">
                                <Lock className="h-3.5 w-3.5" />
                                Managed by Agency
                            </div>
                        </div>
                    </div>

                    {/* Active Connections Grid */}
                    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                        {connections.length > 0 ? (
                            connections.map((conn) => {
                                const provider = conn.connector_types?.provider || conn.db_type
                                const meta = providerMeta[provider] || { color: "text-primary", bgColor: "bg-primary/10 border-primary/20", label: "Internal" }
                                const status = statusMeta[conn.sync_status] || statusMeta.pending
                                const StatusIcon = status.icon

                                return (
                                    <div
                                        key={conn.id}
                                        className="group p-6 rounded-3xl bg-card/40 backdrop-blur-xl border border-border hover:border-primary/30 transition-all duration-500 flex flex-col items-start relative overflow-hidden"
                                    >
                                        <div className={`absolute top-0 right-0 w-32 h-32 ${meta.bgColor} blur-[60px] opacity-20 -mr-16 -mt-16 pointer-events-none`} />
                                        
                                        <div className="flex items-start justify-between w-full mb-6">
                                            <div className={`h-12 w-12 rounded-2xl ${meta.bgColor} flex items-center justify-center border border-white/5`}>
                                                {provider === "github" ? (
                                                    <Github className={`h-6 w-6 ${meta.color}`} />
                                                ) : provider === "youtube" ? (
                                                    <Youtube className={`h-6 w-6 ${meta.color}`} />
                                                ) : provider === "linkedin" ? (
                                                    <Linkedin className={`h-6 w-6 ${meta.color}`} />
                                                ) : provider === "notion" ? (
                                                    <BookOpen className={`h-6 w-6 ${meta.color}`} />
                                                ) : provider === "newsapi" ? (
                                                    <Newspaper className={`h-6 w-6 ${meta.color}`} />
                                                ) : (
                                                    <Database className={`h-6 w-6 ${meta.color}`} />
                                                )}
                                            </div>
                                            <div className={`flex items-center gap-1.5 px-3 py-1 rounded-full bg-background/50 border border-border ${status.color}`}>
                                                <StatusIcon className={`h-3 w-3 ${conn.sync_status === 'syncing' ? 'animate-spin' : ''}`} />
                                                <span className="text-[10px] font-black uppercase tracking-widest">{status.label}</span>
                                            </div>
                                        </div>

                                        <h3 className="text-lg font-bold text-foreground mb-1 group-hover:text-primary transition-colors">{conn.label}</h3>
                                        <p className="text-xs text-muted-foreground font-medium mb-6">{meta.label} Protocol Integration</p>

                                        <div className="w-full space-y-3 pt-6 border-t border-border/50">
                                            <div className="flex items-center justify-between text-[11px]">
                                                <span className="text-muted-foreground uppercase tracking-widest font-bold">Frequency</span>
                                                <span className="text-foreground font-bold">{conn.sync_schedule || "Real-time"}</span>
                                            </div>
                                            <div className="flex items-center justify-between text-[11px]">
                                                <span className="text-muted-foreground uppercase tracking-widest font-bold">Last Pulse</span>
                                                <span className="text-foreground font-bold">{formatDate(conn.last_synced_at)}</span>
                                            </div>
                                        </div>

                                        <div className="mt-8 flex items-center gap-2 text-primary opacity-0 group-hover:opacity-100 transition-opacity duration-500">
                                            <span className="text-[10px] font-black uppercase tracking-widest">Active Connection</span>
                                            <Activity className="h-3 w-3 animate-pulse" />
                                        </div>
                                    </div>
                                )
                            })
                        ) : (
                            <div className="col-span-full py-20 flex flex-col items-center justify-center bg-muted/5 rounded-3xl border border-dashed border-border">
                                <Plug className="h-12 w-12 text-muted-foreground/20 mb-4" />
                                <h3 className="font-bold text-foreground">No Bridges Configured</h3>
                                <p className="text-sm text-muted-foreground mt-1 max-w-xs text-center">Your account manager has not yet linked any external data pipelines to this portal.</p>
                            </div>
                        )}
                    </div>

                    {/* Info Footer */}
                    <div className="mt-20 p-8 rounded-3xl bg-primary/5 border border-primary/10 flex flex-col md:flex-row items-center gap-8">
                        <div className="h-16 w-16 rounded-2xl bg-primary/20 flex items-center justify-center shrink-0 border border-primary/30">
                            <Zap className="h-8 w-8 text-primary shadow-[0_0_15px_rgba(var(--primary),0.5)]" />
                        </div>
                        <div>
                            <h4 className="text-lg font-black text-foreground tracking-tight">Need to connect a new data source?</h4>
                            <p className="text-muted-foreground text-sm mt-1 leading-relaxed">
                                To maintain security and data integrity, all connectors must be validated and configured by our agency engineering team. Contact your account manager to request a new bridge.
                            </p>
                        </div>
                    </div>
                </div>
            </div>
        </div>
    )
}
