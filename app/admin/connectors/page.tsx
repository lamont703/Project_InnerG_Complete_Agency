"use client"

import { useState, useEffect } from "react"
import { useRouter } from "next/navigation"
import Link from "next/link"
import {
    Loader2,
    ArrowLeft,
    Database,
    Plug,
    Plus,
    RefreshCcw,
    CheckCircle2,
    XCircle,
    Clock,
    ChevronDown,
    ChevronUp,
    Eye,
    EyeOff,
    Save,
    Zap,
    Github,
    Trash2,
    Edit2,
    Youtube,
    Linkedin,
    Play,
    BookOpen,
    Newspaper,
    Instagram,
    Facebook,
    Twitter,
} from "lucide-react"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { createBrowserClient, supabaseAnonKey } from "@/lib/supabase/browser"
import { AdminHeader } from "@/features/agency/components/AdminHeader"
import { MetaLoginButton } from "@/components/social/meta-login-button"
import { TikTokLoginButton } from "@/components/social/tiktok-login-button"
import { InstagramLoginButton } from "@/components/social/instagram-login-button"
import { TwitterLoginButton } from "@/components/social/twitter-login-button"
import { LinkedInLoginButton } from "@/components/social/linkedin-login-button"

// ─────────────────────────────────────────────
// TYPES
// ─────────────────────────────────────────────

interface ConnectorType {
    id: string
    name: string
    provider: string
    description: string
    config_schema: any
    is_active: boolean
}

interface Connection {
    id: string
    label: string
    project_id: string | null
    client_id: string | null
    connector_type_id: string | null
    db_type: string
    is_shared: boolean
    is_active: boolean
    sync_status: string
    sync_schedule: string
    last_synced_at: string | null
    sync_config: any
    connector_types: ConnectorType | null
    projects: { name: string; slug: string } | null
}

interface Project {
    id: string
    name: string
    slug: string
}

// ─────────────────────────────────────────────
// PROVIDER ICONS + COLORS
// ─────────────────────────────────────────────

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
    twitter: { color: "text-zinc-100", bgColor: "bg-black border-white/20", label: "X (Twitter)" },
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

// ─────────────────────────────────────────────
// MAIN PAGE
// ─────────────────────────────────────────────

