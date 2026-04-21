"use client"

import { useState, useEffect } from "react"
import { useRouter, useParams } from "next/navigation"
import Link from "next/link"
import {
    Zap,
    Filter,
    Target,
    Activity,
    Users,
    GitBranch,
    Loader2,
    Save,
    Check,
    ArrowLeft,
    Info,
    Shield,
    Youtube,
    Music,
    Linkedin,
    Instagram,
    Facebook,
    Twitter,
    AtSign,
    Plus,
    Trash2
} from "lucide-react"
import { Button } from "@/components/ui/button"
import { createBrowserClient } from "@/lib/supabase/browser"
import { AdminHeader } from "@/features/agency/components/AdminHeader"

interface FunnelSource {
    id: string
    enabled: boolean
    metric: string
    label: string
    subLabel: string
    color: string
    hex: string
}

interface FunnelMetric {
    id: string
    label: string
    enabled: boolean
    event_name?: string
}

interface FunnelConfig {
    sources: FunnelSource[]
    engagement: {
        label: string
        subLabel: string
        metrics: FunnelMetric[]
    }
    conversion: {
        label: string
        subLabel: string
        metrics: FunnelMetric[]
    }
    subscribers: {
        label: string
        subLabel: string
        metrics: FunnelMetric[]
    }
}

const PLATFORM_ICONS: Record<string, any> = {
    yt: Youtube,
    tt: Music,
    li: Linkedin,
    ig: Instagram,
    fb: Facebook,
    tw: Twitter,
    th: AtSign,
}

const DEFAULT_CONFIG: FunnelConfig = {
    sources: [
        { id: "yt", enabled: true, metric: "views", label: "YouTube", subLabel: "Channel Views", color: "bg-red-500", hex: "#EF4444" },
        { id: "tt", enabled: true, metric: "totalViews", label: "TikTok", subLabel: "Video Reach", color: "bg-pink-500", hex: "#EC4899" },
        { id: "li", enabled: true, metric: "views", label: "LinkedIn", subLabel: "Post Reach", color: "bg-blue-500", hex: "#3B82F6" },
        { id: "ig", enabled: true, metric: "reach", label: "Instagram", subLabel: "Direct Reach", color: "bg-purple-500", hex: "#A855F7" },
        { id: "fb", enabled: true, metric: "reach", label: "Facebook", subLabel: "Organic Flow", color: "bg-blue-600", hex: "#2563EB" },
        { id: "tw", enabled: false, metric: "reach", label: "X / Twitter", subLabel: "Pulse Traffic", color: "bg-zinc-800", hex: "#A1A1AA" },
        { id: "th", enabled: false, metric: "reach", label: "Threads", subLabel: "Social Threads", color: "bg-zinc-100", hex: "#FFFFFF" }
    ],
    engagement: {
        label: "Engagement Pool",
        subLabel: "Intention Signal Filter",
        metrics: [
            { id: "likes", label: "Total Hearts/Likes", enabled: true },
            { id: "comments", label: "Conversation (Comments)", enabled: true },
            { id: "shares", label: "Share Velocity", enabled: true },
            { id: "visitors", label: "Pixel Unique Visitors", enabled: true }
        ]
    },
    conversion: {
        label: "Conversion Hub",
        subLabel: "Revenue Qualified Output",
        metrics: [
            { id: "step_2", label: "Step #2 Clicks", enabled: true, event_name: "Go To Step #2" },
            { id: "audit_request", label: "Request Audit", enabled: true, event_name: "Request Growth Audit" },
            { id: "audit_schedule", label: "Schedule Audit", enabled: true, event_name: "Schedule a Growth Audit" },
            { id: "school_login", label: "School Logins", enabled: true, event_name: "button-CLEbFRjXN7_btn" }
        ]
    },
    subscribers: {
        label: "Subscribers",
        subLabel: "Audience Retention",
        metrics: [
            { id: "newsletter", label: "Newsletter Signups", enabled: true, event_name: "Newsletter Subscribe" }
        ]
    }
}

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
            className={`relative h-6 w-10 rounded-full transition-all duration-300 ${enabled ? "bg-amber-500 shadow-lg shadow-amber-500/20" : "bg-muted"
                } ${disabled ? "opacity-50 cursor-not-allowed" : "cursor-pointer"}`}
        >
            <span
                className={`absolute top-0.5 left-0.5 h-5 w-5 rounded-full bg-white shadow-sm transition-transform duration-300 ${enabled ? "translate-x-4" : ""
                    }`}
            />
        </button>
    )
}

