"use client"

import { useState, useEffect } from "react"
import { useRouter, useParams } from "next/navigation"
import Link from "next/link"
import {
    Settings,
    BarChart3,
    AlertTriangle,
    Activity,
    Users,
    GitBranch,
    RefreshCw,
    Wifi,
    MessageSquare,
    Loader2,
    Save,
    Check,
    ArrowLeft,
    Info,
    Shield,
} from "lucide-react"
import { Button } from "@/components/ui/button"
import { createBrowserClient } from "@/lib/supabase/browser"

// ─────────────────────────────────────────────
// DATA SOURCE DEFINITIONS
// ─────────────────────────────────────────────

interface DataSourceDef {
    key: string
    dbColumn: string
    label: string
    description: string
    exampleQuestion: string
    icon: React.ElementType
    color: string
}

const DATA_SOURCES: DataSourceDef[] = [
    {
        key: "campaign_metrics",
        dbColumn: "campaign_metrics_enabled",
        label: "Campaign Metrics",
        description: "Daily KPI snapshots — signups, installs, activation rate, reach, engagement.",
        exampleQuestion: "What was our signup rate last week?",
        icon: BarChart3,
        color: "text-blue-400 bg-blue-500/10 border-blue-500/20",
    },
    {
        key: "ai_signals",
        dbColumn: "ai_signals_enabled",
        label: "AI Signals",
        description: "Agent-generated intelligence signals — warnings, insights, and action items.",
        exampleQuestion: "What signals were flagged this month?",
        icon: AlertTriangle,
        color: "text-amber-400 bg-amber-500/10 border-amber-500/20",
    },
    {
        key: "activity_log",
        dbColumn: "activity_log_enabled",
        label: "Activity Log",
        description: "Chronological audit trail of system events, user actions, and sync triggers.",
        exampleQuestion: "What happened yesterday?",
        icon: Activity,
        color: "text-emerald-400 bg-emerald-500/10 border-emerald-500/20",
    },
    {
        key: "ghl_contacts",
        dbColumn: "ghl_contacts_enabled",
        label: "GHL Contacts",
        description: "GoHighLevel CRM contacts synced for this project.",
        exampleQuestion: "How many new contacts this week?",
        icon: Users,
        color: "text-pink-400 bg-pink-500/10 border-pink-500/20",
    },
    {
        key: "funnel_data",
        dbColumn: "funnel_data_enabled",
        label: "Funnel Data",
        description: "Funnel stage counts and conversion events for campaign funnels.",
        exampleQuestion: "What's our funnel conversion rate?",
        icon: GitBranch,
        color: "text-violet-400 bg-violet-500/10 border-violet-500/20",
    },
    {
        key: "integration_sync",
        dbColumn: "integration_sync_enabled",
        label: "Integration Sync",
        description: "Sync run logs — which integrations ran, records processed, errors.",
        exampleQuestion: "When was the last successful sync?",
        icon: RefreshCw,
        color: "text-cyan-400 bg-cyan-500/10 border-cyan-500/20",
    },
    {
        key: "system_connections",
        dbColumn: "system_connections_enabled",
        label: "System Connections",
        description: "Health status of connected platforms — database, CRM, social accounts.",
        exampleQuestion: "Are all integrations online?",
        icon: Wifi,
        color: "text-orange-400 bg-orange-500/10 border-orange-500/20",
    },
    {
        key: "chat_history",
        dbColumn: "chat_history_enabled",
        label: "Chat History",
        description: "Session summaries from past conversations — long-term memory for the agent.",
        exampleQuestion: "What did we discuss last time?",
        icon: MessageSquare,
        color: "text-indigo-400 bg-indigo-500/10 border-indigo-500/20",
    },
]

// ─────────────────────────────────────────────
// TOGGLE SWITCH COMPONENT
// ─────────────────────────────────────────────

