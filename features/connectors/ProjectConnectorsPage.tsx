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
    Lock,
    Plus,
    ChevronDown,
    ChevronUp,
    Eye,
    EyeOff,
    Save,
    Trash2,
    Edit2,
    Instagram,
    Facebook,
    Twitter,
} from "lucide-react"
import { createBrowserClient, supabaseAnonKey } from "@/lib/supabase/browser"
import { DashboardHeader } from "@/components/layout/dashboard/header"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { MetaLoginButton } from "@/components/social/meta-login-button"
import { TikTokLoginButton } from "@/components/social/tiktok-login-button"
import { InstagramLoginButton } from "@/components/social/instagram-login-button"
import { TwitterLoginButton } from "@/components/social/twitter-login-button"
import { LinkedInLoginButton } from "@/components/social/linkedin-login-button"
import { YouTubeLoginButton } from "@/components/social/youtube-login-button"
import { AlpacaLoginButton } from "@/components/social/alpaca-login-button"

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
    instagram: { color: "text-white", bgColor: "bg-gradient-to-tr from-[#f09433] via-[#e6683c] to-[#bc1888] border-pink-500/20", label: "Instagram" },
    facebook: { color: "text-blue-500", bgColor: "bg-blue-600/10 border-blue-600/20", label: "Facebook Meta" },
    twitter: { color: "text-zinc-100", bgColor: "bg-zinc-800 border-zinc-700/50", label: "X (Twitter)" },
    alpaca: { color: "text-cyan-400", bgColor: "bg-cyan-500/10 border-cyan-500/20", label: "Alpaca Broker" },
    alpaca_keys: { color: "text-cyan-200", bgColor: "bg-cyan-600/10 border-cyan-600/20", label: "Alpaca (Manual API Keys)" },
}

const statusMeta: Record<string, { icon: any; color: string; label: string }> = {
    success: { icon: CheckCircle2, color: "text-emerald-400", label: "Connected" },
    error: { icon: XCircle, color: "text-red-400", label: "Error" },
    syncing: { icon: RefreshCcw, color: "text-amber-400", label: "Syncing..." },
    pending: { icon: Clock, color: "text-muted-foreground", label: "Pending" },
}

function formatDate(dateStr: string | null): string {
    if (!dateStr) return "Never"
    const d = new Date(dateStr)
    const now = new Date()
    const diffMs = now.getTime() - d.getTime()
    const diffMins = Math.floor(diffMs / 60000)
    if (diffMins < 1) return "Just now"
    if (diffMins < 60) return `${diffMins}m ago`
    const diffHrs = Math.floor(diffMins / 60)
    if (diffHrs < 24) return `${diffHrs}h ago`
    return d.toLocaleDateString("en-US", { month: "short", day: "numeric" })
}