export default function FunnelConfigPage() {
    const router = useRouter()
    const params = useParams()
    const slug = params.slug as string

    const [isLoading, setIsLoading] = useState(true)
    const [isSaving, setIsSaving] = useState(false)
    const [saveSuccess, setSaveSuccess] = useState(false)
    const [projectName, setProjectName] = useState("")
    const [configId, setConfigId] = useState<string | null>(null)
    const [config, setConfig] = useState<FunnelConfig>(DEFAULT_CONFIG)
    const [funnelEnabled, setFunnelEnabled] = useState(true)
    const [isTogglingMaster, setIsTogglingMaster] = useState(false)

    useEffect(() => {
        const load = async () => {
            try {
                const supabase = createBrowserClient()
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

                const { data: project } = await (supabase
                    .from("projects") as any)
                    .select("id, name, funnel_enabled")
                    .eq("slug", slug)
                    .single()

                if (!project) { router.push("/select-portal"); return }
                setProjectName(project.name)
                setFunnelEnabled(project.funnel_enabled)

                const { data: agentConfig } = await supabase
                    .from("project_agent_config")
                    .select("*")
                    .eq("project_id", project.id)
                    .single() as any

                if (agentConfig) {
                    setConfigId(agentConfig.id)
                    if (agentConfig.funnel_config) {
                        const loadedConfig = agentConfig.funnel_config;
                        if (!loadedConfig.subscribers) {
                            loadedConfig.subscribers = DEFAULT_CONFIG.subscribers;
                        }
                        setConfig(loadedConfig)
                    }
                }
            } catch (err) {
                console.error("[FunnelConfig] Load error:", err)
            } finally {
                setIsLoading(false)
            }
        }
        load()
    }, [slug, router])

    const handleToggleMaster = async () => {
        setIsTogglingMaster(true)
        const newState = !funnelEnabled
        
        try {
            const supabase = createBrowserClient()
            const { error } = await (supabase
                .from("projects") as any)
                .update({ funnel_enabled: newState })
                .eq("slug", slug)

            if (error) throw error
            setFunnelEnabled(newState)
        } catch (err) {
            console.error("[FunnelConfig] Toggle error:", err)
        } finally {
            setIsTogglingMaster(false)
        }
    }

    const handleSave = async () => {
        if (!configId) return
        setIsSaving(true)
        setSaveSuccess(false)

        try {
            const supabase = createBrowserClient()
            const { error } = await (supabase as any)
                .from("project_agent_config")
                .update({ funnel_config: config })
                .eq("id", configId)

            if (error) throw error
            setSaveSuccess(true)
            setTimeout(() => setSaveSuccess(false), 3000)
        } catch (err) {
            console.error("[FunnelConfig] Save error:", err)
        } finally {
            setIsSaving(false)
        }
    }

    const updateSource = (id: string, updates: Partial<FunnelSource>) => {
        setConfig(prev => ({
            ...prev,
            sources: prev.sources.map(s => s.id === id ? { ...s, ...updates } : s)
        }))
    }

    const updateMetric = (category: 'engagement' | 'conversion' | 'subscribers', id: string, updates: Partial<FunnelMetric>) => {
        setConfig(prev => ({
            ...prev,
            [category]: {
                ...prev[category],
                metrics: prev[category].metrics.map(m => m.id === id ? { ...m, ...updates } : m)
            }
        }))
    }

    const addConversionMetric = () => {
        const newMetric: FunnelMetric = {
            id: `custom_${Date.now()}`,
            label: "New Milestone",
            enabled: true,
            event_name: ""
        }
        setConfig(prev => ({
            ...prev,
            conversion: {
                ...prev.conversion,
                metrics: [...prev.conversion.metrics, newMetric]
            }
        }))
    }

    const removeConversionMetric = (id: string) => {
        setConfig(prev => ({
            ...prev,
            conversion: {
                ...prev.conversion,
                metrics: prev.conversion.metrics.filter(m => m.id !== id)
            }
        }))
    }

    const addSubscriberMetric = () => {
        const newMetric: FunnelMetric = {
            id: `sub_${Date.now()}`,
            label: "New Milestone",
            enabled: true,
            event_name: ""
        }
        setConfig(prev => ({
            ...prev,
            subscribers: {
                ...prev.subscribers,
                metrics: [...prev.subscribers.metrics, newMetric]
            }
        }))
    }

    const removeSubscriberMetric = (id: string) => {
        setConfig(prev => ({
            ...prev,
            subscribers: {
                ...prev.subscribers,
                metrics: prev.subscribers.metrics.filter(m => m.id !== id)
            }
        }))
    }

    if (isLoading) {
        return (
            <div className="min-h-screen bg-background flex flex-col items-center justify-center p-6 text-center">
                <Loader2 className="h-10 w-10 animate-spin text-amber-500 mb-4" />
                <h2 className="text-xl font-black uppercase tracking-widest italic text-foreground mb-2">Syncing Funnel Blueprints...</h2>
                <p className="text-muted-foreground text-sm max-w-xs">Connecting to Conversion Logic Controller</p>
            </div>
        )
    }

    return (
        <div className="flex-1 flex flex-col min-h-0 h-full overflow-hidden relative">
            <AdminHeader 
                title="Funnel Architecture" 
                subtitle={`${projectName} • Conversion Logic Sync`}
            />

            <main className="flex-1 overflow-y-auto custom-scrollbar relative z-10 w-full px-6 py-10">
                <div className="max-w-4xl mx-auto pb-32">
                    {/* Back Link */}
                    <div className="mb-8">
                        <Link
                            href={`/admin/projects`}
                            className="flex items-center gap-2 text-xs font-bold text-muted-foreground hover:text-amber-500 transition-all uppercase tracking-widest group"
                        >
                            <ArrowLeft className="h-4 w-4 transition-transform group-hover:-translate-x-1" />
                            Return to Portfolio
                        </Link>
                    </div>

                    <div className="flex flex-col md:flex-row md:items-center justify-between gap-6 mb-12">
                        <div className="space-y-2">
                            <h1 className="text-3xl font-black text-foreground tracking-tight flex items-center gap-3">
                                Funnel <span className="text-amber-500 font-light italic">Blueprint</span>
                            </h1>
                            <p className="text-muted-foreground text-sm max-w-xl leading-relaxed">
                                Customize labels, toggle data sources, and map conversion events to define how the Omni-Channel Funnel visualizes progress for this client.
                            </p>
                        </div>
                        <div className="flex items-center gap-4">
                            <div className={`flex items-center gap-3 px-6 py-3 rounded-2xl border transition-all duration-300 ${funnelEnabled ? 'bg-amber-500/10 border-amber-500/20 shadow-xl shadow-amber-500/5' : 'bg-muted/10 border-border opacity-60'}`}>
                                <div className="flex flex-col items-end">
                                    <span className={`text-[8px] font-black uppercase tracking-[0.2em] ${funnelEnabled ? 'text-amber-500' : 'text-muted-foreground'}`}>
                                        Global Visibility
                                    </span>
                                    <span className="text-[10px] font-bold text-foreground">
                                        {funnelEnabled ? 'ARCH. ACTIVE' : 'ARCH. MASKED'}
                                    </span>
                                </div>
                                <ToggleSwitch 
                                    enabled={funnelEnabled} 
                                    onChange={handleToggleMaster} 
                                    disabled={isTogglingMaster} 
                                />
                            </div>

                            <Button 
                                onClick={handleSave}
                                disabled={isSaving}
                                className="bg-amber-500 hover:bg-amber-600 text-white font-black uppercase text-[10px] tracking-widest h-14 px-10 rounded-2xl shadow-xl shadow-amber-500/10 transition-all border border-amber-400/20"
                            >
                                {isSaving ? <Loader2 className="h-4 w-4 animate-spin mr-2" /> : saveSuccess ? <Check className="h-4 w-4 mr-2" /> : <Save className="h-4 w-4 mr-2" />}
                                {isSaving ? "Syncing..." : saveSuccess ? "Blueprint Synced" : "Pulse Update"}
                            </Button>
                        </div>
                    </div>

                    {/* Section: Intake Sources */}
                    <section className="space-y-4 mb-12">
                        <div className="flex items-center gap-3 mb-6">
                            <div className="p-2 rounded-xl bg-amber-500/10 border border-amber-500/20 text-amber-500">
                                <Zap className="h-4 w-4" />
                            </div>
                            <h2 className="text-xs font-black uppercase tracking-[0.2em] text-foreground">Global Source Intake</h2>
                        </div>

                        <div className="grid grid-cols-1 gap-3">
                            {config.sources.map(source => {
                                const Icon = PLATFORM_ICONS[source.id] || Zap
                                return (
                                    <div key={source.id} className={`p-5 rounded-[2rem] border transition-all duration-300 ${source.enabled ? 'glass-panel border-white/10' : 'bg-white/5 border-white/5 opacity-50'}`}>
                                        <div className="flex items-center gap-6">
                                            <div className={`h-12 w-12 rounded-2xl ${source.color} flex items-center justify-center shadow-2xl`}>
                                                <Icon className="h-6 w-6 text-white" />
                                            </div>
                                            <div className="flex-1 grid grid-cols-1 md:grid-cols-2 gap-4">
                                                <div className="space-y-1">
                                                    <label className="text-[9px] font-black uppercase tracking-widest text-muted-foreground italic">Source Label</label>
                                                    <input 
                                                        value={source.label}
                                                        onChange={(e) => updateSource(source.id, { label: e.target.value })}
                                                        className="w-full bg-white/5 border border-white/10 rounded-xl h-10 px-4 text-sm font-bold focus:ring-1 focus:ring-amber-500 outline-none transition-all"
                                                    />
                                                </div>
                                                <div className="space-y-1">
                                                    <label className="text-[9px] font-black uppercase tracking-widest text-muted-foreground italic">Metric Label</label>
                                                    <input 
                                                        value={source.subLabel}
                                                        onChange={(e) => updateSource(source.id, { subLabel: e.target.value })}
                                                        className="w-full bg-white/5 border border-white/10 rounded-xl h-10 px-4 text-sm font-bold focus:ring-1 focus:ring-amber-500 outline-none transition-all"
                                                    />
                                                </div>
                                            </div>
                                            <div className="flex flex-col items-center gap-2 px-4 border-l border-white/5">
                                                <span className="text-[8px] font-black uppercase tracking-widest text-muted-foreground">{source.enabled ? 'Active' : 'Offline'}</span>
                                                <ToggleSwitch 
                                                    enabled={source.enabled}
                                                    onChange={(v) => updateSource(source.id, { enabled: v })}
                                                />
                                            </div>
                                        </div>
                                    </div>
                                )
                            })}
                        </div>
                    </section>

                    {/* Section: Engagement Hub */}
                    <section className="space-y-4 mb-12">
                        <div className="flex items-center gap-3 mb-6">
                            <div className="p-2 rounded-xl bg-violet-500/10 border border-violet-500/20 text-violet-500">
                                <Activity className="h-4 w-4" />
                            </div>
                            <h2 className="text-xs font-black uppercase tracking-[0.2em] text-foreground">Engagement Pool (Intent)</h2>
                        </div>

                        <div className="glass-panel border-white/10 rounded-[2.5rem] p-8 space-y-6">
                            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                                <div className="space-y-1">
                                    <label className="text-[9px] font-black uppercase tracking-widest text-muted-foreground italic">Main Stage Label</label>
                                    <input 
                                        value={config.engagement.label}
                                        onChange={(e) => setConfig(prev => ({ ...prev, engagement: { ...prev.engagement, label: e.target.value } }))}
                                        className="w-full bg-white/5 border border-white/10 rounded-xl h-10 px-4 text-sm font-bold focus:ring-1 focus:ring-amber-500 outline-none transition-all"
                                    />
                                </div>
                                <div className="space-y-1">
                                    <label className="text-[9px] font-black uppercase tracking-widest text-muted-foreground italic">Stage Goal</label>
                                    <input 
                                        value={config.engagement.subLabel}
                                        onChange={(e) => setConfig(prev => ({ ...prev, engagement: { ...prev.engagement, subLabel: e.target.value } }))}
                                        className="w-full bg-white/5 border border-white/10 rounded-xl h-10 px-4 text-sm font-bold focus:ring-1 focus:ring-amber-500 outline-none transition-all"
                                    />
                                </div>
                            </div>

                            <div className="pt-6 border-t border-white/5">
                                <label className="text-[10px] font-black uppercase tracking-widest text-foreground mb-4 block italic">Enabled Engagement Filters</label>
                                <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
                                    {config.engagement.metrics.map(metric => (
                                        <div key={metric.id} className="flex items-center justify-between p-4 rounded-2xl bg-white/5 border border-white/5">
                                            <span className="text-[10px] font-bold text-muted-foreground leading-tight max-w-[80px]">{metric.label}</span>
                                            <ToggleSwitch 
                                                enabled={metric.enabled}
                                                onChange={(v) => updateMetric('engagement', metric.id, { enabled: v })}
                                            />
                                        </div>
                                    ))}
                                </div>
                            </div>
                        </div>
                    </section>

                    {/* Section: Conversion Hub */}
                    <section className="space-y-4">
                        <div className="flex items-center gap-3 mb-6">
                            <div className="p-2 rounded-xl bg-emerald-500/10 border border-emerald-500/20 text-emerald-500">
                                <Target className="h-4 w-4" />
                            </div>
                            <h2 className="text-xs font-black uppercase tracking-[0.2em] text-foreground">Conversion Hub (Revenue)</h2>
                        </div>

                        <div className="glass-panel border-white/10 rounded-[2.5rem] p-8 space-y-8">
                             <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                                <div className="space-y-1">
                                    <label className="text-[9px] font-black uppercase tracking-widest text-muted-foreground italic">Main Stage Label</label>
                                    <input 
                                        value={config.conversion.label}
                                        onChange={(e) => setConfig(prev => ({ ...prev, conversion: { ...prev.conversion, label: e.target.value } }))}
                                        className="w-full bg-white/5 border border-white/10 rounded-xl h-10 px-4 text-sm font-bold focus:ring-1 focus:ring-amber-500 outline-none transition-all"
                                    />
                                </div>
                                <div className="space-y-1">
                                    <label className="text-[9px] font-black uppercase tracking-widest text-muted-foreground italic">Stage Goal</label>
                                    <input 
                                        value={config.conversion.subLabel}
                                        onChange={(e) => setConfig(prev => ({ ...prev, conversion: { ...prev.conversion, subLabel: e.target.value } }))}
                                        className="w-full bg-white/5 border border-white/10 rounded-xl h-10 px-4 text-sm font-bold focus:ring-1 focus:ring-amber-500 outline-none transition-all"
                                    />
                                </div>
                            </div>

                            <div className="space-y-4 pt-6 border-t border-white/5">
                                <div className="flex items-center justify-between mb-4">
                                    <label className="text-[10px] font-black uppercase tracking-widest text-foreground block italic">High-Value Event Mapping</label>
                                    <Button 
                                        variant="ghost" 
                                        size="sm"
                                        onClick={addConversionMetric}
                                        className="h-8 px-3 rounded-xl bg-emerald-500/5 hover:bg-emerald-500/10 border border-emerald-500/10 text-emerald-500 text-[9px] font-black uppercase tracking-widest gap-2"
                                    >
                                        <Plus className="h-3.5 w-3.5" />
                                        Add Milestone
                                    </Button>
                                </div>
                                <div className="space-y-3">
                                    {config.conversion.metrics.map(metric => (
                                        <div key={metric.id} className="flex flex-col md:flex-row md:items-center gap-4 p-5 rounded-2xl bg-white/5 border border-white/5 group hover:border-emerald-500/20 transition-all relative">
                                            <div className="flex-1 space-y-1">
                                                <label className="text-[8px] font-black uppercase tracking-widest text-muted-foreground italic">Display Title</label>
                                                <input 
                                                    value={metric.label}
                                                    onChange={(e) => updateMetric('conversion', metric.id, { label: e.target.value })}
                                                    className="w-full bg-white/5 border border-white/10 rounded-xl h-10 px-4 text-sm font-bold outline-none focus:border-emerald-500/50 transition-all font-mono"
                                                    placeholder="e.g. Purchase Button"
                                                />
                                            </div>
                                            <div className="flex-[2] space-y-1">
                                                <label className="text-[8px] font-black uppercase tracking-widest text-muted-foreground italic">Pixel Event Name / Element ID</label>
                                                <input 
                                                    value={metric.event_name}
                                                    onChange={(e) => updateMetric('conversion', metric.id, { event_name: e.target.value })}
                                                    className="w-full bg-white/5 border border-white/10 rounded-xl h-10 px-4 text-sm font-bold outline-none focus:border-emerald-500/50 transition-all font-mono"
                                                    placeholder="e.g. purchase_callback or id-123"
                                                />
                                            </div>
                                            <div className="flex flex-row md:flex-col items-center gap-2 px-4 border-l border-white/5 h-full">
                                                <span className="text-[8px] font-black uppercase tracking-widest text-muted-foreground">{metric.enabled ? 'Track' : 'Ignore'}</span>
                                                <div className="flex items-center gap-2">
                                                    <ToggleSwitch 
                                                        enabled={metric.enabled}
                                                        onChange={(v) => updateMetric('conversion', metric.id, { enabled: v })}
                                                    />
                                                    <button 
                                                        onClick={() => removeConversionMetric(metric.id)}
                                                        className="p-1 rounded-lg text-muted-foreground hover:text-red-400 hover:bg-red-400/10 transition-all ml-1"
                                                    >
                                                        <Trash2 className="h-3.5 w-3.5" />
                                                    </button>
                                                </div>
                                            </div>
                                        </div>
                                    ))}
                                </div>
                            </div>
                        </div>
                    </section>

                    {/* Section: Subscribers Hub */}
                    <section className="space-y-4 mb-12">
                        <div className="flex items-center gap-3 mb-6">
                            <div className="p-2 rounded-xl bg-amber-500/10 border border-amber-500/20 text-amber-500">
                                <Users className="h-4 w-4" />
                            </div>
                            <h2 className="text-xs font-black uppercase tracking-[0.2em] text-foreground">Subscribers Hub (Retention)</h2>
                        </div>

                        <div className="glass-panel border-white/10 rounded-[2.5rem] p-8 space-y-8">
                             <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                                <div className="space-y-1">
                                    <label className="text-[9px] font-black uppercase tracking-widest text-muted-foreground italic">Main Stage Label</label>
                                    <input 
                                        value={config.subscribers.label}
                                        onChange={(e) => setConfig(prev => ({ ...prev, subscribers: { ...prev.subscribers, label: e.target.value } }))}
                                        className="w-full bg-white/5 border border-white/10 rounded-xl h-10 px-4 text-sm font-bold focus:ring-1 focus:ring-amber-500 outline-none transition-all"
                                    />
                                </div>
                                <div className="space-y-1">
                                    <label className="text-[9px] font-black uppercase tracking-widest text-muted-foreground italic">Stage Goal</label>
                                    <input 
                                        value={config.subscribers.subLabel}
                                        onChange={(e) => setConfig(prev => ({ ...prev, subscribers: { ...prev.subscribers, subLabel: e.target.value } }))}
                                        className="w-full bg-white/5 border border-white/10 rounded-xl h-10 px-4 text-sm font-bold focus:ring-1 focus:ring-amber-500 outline-none transition-all"
                                    />
                                </div>
                            </div>

                            <div className="space-y-4 pt-6 border-t border-white/5">
                                <div className="flex items-center justify-between mb-4">
                                    <label className="text-[10px] font-black uppercase tracking-widest text-foreground block italic">High-Value Event Mapping</label>
                                    <Button 
                                        variant="ghost" 
                                        size="sm"
                                        onClick={addSubscriberMetric}
                                        className="h-8 px-3 rounded-xl bg-amber-500/5 hover:bg-amber-500/10 border border-amber-500/10 text-amber-500 text-[9px] font-black uppercase tracking-widest gap-2"
                                    >
                                        <Plus className="h-3.5 w-3.5" />
                                        Add Milestone
                                    </Button>
                                </div>
                                <div className="space-y-3">
                                    {config.subscribers.metrics.map(metric => (
                                        <div key={metric.id} className="flex flex-col md:flex-row md:items-center gap-4 p-5 rounded-2xl bg-white/5 border border-white/5 group hover:border-amber-500/20 transition-all relative">
                                            <div className="flex-1 space-y-1">
                                                <label className="text-[8px] font-black uppercase tracking-widest text-muted-foreground italic">Display Title</label>
                                                <input 
                                                    value={metric.label}
                                                    onChange={(e) => updateMetric('subscribers', metric.id, { label: e.target.value })}
                                                    className="w-full bg-white/5 border border-white/10 rounded-xl h-10 px-4 text-sm font-bold outline-none focus:border-amber-500/50 transition-all font-mono"
                                                    placeholder="e.g. Newsletter Subscription"
                                                />
                                            </div>
                                            <div className="flex-[2] space-y-1">
                                                <label className="text-[8px] font-black uppercase tracking-widest text-muted-foreground italic">Pixel Event Name / Element ID</label>
                                                <input 
                                                    value={metric.event_name}
                                                    onChange={(e) => updateMetric('subscribers', metric.id, { event_name: e.target.value })}
                                                    className="w-full bg-white/5 border border-white/10 rounded-xl h-10 px-4 text-sm font-bold outline-none focus:border-amber-500/50 transition-all font-mono"
                                                    placeholder="e.g. subscribe_callback or id-123"
                                                />
                                            </div>
                                            <div className="flex flex-row md:flex-col items-center gap-2 px-4 border-l border-white/5 h-full">
                                                <span className="text-[8px] font-black uppercase tracking-widest text-muted-foreground">{metric.enabled ? 'Track' : 'Ignore'}</span>
                                                <div className="flex items-center gap-2">
                                                    <ToggleSwitch 
                                                        enabled={metric.enabled}
                                                        onChange={(v) => updateMetric('subscribers', metric.id, { enabled: v })}
                                                    />
                                                    <button 
                                                        onClick={() => removeSubscriberMetric(metric.id)}
                                                        className="p-1 rounded-lg text-muted-foreground hover:text-red-400 hover:bg-red-400/10 transition-all ml-1"
                                                    >
                                                        <Trash2 className="h-3.5 w-3.5" />
                                                    </button>
                                                </div>
                                            </div>
                                        </div>
                                    ))}
                                </div>
                            </div>
                        </div>
                    </section>

                    {/* Footer Info */}
                    <div className="mt-12 flex items-start gap-4 p-6 rounded-3xl bg-amber-500/5 border border-amber-500/10">
                        <Info className="h-5 w-5 text-amber-500 shrink-0 mt-1" />
                        <div className="text-xs text-muted-foreground leading-relaxed">
                            <p className="font-bold text-foreground mb-2 italic uppercase tracking-widest">Architectural Guidelines</p>
                            <p>
                                Changes saved here will update the <strong>Omni-Channel Stream</strong> visualization across the entire agency dashboard for this project. 
                                High-value event mapping tells the telemetry engine exactly which Pixel events (clicks, form submits) should be counted as conversion milestones in the Conversion Hub.
                            </p>
                        </div>
                    </div>
                </div>
            </main>
        </div>
    )
}