function ToggleSwitch({
    enabled,
    onChange,
    disabled,
}: {
    enabled: boolean
    onChange: (v: boolean) => void
    disabled?: boolean
}) {
    return (
        <button
            type="button"
            disabled={disabled}
            onClick={() => onChange(!enabled)}
            className={`relative h-7 w-12 rounded-full transition-all duration-300 ${enabled ? "bg-primary shadow-lg shadow-primary/30" : "bg-white/10"
                } ${disabled ? "opacity-50 cursor-not-allowed" : "cursor-pointer"}`}
        >
            <span
                className={`absolute top-0.5 left-0.5 h-6 w-6 rounded-full bg-white shadow-md transition-transform duration-300 ${enabled ? "translate-x-5" : ""
                    }`}
            />
        </button>
    )
}

// ─────────────────────────────────────────────
// MAIN PAGE
// ─────────────────────────────────────────────

export default function AgentConfigPage() {
    const router = useRouter()
    const params = useParams()
    const slug = params.slug as string

    const [isLoading, setIsLoading] = useState(true)
    const [isSaving, setIsSaving] = useState(false)
    const [saveSuccess, setSaveSuccess] = useState(false)
    const [projectName, setProjectName] = useState("")
    const [configId, setConfigId] = useState<string | null>(null)

    // Config state — mirrors project_agent_config columns
    const [config, setConfig] = useState<Record<string, boolean>>({
        campaign_metrics_enabled: true,
        ai_signals_enabled: true,
        activity_log_enabled: true,
        ghl_contacts_enabled: true,
        funnel_data_enabled: true,
        integration_sync_enabled: true,
        system_connections_enabled: true,
        chat_history_enabled: true,
    })

    // Count enabled/disabled
    const enabledCount = Object.values(config).filter(Boolean).length
    const disabledCount = DATA_SOURCES.length - enabledCount

    useEffect(() => {
        const load = async () => {
            try {
                const supabase = createBrowserClient()

                // Auth + role check
                const { data: { user } } = await supabase.auth.getUser()
                if (!user) { router.push("/login"); return }

                const { data: profile } = await supabase
                    .from("users")
                    .select("role")
                    .eq("id", user.id)
                    .single() as any

                if (!profile || profile.role !== "super_admin") {
                    router.push("/select-portal")
                    return
                }

                // Fetch project
                const { data: project } = await supabase
                    .from("projects")
                    .select("id, name")
                    .eq("slug", slug)
                    .single() as any

                if (!project) { router.push("/select-portal"); return }
                setProjectName(project.name)

                // Fetch config
                const { data: agentConfig } = await supabase
                    .from("project_agent_config")
                    .select("*")
                    .eq("project_id", project.id)
                    .single() as any

                if (agentConfig) {
                    setConfigId(agentConfig.id)
                    setConfig({
                        campaign_metrics_enabled: agentConfig.campaign_metrics_enabled ?? true,
                        ai_signals_enabled: agentConfig.ai_signals_enabled ?? true,
                        activity_log_enabled: agentConfig.activity_log_enabled ?? true,
                        ghl_contacts_enabled: agentConfig.ghl_contacts_enabled ?? true,
                        funnel_data_enabled: agentConfig.funnel_data_enabled ?? true,
                        integration_sync_enabled: agentConfig.integration_sync_enabled ?? true,
                        system_connections_enabled: agentConfig.system_connections_enabled ?? true,
                        chat_history_enabled: agentConfig.chat_history_enabled ?? true,
                    })
                }
            } catch (err) {
                console.error("[AgentConfig] Load error:", err)
            } finally {
                setIsLoading(false)
            }
        }

        load()
    }, [slug, router])

    const handleSave = async () => {
        if (!configId) return
        setIsSaving(true)
        setSaveSuccess(false)

        try {
            const supabase = createBrowserClient()
            // eslint-disable-next-line @typescript-eslint/no-explicit-any
            const updateResult = await (supabase as any)
                .from("project_agent_config")
                .update(config)
                .eq("id", configId)

            if (updateResult.error) throw updateResult.error
            setSaveSuccess(true)
            setTimeout(() => setSaveSuccess(false), 3000)
        } catch (err) {
            console.error("[AgentConfig] Save error:", err)
        } finally {
            setIsSaving(false)
        }
    }

    const handleToggle = (dbColumn: string, value: boolean) => {
        setConfig(prev => ({ ...prev, [dbColumn]: value }))
        setSaveSuccess(false)
    }

    const handleEnableAll = () => {
        const allEnabled: Record<string, boolean> = {}
        DATA_SOURCES.forEach(ds => { allEnabled[ds.dbColumn] = true })
        setConfig(allEnabled)
        setSaveSuccess(false)
    }

    const handleDisableAll = () => {
        const allDisabled: Record<string, boolean> = {}
        DATA_SOURCES.forEach(ds => { allDisabled[ds.dbColumn] = false })
        setConfig(allDisabled)
        setSaveSuccess(false)
    }

    if (isLoading) {
        return (
            <div className="min-h-screen bg-[#020617] flex items-center justify-center">
                <div className="flex flex-col items-center gap-4">
                    <Loader2 className="h-8 w-8 animate-spin text-primary" />
                    <p className="text-sm text-muted-foreground">Loading Agent Configuration...</p>
                </div>
            </div>
        )
    }

    return (
        <div className="min-h-screen bg-[#020617] relative">
            {/* Background ambient effects */}
            <div className="absolute top-0 right-0 w-[400px] h-[400px] bg-primary/15 rounded-full blur-[120px] opacity-20 pointer-events-none" />
            <div className="absolute bottom-0 left-0 w-[300px] h-[300px] bg-violet-500/10 rounded-full blur-[100px] opacity-15 pointer-events-none" />

            <div className="relative z-10 max-w-4xl mx-auto px-4 py-8 md:py-12">
                {/* Back Navigation */}
                <Link
                    href={`/dashboard/${slug}`}
                    className="inline-flex items-center gap-2 text-sm text-muted-foreground hover:text-foreground transition-colors mb-8 group"
                >
                    <ArrowLeft className="h-4 w-4 group-hover:-translate-x-0.5 transition-transform" />
                    Back to {projectName} Dashboard
                </Link>

                {/* Header */}
                <div className="mb-10">
                    <div className="flex items-center gap-3 mb-3">
                        <div className="h-12 w-12 rounded-2xl bg-gradient-to-br from-primary/30 to-violet-500/30 flex items-center justify-center border border-primary/20">
                            <Settings className="h-6 w-6 text-primary" />
                        </div>
                        <div>
                            <h1 className="text-2xl md:text-3xl font-bold text-foreground">
                                AI Agent Configuration
                            </h1>
                            <p className="text-sm text-muted-foreground">
                                {projectName}
                            </p>
                        </div>
                    </div>
                    <p className="text-muted-foreground text-sm leading-relaxed max-w-2xl mt-4">
                        Control which data sources feed the Growth Assistant for this project.
                        Disabled sources will not be searched during RAG queries — the agent won't reference them.
                    </p>
                </div>

                {/* Summary Bar */}
                <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 mb-8 p-4 rounded-2xl glass-panel border border-white/5">
                    <div className="flex items-center gap-6">
                        <div className="flex items-center gap-2">
                            <div className="h-3 w-3 rounded-full bg-primary" />
                            <span className="text-sm text-foreground font-medium">{enabledCount} enabled</span>
                        </div>
                        {disabledCount > 0 && (
                            <div className="flex items-center gap-2">
                                <div className="h-3 w-3 rounded-full bg-white/20" />
                                <span className="text-sm text-muted-foreground">{disabledCount} disabled</span>
                            </div>
                        )}
                    </div>
                    <div className="flex items-center gap-2">
                        <Button
                            variant="ghost"
                            size="sm"
                            onClick={handleEnableAll}
                            className="text-xs text-muted-foreground hover:text-primary"
                        >
                            Enable All
                        </Button>
                        <span className="text-white/10">|</span>
                        <Button
                            variant="ghost"
                            size="sm"
                            onClick={handleDisableAll}
                            className="text-xs text-muted-foreground hover:text-destructive"
                        >
                            Disable All
                        </Button>
                    </div>
                </div>

                {/* Data Source Toggles */}
                <div className="space-y-3 mb-10">
                    {DATA_SOURCES.map((ds) => {
                        const isEnabled = config[ds.dbColumn] ?? true
                        return (
                            <div
                                key={ds.key}
                                className={`p-5 rounded-2xl border transition-all duration-300 ${isEnabled
                                    ? "glass-panel border-white/10 hover:border-white/15"
                                    : "bg-white/[0.01] border-white/5 opacity-60 hover:opacity-80"
                                    }`}
                            >
                                <div className="flex items-start justify-between gap-4">
                                    <div className="flex items-start gap-4 flex-1 min-w-0">
                                        <div className={`h-10 w-10 rounded-xl flex items-center justify-center border shrink-0 transition-all ${isEnabled ? ds.color : "bg-white/5 text-muted-foreground border-white/10"
                                            }`}>
                                            <ds.icon className="h-5 w-5" />
                                        </div>
                                        <div className="flex-1 min-w-0">
                                            <div className="flex items-center gap-2 mb-1">
                                                <h3 className={`text-sm font-bold transition-colors ${isEnabled ? "text-foreground" : "text-muted-foreground"
                                                    }`}>
                                                    {ds.label}
                                                </h3>
                                                {isEnabled && (
                                                    <span className="text-[9px] font-bold uppercase tracking-widest px-1.5 py-0.5 rounded-full bg-primary/10 text-primary">
                                                        Active
                                                    </span>
                                                )}
                                            </div>
                                            <p className="text-xs text-muted-foreground leading-relaxed">{ds.description}</p>
                                            <p className="text-[11px] text-muted-foreground/50 mt-1.5 italic">
                                                Example: "{ds.exampleQuestion}"
                                            </p>
                                        </div>
                                    </div>
                                    <ToggleSwitch
                                        enabled={isEnabled}
                                        onChange={(v) => handleToggle(ds.dbColumn, v)}
                                    />
                                </div>
                            </div>
                        )
                    })}
                </div>

                {/* Info Note */}
                <div className="flex items-start gap-3 p-4 rounded-2xl bg-blue-500/5 border border-blue-500/10 mb-8">
                    <Info className="h-4 w-4 text-blue-400 shrink-0 mt-0.5" />
                    <div className="text-xs text-blue-300/80 leading-relaxed">
                        <p className="font-medium text-blue-400 mb-1">How this works</p>
                        <p>
                            When a user asks the Growth Assistant a question, it first embeds the query and searches
                            your project's vector database for relevant context. Only <strong>enabled</strong> data sources
                            are included in that search. Disabling a source means the agent won't see or reference that
                            data — useful for projects that don't use certain integrations.
                        </p>
                    </div>
                </div>

                {/* Security Note */}
                <div className="flex items-start gap-3 p-4 rounded-2xl bg-violet-500/5 border border-violet-500/10 mb-8">
                    <Shield className="h-4 w-4 text-violet-400 shrink-0 mt-0.5" />
                    <p className="text-xs text-violet-300/80 leading-relaxed">
                        <span className="font-medium text-violet-400">Super Admin only.</span>{" "}
                        Only Super Admins can modify these settings. Project members and developers
                        cannot change which data sources the agent has access to.
                    </p>
                </div>

                {/* Save Button */}
                <div className="flex items-center gap-4 sticky bottom-6">
                    <Button
                        onClick={handleSave}
                        disabled={isSaving}
                        className="px-8 h-12 rounded-xl text-sm font-bold shadow-lg shadow-primary/20 transition-all"
                    >
                        {isSaving ? (
                            <><Loader2 className="h-4 w-4 animate-spin mr-2" /> Saving...</>
                        ) : saveSuccess ? (
                            <><Check className="h-4 w-4 mr-2" /> Saved!</>
                        ) : (
                            <><Save className="h-4 w-4 mr-2" /> Save Configuration</>
                        )}
                    </Button>

                    {saveSuccess && (
                        <span className="text-xs text-emerald-400 font-medium animate-in fade-in slide-in-from-left-2">
                            Configuration updated — changes take effect on the next chat message.
                        </span>
                    )}
                </div>
            </div>
        </div>
    )
}