export function ProjectConnectorsPage() {
    const params = useParams()
    const slug = (params?.slug as string) ?? "innergcomplete"

    const [userData, setUserData] = useState<{ name: string; role: string; id: string } | null>(null)
    const [projectName, setProjectName] = useState("")
    const [projectId, setProjectId] = useState<string | null>(null)
    const [connections, setConnections] = useState<any[]>([])
    const [connectorTypes, setConnectorTypes] = useState<any[]>([])
    const [isLoading, setIsLoading] = useState(true)

    const [currentTime, setCurrentTime] = useState(new Date())
    const [mounted, setMounted] = useState(false)
    const [isSidebarOpen, setIsSidebarOpen] = useState(false)

    // Management State
    const [showNewForm, setShowNewForm] = useState(false)
    const [expandedId, setExpandedId] = useState<string | null>(null)
    const [syncingId, setSyncingId] = useState<string | null>(null)

    // New Connection Form
    const [newLabel, setNewLabel] = useState("")
    const [newType, setNewType] = useState("")
    const [newConfig, setNewConfig] = useState<Record<string, any>>({})
    const [isCreating, setIsCreating] = useState(false)
    const [showSensitive, setShowSensitive] = useState<Record<string, boolean>>({})

    // Edit Config
    const [editingConfigId, setEditingConfigId] = useState<string | null>(null)
    const [editConfig, setEditConfig] = useState<Record<string, any>>({})
    const [isUpdating, setIsUpdating] = useState(false)

    // Discovery State
    const [fetchedRepos, setFetchedRepos] = useState<string[]>([])
    const [isFetchingRepos, setIsFetchingRepos] = useState(false)
    const [availableTables, setAvailableTables] = useState<string[]>([])
    const [isDiscoveringTables, setIsDiscoveringTables] = useState(false)

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

                    setUserData({ name, role, id: user.id })
                }

                // 2. Fetch Project Data
                const { data: project } = await supabase
                    .from("projects")
                    .select("id, name")
                    .eq("slug", slug)
                    .maybeSingle() as any

                if (project) {
                    setProjectName(project.name)
                    setProjectId(project.id)

                    // 3. Fetch Connections & Types
                    const [connsRes, typesRes] = await Promise.all([
                        supabase
                            .from("client_db_connections")
                            .select(`
                                *,
                                connector_types(id, name, provider, config_schema)
                            `)
                            .eq("project_id", project.id)
                            .order("created_at", { ascending: false }),
                        supabase
                             .from("connector_types")
                             .select("*")
                             .eq("is_active", true)
                             .order("name")
                    ])

                    setConnections(connsRes.data || [])
                    setConnectorTypes(typesRes.data || [])
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

    // ─────────────────────────────────────────────
    // MANAGEMENT ACTIONS
    // ─────────────────────────────────────────────

    const reloadConnections = async () => {
        if (!projectId) return
        const supabase = createBrowserClient()
        const { data } = await supabase
            .from("client_db_connections")
            .select(`
                *,
                connector_types(id, name, provider, config_schema)
            `)
            .eq("project_id", projectId)
            .order("created_at", { ascending: false })
        setConnections(data || [])
    }

    const handleSync = async (connectionId: string) => {
        setSyncingId(connectionId)
        try {
            const supabase = createBrowserClient()
            const { data: { session } } = await supabase.auth.getSession()
            if (!session) return

            const conn = connections.find(c => c.id === connectionId)
            const provider = conn?.connector_types?.provider || conn?.db_type

            const syncPromises = [
                supabase.functions.invoke("connector-sync", {
                    body: { connection_id: connectionId },
                    headers: {
                        Authorization: `Bearer ${session.access_token}`,
                        apikey: supabaseAnonKey,
                    },
                })
            ]

            if (provider === "ghl") {
                syncPromises.push(
                    supabase.functions.invoke("ghl-social-sync", {
                        body: { connection_id: connectionId },
                        headers: {
                            Authorization: `Bearer ${session.access_token}`,
                            apikey: supabaseAnonKey,
                        },
                    })
                )
            }

            await Promise.all(syncPromises)
            await reloadConnections()
        } catch (err) {
            console.error("[ProjectConnectors] Sync failed:", err)
        } finally {
            setSyncingId(null)
        }
    }

    const handleCreateConnection = async () => {
        if (!newLabel || !newType || !projectId) return
        setIsCreating(true)

        try {
            const supabase = createBrowserClient() as any
            const selectedType = connectorTypes.find(t => t.id === newType)

            const { error } = await supabase.from("client_db_connections").insert({
                label: newLabel,
                project_id: projectId,
                connector_type_id: newType,
                db_type: selectedType?.provider || "supabase",
                connection_url_encrypted: "configured-via-sync-config",
                sync_config: newConfig,
                is_active: true,
                sync_status: "pending",
            })

            if (error) {
                console.error("[ProjectConnectors] Create error:", error)
            } else {
                setShowNewForm(false)
                setNewLabel("")
                setNewType("")
                setNewConfig({})
                setFetchedRepos([])
                await reloadConnections()
            }
        } catch (err) {
            console.error("[ProjectConnectors] Create failed:", err)
        } finally {
            setIsCreating(false)
        }
    }

    const handleFetchRepos = async () => {
        const token = newConfig.github_token
        if (!token) return
        setIsFetchingRepos(true)
        try {
            const res = await fetch("https://api.github.com/user/repos?per_page=100&sort=updated", {
                headers: { "Authorization": `token ${token}` }
            })
            if (!res.ok) throw new Error("Failed to fetch repos")
            const data = await res.json()
            setFetchedRepos(data.map((r: any) => r.full_name))
        } catch (err) {
            console.error("[ProjectConnectors] Fetch repos failed:", err)
            alert("Failed to fetch repositories. Check your token permissions (repo scope required).")
        } finally {
            setIsFetchingRepos(false)
        }
    }

    const handleDiscoverSupabaseTables = async (isEdit = false) => {
        const config = isEdit ? editConfig : newConfig
        const url = config.supabase_url
        const key = config.supabase_service_role_key

        if (!url || !key) {
            alert("Please provide both Supabase URL and Service Role Key first.")
            return
        }

        setIsDiscoveringTables(true)
        try {
            const supabase = createBrowserClient()
            const { data, error } = await supabase.functions.invoke("discover-external-tables", {
                body: {
                    provider: "supabase",
                    config: { supabase_url: url, supabase_service_role_key: key }
                }
            })

            if (error) throw error
            const result = data?.data
            if (result && result.success) {
                setAvailableTables(result.tables)
            } else {
                throw new Error(result?.error || "Discovery failed")
            }
        } catch (err: any) {
            console.error("[ProjectConnectors] Discovery failed:", err)
            alert(`Failed to discover tables: ${err.message}`)
        } finally {
            setIsDiscoveringTables(false)
        }
    }

    const toggleTableSelection = (table: string, isEdit = false) => {
        if (isEdit) {
            const current = editConfig.tables_to_sync || []
            const next = current.includes(table)
                ? current.filter((t: string) => t !== table)
                : [...current, table]
            setEditConfig(prev => ({ ...prev, tables_to_sync: next }))
        } else {
            const current = newConfig.tables_to_sync || []
            const next = current.includes(table)
                ? current.filter((t: string) => t !== table)
                : [...current, table]
            setNewConfig(prev => ({ ...prev, tables_to_sync: next }))
        }
    }

    const handleDelete = async (connectionId: string) => {
        if (!confirm("Are you sure you want to delete this connection? All synced data and history will be permanently removed.")) return
        
        try {
            const supabase = createBrowserClient()
            const { error: deleteError } = await supabase
                .from("client_db_connections")
                .delete()
                .eq("id", connectionId)

            if (deleteError) throw deleteError
            await reloadConnections()
        } catch (err) {
            console.error("[ProjectConnectors] Delete failed:", err)
            alert("Failed to delete connection.")
        }
    }

    const handleUpdateConfig = async (connectionId: string) => {
        setIsUpdating(true)
        try {
            const supabase = createBrowserClient() as any
            const { error: updateError } = await supabase
                .from("client_db_connections")
                .update({ sync_config: editConfig })
                .eq("id", connectionId)
            
            if (updateError) throw updateError
            
            setEditingConfigId(null)
            await reloadConnections()
        } catch (err) {
            console.error("[ProjectConnectors] Update failed:", err)
            alert("Failed to update connection config.")
        } finally {
            setIsUpdating(false)
        }
    }

    const isAdmin = userData?.role === "CLIENT ADMIN" || userData?.role === "SUPER ADMIN" || userData?.role === "DEVELOPER"
    const selectedType = connectorTypes.find(t => t.id === newType)
    const selectedTypeSchema = selectedType?.config_schema

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
                <div className="max-w-5xl mx-auto w-full pb-24 lg:pb-10">
                    {/* Header Section */}
                    <div className="flex flex-col md:flex-row md:items-end justify-between gap-6 mb-12 pb-6 border-b border-border">
                        <div>
                            <h1 className="text-2xl sm:text-3xl md:text-4xl font-black text-foreground tracking-tight flex items-center gap-3">
                                Data <span className="text-primary font-light italic">& Sync Bridges</span>
                            </h1>
                            <p className="text-muted-foreground text-sm md:text-base mt-2 max-w-2xl leading-relaxed">
                                {isAdmin 
                                    ? "Manage your project's data integrations. Use these bridges to sync external signals, customer data, and analytics directly into your growth engine."
                                    : "View your active data integrations. These connections are managed by the agency to ensure real-time intelligence and secure automated synchronization."
                                }
                            </p>
                        </div>
                        <div className="flex flex-col md:flex-row items-center gap-4">
                            {isAdmin && (
                                <Button 
                                    onClick={() => setShowNewForm(!showNewForm)}
                                    className="bg-primary hover:bg-primary/90 text-primary-foreground gap-2 rounded-xl h-11 px-6 shadow-lg shadow-primary/20"
                                >
                                    {showNewForm ? (
                                        <>Cancel Setup</>
                                    ) : (
                                        <>
                                            <Plus className="h-4 w-4" />
                                            <span className="text-xs font-black uppercase tracking-widest">New Connection</span>
                                        </>
                                    )}
                                </Button>
                            )}
                            <div className="flex items-center gap-2 px-4 py-2 rounded-xl bg-orange-500/10 border border-orange-500/20 text-orange-500 text-[10px] font-bold uppercase tracking-wider">
                                <Lock className="h-3 w-3" />
                                {isAdmin ? "Admin Controls Enabled" : "Managed by Agency"}
                            </div>
                        </div>
                    </div>

                    {/* Setup Form */}
                    {showNewForm && (
                        <div className="mb-12 p-8 rounded-2xl bg-card/60 backdrop-blur-2xl border border-primary/20 shadow-2xl animate-in slide-in-from-top-4 duration-500">
                            <h3 className="text-sm font-bold text-foreground mb-5 flex items-center gap-2">
                                <Zap className="h-4 w-4 text-primary" />
                                New Connection
                            </h3>

                            <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mb-6">
                                <div>
                                    <label className="text-[10px] font-black uppercase tracking-widest text-muted-foreground mb-2 block">Connection Label</label>
                                    <Input 
                                        placeholder="e.g. Master CRM Sync"
                                        value={newLabel}
                                        onChange={(e) => setNewLabel(e.target.value)}
                                        className="bg-background/50 border-border focus:border-primary/50 h-11 rounded-xl"
                                    />
                                </div>
                                <div>
                                    <label className="text-[10px] font-black uppercase tracking-widest text-muted-foreground mb-2 block">Connector Type</label>
                                    <select 
                                        className="w-full bg-background/50 border border-border focus:border-primary/50 h-11 rounded-xl px-4 text-sm text-foreground outline-none"
                                        value={newType}
                                        onChange={(e) => {
                                            setNewType(e.target.value)
                                            setNewConfig({})
                                        }}
                                    >
                                        <option value="">Select a protocol...</option>
                                        {connectorTypes.map(t => (
                                            <option key={t.id} value={t.id}>{t.name}</option>
                                        ))}
                                    </select>
                                </div>
                            </div>

                            {selectedTypeSchema && (
                                <div className="space-y-4 mb-6 p-5 rounded-2xl bg-background/30 border border-border/50">
                                    <p className="text-[10px] font-black text-muted-foreground uppercase tracking-widest mb-2">Protocol Configuration</p>
                                    {selectedType?.provider?.toLowerCase() === "facebook" ? (
                                        <div className="py-6 flex flex-col items-center gap-4 bg-background/50 rounded-2xl border border-dashed border-border w-full">
                                            <p className="text-[10px] font-black text-muted-foreground uppercase tracking-widest text-center px-6">
                                                Meta uses Business Login for secure access to Pages and accounts.
                                            </p>
                                            <MetaLoginButton 
                                                size="large"
                                                projectId={projectId || ""}
                                                configId="1304420384838040"
                                            />
                                            <p className="text-[8px] text-muted-foreground italic">
                                                You will be redirected back here after authorizing via Facebook.
                                            </p>
                                        </div>
                                    ) : selectedType?.provider?.toLowerCase() === "instagram" ? (
                                        <div className="py-6 flex flex-col items-center gap-4 bg-background/50 rounded-2xl border border-dashed border-border w-full">
                                            <p className="text-[10px] font-black text-pink-500 uppercase tracking-widest text-center px-6">
                                                Connect your Instagram Business account directly.
                                            </p>
                                            <InstagramLoginButton 
                                                size="large"
                                                projectId={projectId || ""}
                                            />
                                            <p className="text-[8px] text-muted-foreground italic">
                                                Authorized via the native Instagram Login flow.
                                            </p>
                                        </div>
                                    ) : selectedType?.provider?.toLowerCase() === "tiktok" ? (
                                        <div className="py-6 flex flex-col items-center gap-4 bg-background/50 rounded-2xl border border-dashed border-border w-full">
                                            <p className="text-[10px] font-black text-pink-500 uppercase tracking-widest text-center px-6">
                                                Connect TikTok to sync your videos and content insights.
                                            </p>
                                            <TikTokLoginButton 
                                                projectId={projectId || ""}
                                            />
                                            <p className="text-[8px] text-muted-foreground italic">
                                                OAuth connection requires access to video.list and profile info.
                                            </p>
                                        </div>
                                    ) : selectedType?.provider?.toLowerCase() === "twitter" ? (
                                        <div className="py-6 flex flex-col items-center gap-4 bg-background/50 rounded-2xl border border-dashed border-border w-full">
                                            <p className="text-[10px] font-black text-zinc-400 uppercase tracking-widest text-center px-6">
                                                Connect X (Twitter) via OAuth 2.0 PKCE.
                                            </p>
                                            <TwitterLoginButton 
                                                projectId={projectId || ""}
                                            />
                                            <p className="text-[8px] text-muted-foreground italic">
                                                Includes access to follow counts and recent performance signals.
                                            </p>
                                        </div>
                                    ) : selectedType?.provider?.toLowerCase() === "linkedin" ? (
                                        <div className="py-6 flex flex-col items-center gap-4 bg-background/50 rounded-2xl border border-dashed border-border w-full">
                                            <p className="text-[10px] font-black text-blue-500 uppercase tracking-widest text-center px-6">
                                                Connect your LinkedIn Profile or Page via OAuth.
                                            </p>
                                            <LinkedInLoginButton 
                                                projectId={projectId || ""}
                                            />
                                            <p className="text-[8px] text-muted-foreground italic">
                                                Authorizes personal posts and organization page access.
                                            </p>
                                        </div>
                                    ) : selectedType?.provider?.toLowerCase() === "youtube" ? (
                                        <div className="py-6 flex flex-col items-center gap-4 bg-background/50 rounded-2xl border border-dashed border-border w-full">
                                            <p className="text-[10px] font-black text-red-500 uppercase tracking-widest text-center px-6">
                                                Connect your YouTube Channel via Google OAuth.
                                            </p>
                                            <YouTubeLoginButton 
                                                projectId={projectId || ""}
                                                disabled={!projectId}
                                            />
                                            {(!projectId || !newLabel) && (
                                                <p className="text-[10px] text-destructive font-bold animate-pulse">
                                                    Please enter a label for this channel connection to continue.
                                                </p>
                                            )}
                                            <p className="text-[8px] text-muted-foreground italic">
                                                Authorizes analytics and channel content discovery.
                                            </p>
                                        </div>
                                    ) : (selectedType?.provider?.toLowerCase() === "alpaca" || selectedType?.name === "Alpaca Brokerage") ? (
                                        <div className="py-6 flex flex-col items-center gap-4 bg-background/50 rounded-2xl border border-dashed border-border w-full">
                                            <p className="text-[10px] font-black text-cyan-400 uppercase tracking-widest text-center px-6">
                                                Connect Alpaca Brokerage for Automated Trading.
                                            </p>
                                            
                                            <div className="px-12 text-center flex flex-col gap-3">
                                                <p className="text-[9px] text-muted-foreground leading-relaxed">
                                                    <span className="font-bold text-foreground">Authorize Inner G Complete Agency App:</span> By allowing Inner G Complete Agency App to access your Alpaca account, you are granting access to your account information and authorization to place transactions in your account at your direction. Alpaca does not warrant or guarantee that Inner G Complete Agency App will work as advertised or expected.
                                                </p>
                                            </div>

                                            <AlpacaLoginButton 
                                                projectId={projectId || ""}
                                            />
                                            
                                            <p className="text-[8px] text-muted-foreground italic flex items-center gap-2">
                                                <Database size={10} />
                                                Authorizes accounts, trading, and real-time market data.
                                            </p>
                                        </div>
                                    ) : Object.entries(selectedTypeSchema.properties || selectedTypeSchema).map(([key, schema]: [string, any]) => {
                                        if (schema.type === "boolean") {
                                            return (
                                                <div key={key} className="flex items-center gap-3">
                                                    <input
                                                        type="checkbox"
                                                        id={`new-${key}`}
                                                        checked={newConfig[key] ?? schema.default ?? false}
                                                        onChange={(e) => setNewConfig(prev => ({ ...prev, [key]: e.target.checked }))}
                                                        className="h-4 w-4 rounded border-border bg-background focus:ring-primary h-4 w-4 rounded border-border"
                                                    />
                                                    <label htmlFor={`new-${key}`} className="text-[10px] font-bold text-muted-foreground uppercase cursor-pointer">
                                                        {schema.label || key.replace(/_/g, " ")}
                                                    </label>
                                                </div>
                                            )
                                        }

                                        return (
                                            <div key={key}>
                                                <label className="text-[10px] font-bold text-muted-foreground mb-1 block capitalize">
                                                    {schema.label || key.replace(/_/g, " ")}
                                                </label>
                                                
                                                <div className="relative">
                                                    {key === "repository" && selectedType?.provider === "github" && fetchedRepos.length > 0 ? (
                                                        <select
                                                            className="w-full bg-background/50 border border-border focus:border-primary/50 h-10 rounded-xl px-4 text-sm text-foreground outline-none"
                                                            value={newConfig[key] || ""}
                                                            onChange={(e) => setNewConfig(prev => ({ ...prev, [key]: e.target.value }))}
                                                        >
                                                            <option value="">Select a repository...</option>
                                                            {fetchedRepos.map(r => <option key={r} value={r}>{r}</option>)}
                                                        </select>
                                                    ) : (
                                                        <>
                                                            <Input 
                                                                type={schema.type === "password" || schema.sensitive ? (!showSensitive[key] ? "password" : "text") : "text"}
                                                                placeholder={schema.placeholder || `Enter ${key}...`}
                                                                value={newConfig[key] || ""}
                                                                onChange={(e) => setNewConfig(prev => ({ ...prev, [key]: e.target.value }))}
                                                                className="bg-background/80 border-border/50 h-10 rounded-xl pr-10"
                                                            />
                                                            {(schema.type === "password" || schema.sensitive) && (
                                                                <button
                                                                    onClick={() => setShowSensitive(prev => ({ ...prev, [key]: !prev[key] }))}
                                                                    className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground"
                                                                >
                                                                    {showSensitive[key] ? <EyeOff size={14} /> : <Eye size={14} />}
                                                                </button>
                                                            )}
                                                        </>
                                                    )}
                                                </div>

                                                {key === "github_token" && newConfig[key] && (
                                                    <Button
                                                        variant="ghost"
                                                        size="sm"
                                                        onClick={handleFetchRepos}
                                                        disabled={isFetchingRepos}
                                                        className="mt-2 w-full text-[9px] font-bold uppercase tracking-widest border border-dashed border-border"
                                                    >
                                                        {isFetchingRepos ? <Loader2 size={10} className="animate-spin mr-2" /> : <RefreshCcw size={10} className="mr-2" />}
                                                        {fetchedRepos.length > 0 ? `${fetchedRepos.length} Repositories Found` : "Fetch Repositories"}
                                                    </Button>
                                                )}

                                                {(key === "supabase_url" || key === "supabase_service_role_key") && selectedType?.provider === "supabase" && (
                                                    <div className="mt-2">
                                                        <Button
                                                            variant="ghost"
                                                            size="sm"
                                                            onClick={() => handleDiscoverSupabaseTables(false)}
                                                            disabled={isDiscoveringTables || !newConfig.supabase_url || !newConfig.supabase_service_role_key}
                                                            className="w-full text-[9px] font-bold uppercase tracking-widest border border-dashed border-border"
                                                        >
                                                            {isDiscoveringTables ? <Loader2 size={10} className="animate-spin mr-2" /> : <Database size={10} className="mr-2" />}
                                                            Discover Tables
                                                        </Button>
                                                    </div>
                                                )}

                                                {key === "tables_to_sync" && availableTables.length > 0 && (
                                                    <div className="mt-3 grid grid-cols-2 lg:grid-cols-3 gap-2 max-h-40 overflow-y-auto p-3 rounded-xl bg-background/50 border border-border/30 custom-scrollbar">
                                                        {availableTables.map(table => {
                                                            const isSelected = (newConfig.tables_to_sync || []).includes(table)
                                                            return (
                                                                <label 
                                                                    key={table} 
                                                                    className={`flex items-center gap-2 group cursor-pointer p-2 rounded-lg transition-colors ${isSelected ? 'bg-primary/20' : 'hover:bg-white/5'}`}
                                                                >
                                                                    <input 
                                                                        type="checkbox" 
                                                                        className="hidden" 
                                                                        checked={isSelected}
                                                                        onChange={() => toggleTableSelection(table, false)}
                                                                    />
                                                                    <div className={`h-4 w-4 rounded border flex items-center justify-center transition-colors ${isSelected ? 'bg-primary border-primary text-white' : 'border-white/20'}`}>
                                                                        {isSelected && <CheckCircle2 className="h-3 w-3" />}
                                                                    </div>
                                                                    <span className={`text-[10px] font-bold truncate ${isSelected ? 'text-primary' : 'text-muted-foreground group-hover:text-foreground'}`}>
                                                                        {table}
                                                                    </span>
                                                                </label>
                                                            )
                                                        })}
                                                    </div>
                                                )}
                                            </div>
                                        )
                                    })}
                                </div>
                            )}

                            <div className="flex items-center gap-3">
                                <Button 
                                    onClick={handleCreateConnection}
                                    disabled={isCreating || !newLabel || !newType}
                                    className="bg-primary text-primary-foreground font-black uppercase tracking-widest text-[10px] h-11 px-8 rounded-xl"
                                >
                                    {isCreating ? <Loader2 className="h-4 w-4 animate-spin mr-2" /> : <Save className="h-4 w-4 mr-2" />}
                                    Create Bridge
                                </Button>
                                <Button 
                                    variant="ghost" 
                                    onClick={() => setShowNewForm(false)}
                                    className="rounded-xl h-11 px-8 text-xs"
                                >
                                    Cancel
                                </Button>
                            </div>
                        </div>
                    )}

                    {/* Connector Library Grid */}
                    <div className="mb-12">
                        <h2 className="text-[10px] font-black text-muted-foreground uppercase tracking-[0.2em] mb-6 px-1">Available Protocols</h2>
                        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                            {connectorTypes.map((ct) => {
                                const meta = providerMeta[ct.provider] || { color: "text-primary", bgColor: "bg-primary/10 border-primary/20", label: ct.name }
                                const connectionCount = connections.filter(c => 
                                    c.connector_type_id === ct.id || c.db_type === ct.provider
                                ).length
                                return (
                                    <div 
                                        key={ct.id}
                                        className={`p-5 rounded-[1.5rem] border ${meta.bgColor} hover:scale-[1.02] transition-all duration-300 group relative overflow-hidden`}
                                    >
                                        <div className="flex items-center gap-3 mb-3 relative z-10">
                                            {ct.provider === "github" ? (
                                                <Github className={`h-4 w-4 ${meta.color}`} />
                                            ) : ct.provider === "youtube" ? (
                                                <Youtube className={`h-4 w-4 ${meta.color}`} />
                                            ) : ct.provider === "linkedin" ? (
                                                <Linkedin className={`h-4 w-4 ${meta.color}`} />
                                            ) : ct.provider === "notion" ? (
                                                <BookOpen className={`h-4 w-4 ${meta.color}`} />
                                            ) : ct.provider === "newsapi" ? (
                                                <Newspaper className={`h-4 w-4 ${meta.color}`} />
                                            ) : (
                                                <Database className={`h-4 w-4 ${meta.color}`} />
                                            )}
                                            <span className={`text-[11px] font-bold tracking-tight ${meta.color}`}>{meta.label}</span>
                                        </div>
                                        <p className="text-[10px] text-muted-foreground leading-relaxed relative z-10 line-clamp-2">{ct.description}</p>
                                        <div className="mt-4 flex items-center justify-between relative z-10">
                                            <span className="text-[9px] font-bold text-muted-foreground/50 uppercase tracking-widest">
                                                {connectionCount > 0 ? `${connectionCount} active` : "Available"}
                                            </span>
                                            {connectionCount > 0 && <Activity className={`h-2.5 w-2.5 ${meta.color} animate-pulse`} />}
                                        </div>
                                        <div className={`absolute top-0 right-0 w-16 h-16 ${meta.bgColor} blur-[40px] opacity-20 -mr-8 -mt-8 pointer-events-none group-hover:opacity-40 transition-opacity`} />
                                    </div>
                                )
                            })}
                        </div>
                    </div>

                    {/* Active Connections List */}
                    <div>
                        <h2 className="text-[10px] font-black text-muted-foreground uppercase tracking-[0.2em] mb-6 px-1">Active Sync Pipelines</h2>

                        {connections.length === 0 ? (
                            <div className="text-center py-20 bg-muted/5 rounded-[2rem] border border-dashed border-border">
                                <Plug className="h-12 w-12 text-muted-foreground/20 mx-auto mb-4" />
                                <h3 className="font-bold text-foreground">No Bridges Configured</h3>
                                <p className="text-sm text-muted-foreground mt-1 max-w-xs mx-auto">
                                    {isAdmin 
                                        ? "You haven't established any data pipelines for this project yet. Click 'New Connection' to start."
                                        : "Your account manager has not yet linked any external data pipelines to this portal."
                                    }
                                </p>
                            </div>
                        ) : (
                            <div className="space-y-4">
                                {connections.map((conn) => {
                                    const provider = conn.connector_types?.provider || conn.db_type
                                    const meta = providerMeta[provider] || { color: "text-primary", bgColor: "bg-primary/10 border-primary/20", label: "Protocol" }
                                    const status = statusMeta[conn.sync_status] || statusMeta.pending
                                    const StatusIcon = status.icon
                                    const isExpanded = expandedId === conn.id
                                    const isSyncing = syncingId === conn.id
                                    const isEditing = editingConfigId === conn.id

                                    return (
                                        <div 
                                            key={conn.id}
                                            className={`rounded-[1.5rem] border transition-all duration-300 ${
                                                isExpanded 
                                                    ? "bg-card/40 backdrop-blur-xl border-primary/20 shadow-xl" 
                                                    : "bg-card/20 backdrop-blur-md border-border hover:border-primary/20"
                                            }`}
                                        >
                                            <div className="p-5 flex items-center justify-between">
                                                <div className="flex items-center gap-4 min-w-0">
                                                    <div className={`h-11 w-11 rounded-xl flex items-center justify-center border shrink-0 ${meta.bgColor}`}>
                                                        {provider === "github" ? (
                                                            <Github className={`h-5 w-5 ${meta.color}`} />
                                                        ) : provider === "youtube" ? (
                                                            <Youtube className={`h-5 w-5 ${meta.color}`} />
                                                        ) : provider === "linkedin" ? (
                                                            <Linkedin className={`h-5 w-5 ${meta.color}`} />
                                                        ) : provider === "tiktok" ? (
                                                            <Zap className={`h-5 w-5 ${meta.color}`} />
                                                        ) : provider === "newsapi" ? (
                                                            <Newspaper className={`h-5 w-5 ${meta.color}`} />
                                                        ) : provider === "instagram" ? (
                                                            <Instagram className={`h-5 w-5 ${meta.color}`} />
                                                        ) : provider === "facebook" ? (
                                                            <Facebook className={`h-5 w-5 ${meta.color}`} />
                                                        ) : provider === "twitter" ? (
                                                            <Twitter className={`h-5 w-5 ${meta.color}`} />
                                                        ) : provider === "alpaca" ? (
                                                            <Database className={`h-5 w-5 ${meta.color}`} />
                                                        ) : (
                                                            <Database className={`h-5 w-5 ${meta.color}`} />
                                                        )}
                                                    </div>
                                                    <div className="min-w-0">
                                                        <h3 className="text-sm font-bold text-foreground truncate">{conn.label}</h3>
                                                        <div className="flex items-center gap-3 mt-1">
                                                            <span className={`text-[9px] font-black uppercase tracking-widest ${meta.color}`}>{meta.label}</span>
                                                            <span className="text-muted-foreground/30 text-[10px]">•</span>
                                                            <div className="flex items-center gap-1.5">
                                                                <StatusIcon className={`h-3 w-3 ${status.color} ${isSyncing ? 'animate-spin' : ''}`} />
                                                                <span className={`text-[9px] font-black uppercase tracking-widest ${status.color}`}>{isSyncing ? "Syncing..." : status.label}</span>
                                                            </div>
                                                            <span className="text-muted-foreground/30 text-[10px]">•</span>
                                                            <span className="text-[9px] font-bold text-muted-foreground">Pulse: {formatDate(conn.last_synced_at)}</span>
                                                        </div>
                                                    </div>
                                                </div>

                                                <div className="flex items-center gap-3">
                                                    <Button
                                                        size="sm"
                                                        variant="ghost"
                                                        onClick={() => handleSync(conn.id)}
                                                        disabled={isSyncing}
                                                        className="h-8 rounded-lg gap-2 text-[10px] font-bold uppercase tracking-widest hover:bg-primary/5 hover:text-primary"
                                                    >
                                                        <RefreshCcw className={`h-3.5 w-3.5 ${isSyncing ? "animate-spin" : ""}`} />
                                                        Sync
                                                    </Button>
                                                    <button
                                                        onClick={() => setExpandedId(isExpanded ? null : conn.id)}
                                                        className="p-2 hover:bg-primary/5 rounded-lg text-muted-foreground hover:text-primary transition-colors"
                                                    >
                                                        {isExpanded ? <ChevronUp className="h-4 w-4" /> : <ChevronDown className="h-4 w-4" />}
                                                    </button>
                                                </div>
                                            </div>

                                            {isExpanded && (
                                                <div className="px-5 pb-5 border-t border-border pt-5">
                                                    <div className="grid grid-cols-2 md:grid-cols-4 gap-6 text-[11px] mb-6">
                                                        <div>
                                                            <p className="text-muted-foreground/50 font-black uppercase tracking-widest mb-1.5">Schedule</p>
                                                            <p className="text-foreground font-bold capitalize">{conn.sync_schedule || "Real-time"}</p>
                                                        </div>
                                                        <div>
                                                            <p className="text-muted-foreground/50 font-black uppercase tracking-widest mb-1.5">Last Pulse</p>
                                                            <p className="text-foreground font-bold">{formatDate(conn.last_synced_at)}</p>
                                                        </div>
                                                        <div>
                                                            <p className="text-muted-foreground/50 font-black uppercase tracking-widest mb-1.5">Project</p>
                                                            <p className="text-foreground font-bold">{projectName}</p>
                                                        </div>
                                                        <div>
                                                            <p className="text-muted-foreground/50 font-black uppercase tracking-widest mb-1.5">Status</p>
                                                            <div className="flex items-center gap-2">
                                                                <div className={`h-1.5 w-1.5 rounded-full ${status.color.includes('emerald') ? 'bg-emerald-500 shadow-[0_0_8px_rgba(16,185,129,0.5)]' : 'bg-amber-500'} animate-pulse`} />
                                                                <span className={`font-black uppercase tracking-widest ${status.color}`}>{status.label}</span>
                                                            </div>
                                                        </div>
                                                    </div>

                                                    {(conn.sync_config?.tables_to_sync || []).length > 0 && (
                                                        <div className="mb-6">
                                                            <p className="text-muted-foreground/50 font-black uppercase tracking-widest text-[10px] mb-2.5">Syncing Targets</p>
                                                            <div className="flex flex-wrap gap-1.5">
                                                                {(conn.sync_config.tables_to_sync as string[]).map(t => (
                                                                    <span key={t} className="px-2.5 py-1 rounded-md bg-emerald-500/10 border border-emerald-500/20 text-[9px] font-black text-emerald-400 capitalize">
                                                                        {t}
                                                                    </span>
                                                                ))}
                                                            </div>
                                                        </div>
                                                    )}

                                                    {isAdmin && (
                                                        <div className="pt-5 border-t border-border/50 flex flex-col md:flex-row items-center justify-between gap-4">
                                                            <div className="flex items-center gap-2">
                                                                <Button
                                                                    variant="ghost"
                                                                    size="sm"
                                                                    onClick={() => {
                                                                        setEditingConfigId(isEditing ? null : conn.id)
                                                                        setEditConfig(conn.sync_config || {})
                                                                        setAvailableTables([])
                                                                    }}
                                                                    className="h-8 rounded-lg gap-2 text-[10px] font-black uppercase tracking-widest bg-primary/5 text-primary hover:bg-primary/10"
                                                                >
                                                                    <Edit2 size={12} />
                                                                    Edit Bridge
                                                                </Button>
                                                                <Button
                                                                    variant="ghost"
                                                                    size="sm"
                                                                    onClick={() => handleDelete(conn.id)}
                                                                    className="h-8 rounded-lg gap-2 text-[10px] font-black uppercase tracking-widest hover:bg-red-500/10 hover:text-red-500"
                                                                >
                                                                    <Trash2 size={12} />
                                                                    Remove
                                                                </Button>
                                                            </div>

                                                            {isEditing && (
                                                                <div className="w-full md:max-w-md p-4 rounded-xl bg-background/50 border border-primary/20 space-y-4 animate-in zoom-in-95 duration-200 mt-4 md:mt-0">
                                                                    <div className="flex items-center justify-between">
                                                                        <h4 className="text-[10px] font-black uppercase tracking-widest text-primary">Bridge Parameters</h4>
                                                                        <button onClick={() => setEditingConfigId(null)} className="text-muted-foreground hover:text-foreground">
                                                                            <XCircle size={14} />
                                                                        </button>
                                                                    </div>
                                                                    
                                                                    {Object.entries(conn.connector_types?.config_schema?.properties || conn.connector_types?.config_schema || {}).map(([key, schema]: [string, any]) => {
                                                                        if (schema.type === "boolean") {
                                                                            return (
                                                                                <div key={key} className="flex items-center gap-3">
                                                                                    <input
                                                                                        type="checkbox"
                                                                                        id={`edit-${conn.id}-${key}`}
                                                                                        checked={editConfig[key] ?? schema.default ?? false}
                                                                                        onChange={(e) => setEditConfig(prev => ({ ...prev, [key]: e.target.checked }))}
                                                                                        className="h-4 w-4 rounded border-border bg-background focus:ring-primary h-4 w-4 rounded border-border"
                                                                                    />
                                                                                    <label htmlFor={`edit-${conn.id}-${key}`} className="text-[9px] font-bold text-muted-foreground uppercase cursor-pointer">
                                                                                        {schema.label || key.replace(/_/g, " ")}
                                                                                    </label>
                                                                                </div>
                                                                            )
                                                                        }

                                                                        return (
                                                                            <div key={key}>
                                                                                <label className="text-[9px] font-bold text-muted-foreground mb-1 block capitalize">
                                                                                    {schema.label || key.replace(/_/g, " ")}
                                                                                </label>
                                                                                <div className="relative">
                                                                                    {key === "repository" && provider === "github" && fetchedRepos.length > 0 ? (
                                                                                        <select
                                                                                            className="w-full bg-background/50 border border-border focus:border-primary/50 h-8 rounded-lg px-3 text-[11px] text-foreground outline-none"
                                                                                            value={editConfig[key] || ""}
                                                                                            onChange={(e) => setEditConfig(prev => ({ ...prev, [key]: e.target.value }))}
                                                                                        >
                                                                                            <option value="">Select a repository...</option>
                                                                                            {fetchedRepos.map(r => <option key={r} value={r}>{r}</option>)}
                                                                                        </select>
                                                                                    ) : (
                                                                                        <>
                                                                                            <Input 
                                                                                                type={schema.type === "password" || schema.sensitive ? (!showSensitive[key] ? "password" : "text") : "text"}
                                                                                                value={editConfig[key] || ""}
                                                                                                onChange={(e) => setEditConfig(prev => ({ ...prev, [key]: e.target.value }))}
                                                                                                className="h-8 text-[11px] bg-background/80 border-border/50 rounded-lg pr-9"
                                                                                            />
                                                                                            {(schema.type === "password" || schema.sensitive) && (
                                                                                                <button
                                                                                                    onClick={() => setShowSensitive(prev => ({ ...prev, [key]: !prev[key] }))}
                                                                                                    className="absolute right-2 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground"
                                                                                                >
                                                                                                    {showSensitive[key] ? <EyeOff size={12} /> : <Eye size={12} />}
                                                                                                </button>
                                                                                            )}
                                                                                        </>
                                                                                    )}
                                                                                </div>

                                                                                {key === "github_token" && provider === "github" && (
                                                                                    <Button
                                                                                        variant="ghost"
                                                                                        size="sm"
                                                                                        onClick={handleFetchRepos}
                                                                                        disabled={isFetchingRepos}
                                                                                        className="mt-2 w-full h-7 text-[8px] font-bold uppercase tracking-widest border border-dashed border-border"
                                                                                    >
                                                                                        {isFetchingRepos ? <Loader2 size={10} className="animate-spin mr-2" /> : <RefreshCcw size={10} className="mr-2" />}
                                                                                        {fetchedRepos.length > 0 ? `${fetchedRepos.length} Repositories Found` : "Fetch Repositories"}
                                                                                    </Button>
                                                                                )}

                                                                                {key === "supabase_url" && provider === "supabase" && (
                                                                                    <Button
                                                                                        variant="ghost"
                                                                                        size="sm"
                                                                                        onClick={() => handleDiscoverSupabaseTables(true)}
                                                                                        disabled={isDiscoveringTables || !editConfig.supabase_url || !editConfig.supabase_service_role_key}
                                                                                        className="mt-2 w-full h-7 text-[8px] font-bold uppercase tracking-widest border border-dashed border-border"
                                                                                    >
                                                                                        {isDiscoveringTables ? <Loader2 size={10} className="animate-spin mr-2" /> : <Database size={10} className="mr-2" />}
                                                                                        Discover Tables
                                                                                    </Button>
                                                                                )}

                                                                                {key === "tables_to_sync" && availableTables.length > 0 && (
                                                                                    <div className="mt-2 grid grid-cols-2 gap-1 max-h-32 overflow-y-auto p-1.5 rounded-lg bg-background/50 border border-border/30 custom-scrollbar">
                                                                                        {availableTables.map(table => {
                                                                                            const isSelected = (editConfig.tables_to_sync || []).includes(table)
                                                                                            return (
                                                                                                <label 
                                                                                                    key={table} 
                                                                                                    className={`flex items-center gap-2 group cursor-pointer p-1.5 rounded-md transition-colors ${isSelected ? 'bg-primary/20' : 'hover:bg-white/5'}`}
                                                                                                >
                                                                                                    <input 
                                                                                                        type="checkbox" 
                                                                                                        className="hidden" 
                                                                                                        checked={isSelected}
                                                                                                        onChange={() => toggleTableSelection(table, true)}
                                                                                                    />
                                                                                                    <div className={`h-3 w-3 rounded border flex items-center justify-center transition-colors ${isSelected ? 'bg-primary border-primary text-white' : 'border-white/20'}`}>
                                                                                                        {isSelected && <CheckCircle2 className="h-2 w-2" />}
                                                                                                    </div>
                                                                                                    <span className={`text-[9px] font-bold truncate ${isSelected ? 'text-primary' : 'text-muted-foreground group-hover:text-foreground'}`}>
                                                                                                        {table}
                                                                                                    </span>
                                                                                                </label>
                                                                                            )
                                                                                        })}
                                                                                    </div>
                                                                                )}
                                                                            </div>
                                                                        )
                                                                    })}

                                                                    <div className="flex gap-2 pt-2">
                                                                        <Button 
                                                                            onClick={() => handleUpdateConfig(conn.id)}
                                                                            disabled={isUpdating}
                                                                            className="h-9 flex-1 bg-primary text-primary-foreground text-[10px] font-black uppercase tracking-widest rounded-xl shadow-lg shadow-primary/20"
                                                                        >
                                                                            {isUpdating ? <Loader2 size={12} className="animate-spin mr-2" /> : <Save size={12} className="mr-2" />}
                                                                            Update Bridge
                                                                        </Button>
                                                                        <Button 
                                                                            variant="ghost" 
                                                                            onClick={() => setEditingConfigId(null)}
                                                                            className="h-9 px-4 text-[10px] font-black uppercase tracking-widest rounded-xl border border-border"
                                                                        >
                                                                            Cancel
                                                                        </Button>
                                                                    </div>
                                                                </div>
                                                            )}
                                                        </div>
                                                    )}
                                                </div>
                                            )}
                                        </div>
                                    )
                                })}
                            </div>
                        )}
                    </div>

                    {/* Info Footer */}
                    <div className="mt-20 p-8 rounded-[2rem] bg-primary/5 border border-primary/10 flex flex-col md:flex-row items-center gap-8 relative overflow-hidden group">
                        <div className="h-16 w-16 rounded-2xl bg-primary/20 flex items-center justify-center shrink-0 border border-primary/30 relative z-10 transition-transform group-hover:scale-110 duration-500">
                            <Zap className="h-8 w-8 text-primary shadow-[0_0_15px_rgba(var(--primary),0.5)]" />
                        </div>
                        <div className="relative z-10">
                            <h4 className="text-lg font-black text-foreground tracking-tight">Need to connect a new data source?</h4>
                            <p className="text-muted-foreground text-sm mt-1 leading-relaxed max-w-2xl">
                                To maintain security and data integrity, all production connectors must be validated and configured by our agency engineering team. {isAdmin ? "Your admin role allows bridge configuration, but large-scale deployments may require agency verification." : "Contact your account manager to request a new bridge."}
                            </p>
                        </div>
                        <div className="absolute top-0 right-0 w-32 h-32 bg-primary/10 blur-[60px] opacity-20 -mr-16 -mt-16 pointer-events-none group-hover:opacity-40 transition-opacity" />
                    </div>
                </div>
            </div>
        </div>
    )
}