export default function ConnectorAdminPage() {
    const router = useRouter()
    const [isLoading, setIsLoading] = useState(true)
    const [connectorTypes, setConnectorTypes] = useState<ConnectorType[]>([])
    const [connections, setConnections] = useState<Connection[]>([])
    const [projects, setProjects] = useState<Project[]>([])
    const [showNewForm, setShowNewForm] = useState(false)
    const [expandedId, setExpandedId] = useState<string | null>(null)
    const [syncingId, setSyncingId] = useState<string | null>(null)

    // New connection form state
    const [newLabel, setNewLabel] = useState("")
    const [newType, setNewType] = useState("")
    const [newProject, setNewProject] = useState("")
    const [newConfig, setNewConfig] = useState<Record<string, any>>({})
    const [isCreating, setIsCreating] = useState(false)
    const [showSensitive, setShowSensitive] = useState<Record<string, boolean>>({})

    // Edit connection state
    const [editingConfigId, setEditingConfigId] = useState<string | null>(null)
    const [editConfig, setEditConfig] = useState<Record<string, any>>({})
    const [isUpdating, setIsUpdating] = useState(false)

    // GitHub Repo Selection
    const [fetchedRepos, setFetchedRepos] = useState<string[]>([])
    const [isFetchingRepos, setIsFetchingRepos] = useState(false)

    // Supabase Table Discovery
    const [availableTables, setAvailableTables] = useState<string[]>([])
    const [isDiscoveringTables, setIsDiscoveringTables] = useState(false)

    useEffect(() => {
        loadData()
    }, [])

    const loadData = async () => {
        try {
            const supabase = createBrowserClient()
            const { data: { user } } = await supabase.auth.getUser()
            if (!user) { router.push("/login"); return }

            const { data: profile } = await supabase.from("users").select("role").eq("id", user.id).single() as any
            if (!profile || profile.role !== "super_admin") { router.push("/select-portal"); return }

            // eslint-disable-next-line @typescript-eslint/no-explicit-any
            const [typesRes, connsRes, projectsRes] = await Promise.all([
                (supabase as any).from("connector_types").select("*").eq("is_active", true).order("name"),
                (supabase as any).from("client_db_connections").select(`
                    *,
                    connector_types(id, name, provider, config_schema),
                    projects(name, slug)
                `).order("created_at", { ascending: false }),
                supabase.from("projects").select("id, name, slug").order("name") as any,
            ]) as any[]

            setConnectorTypes(typesRes.data || [])
            setConnections(connsRes.data || [])
            setProjects(projectsRes.data || [])
        } catch (err) {
            console.error("[Connectors] Load error:", err)
        } finally {
            setIsLoading(false)
        }
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

            const results = await Promise.all(syncPromises)
            
            results.forEach((res, index) => {
                if (res.error) {
                    console.error(`[Connectors] Sync error (Task ${index}):`, res.error)
                } else {
                    console.log(`[Connectors] Sync result (Task ${index}):`, res.data)
                }
            })

            // Reload to get updated status
            await loadData()
        } catch (err) {
            console.error("[Connectors] Sync failed:", err)
        } finally {
            setSyncingId(null)
        }
    }

    const handleCreateConnection = async () => {
        if (!newLabel || !newType || !newProject) return
        setIsCreating(true)

        try {
            const supabase = createBrowserClient()
            const selectedType = connectorTypes.find(t => t.id === newType)

            // eslint-disable-next-line @typescript-eslint/no-explicit-any
            const { error } = await (supabase as any).from("client_db_connections").insert({
                label: newLabel,
                project_id: newProject,
                connector_type_id: newType,
                db_type: selectedType?.provider || "supabase",
                connection_url_encrypted: "configured-via-sync-config",
                sync_config: newConfig,
                is_active: true,
                sync_status: "pending",
            })

            if (error) {
                console.error("[Connectors] Create error:", error)
            } else {
                setShowNewForm(false)
                setNewLabel("")
                setNewType("")
                setNewProject("")
                setNewConfig({})
                setFetchedRepos([])
                await loadData()
            }
        } catch (err) {
            console.error("[Connectors] Create failed:", err)
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
            console.error("[Connectors] Fetch repos failed:", err)
            alert("Failed to fetch repositories. Check your token permissions (repo scope required).")
        } finally {
            setIsFetchingRepos(false)
        }
    }

    const handleDiscoverSupabaseTables = async (isEdit = false, connectionId?: string) => {
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
            console.error("[Connectors] Discovery failed:", err)
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
            
            // 1. Get connection info for specific cleanup if needed
            const { data: conn } = await (supabase as any)
                .from("client_db_connections")
                .select("project_id, db_type")
                .eq("id", connectionId)
                .single()

            // 2. Delete the connection (cascades to logs)
            const { error: deleteError } = await (supabase as any)
                .from("client_db_connections")
                .delete()
                .eq("id", connectionId)

            if (deleteError) throw deleteError

            // 3. GitHub-specific data cleanup if applicable
            if (conn && "db_type" in conn && conn.db_type === "github" && conn.project_id) {
                // Delete GitHub repos linked to this project
                await (supabase as any)
                    .from("github_repos")
                    .delete()
                    .eq("project_id", conn.project_id)
            }

            await loadData()
        } catch (err) {
            console.error("[Connectors] Delete failed:", err)
            alert("Failed to delete connection.")
        }
    }

    const handleUpdateConfig = async (connectionId: string) => {
        setIsUpdating(true)
        try {
            const supabase = createBrowserClient()
            const { error: updateError } = await (supabase as any)
                .from("client_db_connections")
                .update({ sync_config: editConfig })
                .eq("id", connectionId)
            
            if (updateError) throw updateError
            
            setEditingConfigId(null)
            await loadData()
        } catch (err) {
            console.error("[Connectors] Update failed:", err)
            alert("Failed to update connection config.")
        } finally {
            setIsUpdating(false)
        }
    }

    const selectedType = connectorTypes.find(t => t.id === newType)
    const selectedTypeSchema = selectedType?.config_schema

    if (isLoading) {
        return (
            <div className="min-h-screen bg-background flex items-center justify-center">
                <div className="flex flex-col items-center gap-4">
                    <Loader2 className="h-8 w-8 animate-spin text-primary" />
                    <p className="text-sm text-muted-foreground">Loading connectors...</p>
                </div>
            </div>
        )
    }

    return (
        <div className="flex-1 flex flex-col min-h-0 overflow-hidden h-full">
            <AdminHeader 
                title="External Connectors" 
                subtitle="Data Bridges & Sync Pipelines"
            />

            <div className="flex-1 overflow-y-auto custom-scrollbar pb-24 lg:pb-10">
                <div className="p-6 md:p-10 relative z-10 max-w-5xl mx-auto w-full">
                    {/* Header Actions */}
                    <div className="flex items-center justify-end mb-10">
                        <Button
                            onClick={() => setShowNewForm(!showNewForm)}
                            className="bg-primary hover:bg-primary/90 text-primary-foreground gap-2 rounded-xl h-11 px-6 shadow-lg shadow-primary/20"
                        >
                            <Plus className="h-4 w-4" />
                            <span className="text-xs font-black uppercase tracking-widest">New Connection</span>
                        </Button>
                    </div>

                    {/* ─── New Connection Form ─── */}
                    {showNewForm && (
                        <div className="mb-8 p-6 rounded-2xl glass-panel border border-primary/20 animate-in slide-in-from-top-4">
                            <h3 className="text-sm font-bold text-foreground mb-5 flex items-center gap-2">
                                <Zap className="h-4 w-4 text-primary" />
                                New Connection
                            </h3>

                            <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-5">
                                <div>
                                    <label className="text-xs text-muted-foreground mb-1.5 block">Connection Label</label>
                                    <Input
                                        value={newLabel}
                                        onChange={(e) => setNewLabel(e.target.value)}
                                        placeholder="e.g. Kane's Supabase DB"
                                        className="bg-background border-border rounded-xl"
                                    />
                                </div>
                                <div>
                                    <label className="text-xs text-muted-foreground mb-1.5 block">Connector Type</label>
                                    <select
                                        value={newType}
                                        onChange={(e) => { setNewType(e.target.value); setNewConfig({}); setFetchedRepos([]) }}
                                        className="w-full h-10 px-3 rounded-xl bg-background border border-border text-sm text-foreground"
                                    >
                                        <option value="">Select type...</option>
                                        {connectorTypes.map(t => (
                                            <option key={t.id} value={t.id}>{t.name}</option>
                                        ))}
                                    </select>
                                </div>
                                <div>
                                    <label className="text-xs text-muted-foreground mb-1.5 block">Assign to Project</label>
                                    <select
                                        value={newProject}
                                        onChange={(e) => setNewProject(e.target.value)}
                                        className="w-full h-10 px-3 rounded-xl bg-background border border-border text-sm text-foreground"
                                    >
                                        <option value="">Select project...</option>
                                        {projects.map(p => (
                                            <option key={p.id} value={p.id}>{p.name}</option>
                                        ))}
                                    </select>
                                </div>
                            </div>

                            {/* Dynamic Config Fields */}
                            {selectedType?.provider === "facebook" ? (
                                <div className="py-6 flex flex-col items-center gap-4 bg-background/50 rounded-2xl border border-dashed border-border w-full">
                                    <p className="text-[10px] font-black text-muted-foreground uppercase tracking-widest text-center px-6">
                                        Meta uses Business Login for secure access to Pages and accounts.
                                    </p>
                                    <MetaLoginButton 
                                        size="large"
                                        projectId={newProject}
                                        configId="1304420384838040"
                                    />
                                    <p className="text-[8px] text-muted-foreground italic">
                                        You will be redirected back here after authorizing via Facebook.
                                    </p>
                                </div>
                            ) : selectedType?.provider === "instagram" ? (
                                <div className="py-6 flex flex-col items-center gap-4 bg-background/50 rounded-2xl border border-dashed border-border w-full">
                                    <p className="text-[10px] font-black text-pink-500 uppercase tracking-widest text-center px-6">
                                        Connect your Instagram Business account directly.
                                    </p>
                                    <InstagramLoginButton 
                                        size="large"
                                        projectId={newProject}
                                    />
                                    <p className="text-[8px] text-muted-foreground italic">
                                        Authorized via the native Instagram Login flow.
                                    </p>
                                </div>
                            ) : selectedType?.provider === "tiktok" ? (
                                <div className="py-6 flex flex-col items-center gap-4 bg-background/50 rounded-2xl border border-dashed border-border w-full">
                                    <p className="text-[10px] font-black text-pink-500 uppercase tracking-widest text-center px-6">
                                        Connect TikTok to sync your videos and content insights.
                                    </p>
                                    <TikTokLoginButton 
                                        projectId={newProject}
                                    />
                                    <p className="text-[8px] text-muted-foreground italic">
                                        OAuth connection requires access to video.list and profile info.
                                    </p>
                                </div>
                            ) : selectedType?.provider === "twitter" ? (
                                <div className="py-6 flex flex-col items-center gap-4 bg-background/50 rounded-2xl border border-dashed border-border w-full">
                                    <p className="text-[10px] font-black text-zinc-400 uppercase tracking-widest text-center px-6">
                                        Connect X (Twitter) via OAuth 2.0 PKCE.
                                    </p>
                                    <TwitterLoginButton 
                                        projectId={newProject}
                                    />
                                    <p className="text-[8px] text-muted-foreground italic">
                                        Includes access to follow counts and recent performance signals.
                                    </p>
                                </div>
                            ) : selectedType?.provider === "linkedin" ? (
                                <div className="py-6 flex flex-col items-center gap-4 bg-background/50 rounded-2xl border border-dashed border-border w-full">
                                    <p className="text-[10px] font-black text-blue-500 uppercase tracking-widest text-center px-6">
                                        Connect your LinkedIn Profile or Page via OAuth.
                                    </p>
                                    <LinkedInLoginButton 
                                        projectId={newProject}
                                    />
                                    <p className="text-[8px] text-muted-foreground italic">
                                        Authorizes personal posts and organization page access.
                                    </p>
                                </div>
                            ) : selectedTypeSchema?.properties && (
                                <div className="space-y-3 mb-5 p-4 rounded-xl bg-muted/5 border border-border">
                                    <p className="text-xs font-bold text-muted-foreground uppercase tracking-wider mb-3">Configuration</p>
                                    {Object.entries(selectedTypeSchema.properties).map(([key, schema]: [string, any]) => {
                                        if (schema.type === "boolean") {
                                            return (
                                                <label key={key} className="flex items-center gap-3 cursor-pointer">
                                                    <input
                                                        type="checkbox"
                                                        checked={newConfig[key] ?? schema.default ?? false}
                                                        onChange={(e) => setNewConfig(prev => ({ ...prev, [key]: e.target.checked }))}
                                                        className="rounded border-white/20"
                                                    />
                                                    <span className="text-xs text-foreground">{schema.label || key}</span>
                                                </label>
                                            )
                                        }
                                        const isSensitive = schema.sensitive === true
                                        const isVisible = showSensitive[key] ?? false
                                        return (
                                            <div key={key}>
                                                <div className="flex items-center justify-between mb-1">
                                                    <label className="text-xs text-muted-foreground block">{schema.label || key}</label>
                                                    {key === "repository" && selectedType?.provider === "github" && (
                                                        <button 
                                                            onClick={handleFetchRepos}
                                                            disabled={!newConfig.github_token || isFetchingRepos}
                                                            className="text-[10px] font-bold text-primary hover:text-primary/80 disabled:opacity-50 flex items-center gap-1"
                                                        >
                                                            {isFetchingRepos && <Loader2 className="h-2 w-2 animate-spin" />}
                                                            Fetch My Repositories
                                                        </button>
                                                    )}
                                                </div>
                                                <div className="relative">
                                                    {key === "repository" && fetchedRepos.length > 0 ? (
                                                        <select
                                                            value={newConfig[key] || ""}
                                                            onChange={(e) => setNewConfig(prev => ({ ...prev, [key]: e.target.value }))}
                                                            className="w-full h-10 px-3 rounded-xl bg-background border border-border text-sm text-foreground"
                                                        >
                                                            <option value="">Select a repository...</option>
                                                            {fetchedRepos.map(repo => (
                                                                <option key={repo} value={repo}>{repo}</option>
                                                            ))}
                                                        </select>
                                                    ) : key === "tables_to_sync" && selectedType?.provider === "supabase" ? (
                                                        <div className="space-y-3">
                                                            <div className="flex items-center justify-between gap-4">
                                                                <Button
                                                                    type="button"
                                                                    size="sm"
                                                                    variant="outline"
                                                                    disabled={isDiscoveringTables || !newConfig.supabase_url || !newConfig.supabase_service_role_key}
                                                                    onClick={() => handleDiscoverSupabaseTables(false)}
                                                                    className="h-8 text-[10px] font-black uppercase tracking-widest gap-2 bg-emerald-500/5 hover:bg-emerald-500/10 border-emerald-500/20 text-emerald-500"
                                                                >
                                                                    {isDiscoveringTables ? <Loader2 className="h-3 w-3 animate-spin" /> : <RefreshCcw className="h-3 w-3" />}
                                                                    {availableTables.length > 0 ? "Refresh Tables" : "Discover Tables"}
                                                                </Button>
                                                                {availableTables.length > 0 && (
                                                                    <span className="text-[10px] text-muted-foreground font-bold uppercase tracking-widest">
                                                                        {availableTables.length} Found
                                                                    </span>
                                                                )}
                                                            </div>

                                                            {availableTables.length > 0 && (
                                                                <div className="grid grid-cols-2 gap-2 p-3 rounded-xl bg-emerald-500/5 border border-emerald-500/10 max-h-40 overflow-y-auto custom-scrollbar">
                                                                    {availableTables.map(table => {
                                                                        const isSelected = (newConfig.tables_to_sync || []).includes(table)
                                                                        return (
                                                                            <label 
                                                                                key={table} 
                                                                                className={`flex items-center gap-2 group cursor-pointer p-2 rounded-lg transition-colors ${isSelected ? 'bg-emerald-500/20' : 'hover:bg-white/5'}`}
                                                                            >
                                                                                <input 
                                                                                    type="checkbox" 
                                                                                    className="hidden" 
                                                                                    checked={isSelected}
                                                                                    onChange={() => toggleTableSelection(table, false)}
                                                                                />
                                                                                <div className={`h-4 w-4 rounded border flex items-center justify-center transition-colors ${isSelected ? 'bg-emerald-500 border-emerald-500 text-white' : 'border-white/20'}`}>
                                                                                    {isSelected && <CheckCircle2 className="h-3 w-3" />}
                                                                                </div>
                                                                                <span className={`text-[11px] font-bold truncate ${isSelected ? 'text-emerald-400' : 'text-muted-foreground group-hover:text-foreground'}`}>
                                                                                    {table}
                                                                                </span>
                                                                            </label>
                                                                        )
                                                                    })}
                                                                </div>
                                                            )}
                                                            {(newConfig.tables_to_sync || []).length > 0 && (
                                                                <div className="flex flex-wrap gap-1.5">
                                                                    {(newConfig.tables_to_sync || []).map((t: string) => (
                                                                        <span key={t} className="px-2 py-0.5 rounded-full bg-emerald-500/20 border border-emerald-500/30 text-[10px] font-bold text-emerald-400">
                                                                            {t}
                                                                        </span>
                                                                    ))}
                                                                </div>
                                                            )}
                                                        </div>
                                                    ) : (
                                                        <>
                                                            <Input
                                                                type={isSensitive && !isVisible ? "password" : "text"}
                                                                value={newConfig[key] || ""}
                                                                onChange={(e) => setNewConfig(prev => ({ ...prev, [key]: e.target.value }))}
                                                                placeholder={schema.placeholder || ""}
                                                                className="bg-background border-border rounded-xl pr-10"
                                                            />
                                                            {isSensitive && (
                                                                <button
                                                                    type="button"
                                                                    onClick={() => setShowSensitive(prev => ({ ...prev, [key]: !isVisible }))}
                                                                    className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground"
                                                                >
                                                                    {isVisible ? <EyeOff className="h-3.5 w-3.5" /> : <Eye className="h-3.5 w-3.5" />}
                                                                </button>
                                                            )}
                                                        </>
                                                    )}
                                                </div>
                                            </div>
                                        )
                                    })}
                                </div>
                            )}

                            <div className="flex gap-3">
                                <Button
                                    onClick={handleCreateConnection}
                                    disabled={!newLabel || !newType || !newProject || isCreating}
                                    className="bg-primary hover:bg-primary/90 text-primary-foreground gap-2 rounded-xl"
                                >
                                    {isCreating ? <Loader2 className="h-4 w-4 animate-spin" /> : <Save className="h-4 w-4" />}
                                    Create Connection
                                </Button>
                                <Button
                                    variant="ghost"
                                    onClick={() => { setShowNewForm(false); setFetchedRepos([]) }}
                                    className="rounded-xl"
                                >
                                    Cancel
                                </Button>
                            </div>
                        </div>
                    )}

                    {/* ─── Connector Library ─── */}
                    <div className="mb-8">
                        <h2 className="text-xs font-bold text-muted-foreground uppercase tracking-wider mb-4 px-1">Available Connectors</h2>
                        <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
                            {connectorTypes.map((ct) => {
                                const meta = providerMeta[ct.provider] || providerMeta.postgres
                                const connectionCount = connections.filter(c =>
                                    c.connector_type_id === ct.id || c.db_type === ct.provider
                                ).length
                                return (
                                    <div
                                        key={ct.id}
                                        className={`p-4 rounded-xl border ${meta.bgColor} hover:scale-[1.02] transition-transform cursor-default`}
                                    >
                                        <div className="flex items-center gap-2 mb-2">
                                            {ct.provider === "github" ? (
                                                <Github className={`h-4 w-4 ${meta.color}`} />
                                            ) : ct.provider === "youtube" ? (
                                                <Youtube className={`h-4 w-4 ${meta.color}`} />
                                            ) : ct.provider === "linkedin" ? (
                                                <Linkedin className={`h-4 w-4 ${meta.color}`} />
                                            ) : ct.provider === "notion" ? (
                                                <BookOpen className={`h-4 w-4 ${meta.color}`} />
                                            ) : ct.provider === "tiktok" ? (
                                                <Zap className={`h-4 w-4 ${meta.color}`} />
                                            ) : ct.provider === "newsapi" ? (
                                                <Newspaper className={`h-4 w-4 ${meta.color}`} />
                                            ) : (
                                                <Database className={`h-4 w-4 ${meta.color}`} />
                                            )}
                                            <span className={`text-xs font-bold ${meta.color}`}>{meta.label}</span>
                                        </div>
                                        <p className="text-[10px] text-muted-foreground leading-relaxed">{ct.description}</p>
                                        <p className="text-[10px] text-muted-foreground/60 mt-2">
                                            {connectionCount > 0 ? `${connectionCount} active` : "No connections"}
                                        </p>
                                    </div>
                                )
                            })}
                        </div>
                    </div>

                    {/* ─── Active Connections ─── */}
                    <div>
                        <h2 className="text-xs font-bold text-muted-foreground uppercase tracking-wider mb-4 px-1">Active Connections</h2>

                        {connections.length === 0 ? (
                            <div className="text-center py-12 glass-panel rounded-2xl border border-border">
                                <Plug className="h-10 w-10 text-muted-foreground/30 mx-auto mb-3" />
                                <p className="text-sm text-muted-foreground">No connections configured</p>
                                <p className="text-xs text-muted-foreground/60 mt-1">Click &ldquo;New Connection&rdquo; to connect a data source.</p>
                            </div>
                        ) : (
                            <div className="space-y-3">
                                {connections.map((conn) => {
                                    const provider = conn.connector_types?.provider || conn.db_type
                                    const meta = providerMeta[provider] || providerMeta.postgres
                                    const status = statusMeta[conn.sync_status] || statusMeta.pending
                                    const StatusIcon = status.icon
                                    const isExpanded = expandedId === conn.id
                                    const isSyncing = syncingId === conn.id

                                    return (
                                        <div
                                            key={conn.id}
                                            className={`rounded-2xl border transition-all duration-300 ${isExpanded
                                                ? "glass-panel border-border shadow-sm shadow-primary/5"
                                                : "glass-panel border-border/50 hover:border-border"
                                                }`}
                                        >
                                            <div className="p-5 flex items-center justify-between">
                                                <div className="flex items-center gap-4 min-w-0">
                                                    <div className={`h-10 w-10 rounded-xl flex items-center justify-center border shrink-0 ${meta.bgColor}`}>
                                                        {provider === "github" ? (
                                                            <Github className={`h-5 w-5 ${meta.color}`} />
                                                        ) : provider === "youtube" ? (
                                                            <Youtube className={`h-5 w-5 ${meta.color}`} />
                                                        ) : provider === "linkedin" ? (
                                                            <Linkedin className={`h-5 w-5 ${meta.color}`} />
                                                        ) : provider === "notion" ? (
                                                            <BookOpen className={`h-5 w-5 ${meta.color}`} />
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
                                                        ) : (
                                                            <Database className={`h-5 w-5 ${meta.color}`} />
                                                        )}
                                                    </div>
                                                    <div className="min-w-0">
                                                        <h3 className="text-sm font-bold text-foreground truncate">{conn.label}</h3>
                                                        <div className="flex items-center gap-2 mt-0.5">
                                                            <span className={`text-[10px] font-bold ${meta.color}`}>{meta.label}</span>
                                                            <span className="text-muted-foreground/30">•</span>
                                                            <span className="text-[10px] text-muted-foreground">
                                                                {conn.projects?.name || "Unassigned"}
                                                            </span>
                                                            <span className="text-muted-foreground/30">•</span>
                                                            <StatusIcon className={`h-3 w-3 ${status.color} ${isSyncing ? "animate-spin" : ""}`} />
                                                            <span className={`text-[10px] ${status.color}`}>{isSyncing ? "Syncing..." : status.label}</span>
                                                        </div>
                                                    </div>
                                                </div>

                                                <div className="flex items-center gap-2 shrink-0">
                                                    <span className="text-[10px] text-muted-foreground hidden sm:block">
                                                        Last sync: {formatDate(conn.last_synced_at)}
                                                    </span>
                                                    <Button
                                                        size="sm"
                                                        variant="ghost"
                                                        disabled={isSyncing}
                                                        onClick={() => handleSync(conn.id)}
                                                        className="h-8 px-3 rounded-lg gap-1.5 text-xs"
                                                    >
                                                        <RefreshCcw className={`h-3.5 w-3.5 ${isSyncing ? "animate-spin" : ""}`} />
                                                        Sync
                                                    </Button>
                                                    <button
                                                        onClick={() => setExpandedId(isExpanded ? null : conn.id)}
                                                        className="p-2 hover:bg-white/5 rounded-lg text-muted-foreground"
                                                    >
                                                        {isExpanded ? <ChevronUp className="h-4 w-4" /> : <ChevronDown className="h-4 w-4" />}
                                                    </button>
                                                </div>
                                            </div>

                                            {isExpanded && (
                                                <div className="px-5 pb-5 border-t border-border pt-4">
                                                    <div className="grid grid-cols-2 md:grid-cols-4 gap-4 text-xs">
                                                        <div>
                                                            <p className="text-muted-foreground/60 mb-1">Schedule</p>
                                                            <p className="text-foreground font-medium capitalize">{conn.sync_schedule || "manual"}</p>
                                                        </div>
                                                        <div>
                                                            <p className="text-muted-foreground/60 mb-1">Shared</p>
                                                            <p className="text-foreground font-medium">{conn.is_shared ? "Yes" : "No"}</p>
                                                        </div>
                                                        <div>
                                                            <p className="text-muted-foreground/60 mb-1">Active</p>
                                                            <p className={`font-medium ${conn.is_active ? "text-emerald-400" : "text-red-400"}`}>
                                                                {conn.is_active ? "Yes" : "Disabled"}
                                                            </p>
                                                        </div>
                                                        <div>
                                                            <p className="text-muted-foreground/60 mb-1">Last Synced</p>
                                                            <p className="text-foreground font-medium">{formatDate(conn.last_synced_at)}</p>
                                                        </div>
                                                    </div>

                                                    {conn.sync_config && Object.keys(conn.sync_config).length > 0 && editingConfigId !== conn.id && (
                                                        <div className="mt-4 p-3 rounded-xl bg-muted/5 border border-border relative">
                                                            <Button
                                                                variant="ghost"
                                                                size="icon"
                                                                className="absolute top-2 right-2 h-6 w-6 text-muted-foreground hover:text-foreground"
                                                                onClick={() => { setEditingConfigId(conn.id); setEditConfig({ ...conn.sync_config }) }}
                                                            >
                                                                <Edit2 className="h-3 w-3" />
                                                            </Button>
                                                            <p className="text-[10px] text-muted-foreground/60 uppercase tracking-wider mb-2">Config</p>
                                                            {Object.entries(conn.sync_config).map(([k, v]) => (
                                                                <div key={k} className="flex items-center gap-2 text-[10px]">
                                                                     <span className="text-muted-foreground">{k}:</span>
                                                                     <span className="text-foreground font-mono">
                                                                         {typeof v === "string" && v.length > 20 ? `${v.slice(0, 8)}...${v.slice(-4)}` : String(v)}
                                                                     </span>
                                                                </div>
                                                            ))}
                                                        </div>
                                                    )}

                                                    {editingConfigId === conn.id && (
                                                        <div className="mt-4 p-4 rounded-xl bg-muted/5 border border-primary/20">
                                                            <p className="text-[10px] font-bold text-primary uppercase tracking-wider mb-3">Edit Configuration</p>
                                                            
                                                            {Object.keys(editConfig).map((key) => {
                                                                const schemaField = conn.connector_types?.config_schema?.properties?.[key]
                                                                const isSensitive = schemaField?.sensitive === true
                                                                return (
                                                                <div key={key} className="mb-3">
                                                                    <label className="text-[10px] text-muted-foreground block mb-1">{key}</label>
                                                                    {typeof editConfig[key] === "boolean" ? (
                                                                        <input
                                                                            type="checkbox"
                                                                            checked={editConfig[key]}
                                                                            onChange={(e) => setEditConfig(p => ({ ...p, [key]: e.target.checked }))}
                                                                            className="rounded border-white/20"
                                                                        />
                                                                    ) : key === "tables_to_sync" && conn.db_type === "supabase" ? (
                                                                        <div className="space-y-3">
                                                                            <div className="flex items-center justify-between gap-4">
                                                                                <Button
                                                                                    type="button"
                                                                                    size="sm"
                                                                                    variant="outline"
                                                                                    disabled={isDiscoveringTables || !editConfig.supabase_url || !editConfig.supabase_service_role_key}
                                                                                    onClick={() => handleDiscoverSupabaseTables(true)}
                                                                                    className="h-7 text-[10px] font-black uppercase tracking-widest gap-2 bg-emerald-500/5 hover:bg-emerald-500/10 border-emerald-500/20 text-emerald-500"
                                                                                >
                                                                                    {isDiscoveringTables ? <Loader2 className="h-2 w-2 animate-spin" /> : <RefreshCcw className="h-2 w-2" />}
                                                                                    {availableTables.length > 0 ? "Refresh Tables" : "Discover Tables"}
                                                                                </Button>
                                                                                {availableTables.length > 0 && (
                                                                                    <span className="text-[10px] text-muted-foreground font-bold uppercase tracking-widest">
                                                                                        {availableTables.length} Found
                                                                                    </span>
                                                                                )}
                                                                            </div>

                                                                            {availableTables.length > 0 && (
                                                                                <div className="grid grid-cols-2 gap-2 p-3 rounded-xl bg-emerald-500/5 border border-emerald-500/10 max-h-40 overflow-y-auto custom-scrollbar">
                                                                                    {availableTables.map(table => {
                                                                                        const isSelected = (editConfig.tables_to_sync || []).includes(table)
                                                                                        return (
                                                                                            <label 
                                                                                                key={table} 
                                                                                                className={`flex items-center gap-2 group cursor-pointer p-2 rounded-lg transition-colors ${isSelected ? 'bg-emerald-500/20' : 'hover:bg-white/5'}`}
                                                                                            >
                                                                                                <input 
                                                                                                    type="checkbox" 
                                                                                                    className="hidden" 
                                                                                                    checked={isSelected}
                                                                                                    onChange={() => toggleTableSelection(table, true)}
                                                                                                />
                                                                                                <div className={`h-4 w-4 rounded border flex items-center justify-center transition-colors ${isSelected ? 'bg-emerald-500 border-emerald-500 text-white' : 'border-white/20'}`}>
                                                                                                    {isSelected && <CheckCircle2 className="h-3 w-3" />}
                                                                                                </div>
                                                                                                <span className={`text-[11px] font-bold truncate ${isSelected ? 'text-emerald-400' : 'text-muted-foreground group-hover:text-foreground'}`}>
                                                                                                    {table}
                                                                                                </span>
                                                                                            </label>
                                                                                        )
                                                                                    })}
                                                                                </div>
                                                                            )}
                                                                            {(editConfig.tables_to_sync || []).length > 0 && (
                                                                                <div className="flex flex-wrap gap-1.5">
                                                                                    {(editConfig.tables_to_sync || []).map((t: string) => (
                                                                                        <span key={t} className="px-2 py-0.5 rounded-full bg-emerald-500/20 border border-emerald-500/30 text-[10px] font-bold text-emerald-400">
                                                                                            {t}
                                                                                        </span>
                                                                                    ))}
                                                                                </div>
                                                                            )}
                                                                        </div>
                                                                    ) : (
                                                                        <Input
                                                                            type={isSensitive ? "password" : "text"}
                                                                            value={editConfig[key] || ""}
                                                                            onChange={(e) => setEditConfig(p => ({ ...p, [key]: e.target.value }))}
                                                                            className="h-8 text-xs bg-background border-border rounded-lg"
                                                                        />
                                                                    )}
                                                                </div>
                                                            )})}

                                                            <div className="flex justify-end gap-2 mt-4">
                                                                <Button
                                                                    variant="ghost"
                                                                    size="sm"
                                                                    onClick={() => setEditingConfigId(null)}
                                                                    className="h-7 px-2 text-[10px]"
                                                                >
                                                                    Cancel
                                                                </Button>
                                                                <Button
                                                                    size="sm"
                                                                    disabled={isUpdating}
                                                                    onClick={() => handleUpdateConfig(conn.id)}
                                                                    className="h-7 px-2 text-[10px] bg-primary text-primary-foreground hover:bg-primary/90"
                                                                >
                                                                    {isUpdating ? <Loader2 className="h-3 w-3 animate-spin mr-1" /> : <Save className="h-3 w-3 mr-1" />}
                                                                    Save
                                                                </Button>
                                                            </div>
                                                        </div>
                                                    )}

                                                    <div className="mt-6 flex justify-end">
                                                        <Button
                                                            variant="ghost"
                                                            size="sm"
                                                            onClick={() => handleDelete(conn.id)}
                                                            className="text-red-400 hover:text-red-300 hover:bg-red-500/10 h-8 px-3 rounded-lg gap-2"
                                                        >
                                                            <Trash2 className="h-3.5 w-3.5" />
                                                            Delete Connection
                                                        </Button>
                                                    </div>
                                                </div>
                                            )}
                                        </div>
                                    )
                                })}
                            </div>
                        )}
                    </div>
                </div>
            </div>
        </div>
    )
}
