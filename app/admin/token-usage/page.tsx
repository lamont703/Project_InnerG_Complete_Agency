"use client"

import { useState, useEffect } from "react"
import { useRouter } from "next/navigation"
import Link from "next/link"
import {
    Loader2,
    ArrowLeft,
    Zap,
    TrendingUp,
    Shield,
    BarChart3,
    ChevronDown,
    Check,
    AlertTriangle,
} from "lucide-react"
import { Button } from "@/components/ui/button"
import { createBrowserClient } from "@/lib/supabase/browser"

// ─────────────────────────────────────────────
// TIER DEFINITIONS
// ─────────────────────────────────────────────

interface TierDef {
    key: string
    label: string
    tokens: number
    description: string
    icon: React.ElementType
    color: string
    bgColor: string
}

const TIERS: TierDef[] = [
    {
        key: "starter",
        label: "Starter",
        tokens: 100000,
        description: "Basic AI access — answer questions only, basic memory.",
        icon: Zap,
        color: "text-blue-400",
        bgColor: "bg-blue-500/10 border-blue-500/20",
    },
    {
        key: "growth",
        label: "Growth",
        tokens: 500000,
        description: "Full AI access — signal creation, CTA recommendations, full data analysis.",
        icon: TrendingUp,
        color: "text-primary",
        bgColor: "bg-primary/10 border-primary/20",
    },
    {
        key: "enterprise",
        label: "Enterprise",
        tokens: 2000000,
        description: "Unlimited-class AI — all features, priority model access, extended memory.",
        icon: Shield,
        color: "text-violet-400",
        bgColor: "bg-violet-500/10 border-violet-500/20",
    },
]

function formatTokens(n: number): string {
    if (n >= 1000000) return `${(n / 1000000).toFixed(1)}M`
    if (n >= 1000) return `${(n / 1000).toFixed(0)}K`
    return String(n)
}

// ─────────────────────────────────────────────
// USAGE BAR COMPONENT
// ─────────────────────────────────────────────

function UsageBar({ percent, tier }: { percent: number; tier: string }) {
    const barColor =
        percent >= 100
            ? "bg-red-500"
            : percent >= 80
                ? "bg-amber-500"
                : "bg-primary"

    return (
        <div className="w-full h-2.5 rounded-full bg-white/5 overflow-hidden">
            <div
                className={`h-full rounded-full transition-all duration-700 ${barColor}`}
                style={{ width: `${Math.min(percent, 100)}%` }}
            />
        </div>
    )
}

// ─────────────────────────────────────────────
// MAIN PAGE
// ─────────────────────────────────────────────

interface ProjectUsage {
    project_id: string
    project_name: string
    project_slug: string
    tier: string
    monthly_limit: number
    tokens_used: number
    usage_percent: number
    is_over_budget: boolean
}

export default function TokenUsageDashboard() {
    const router = useRouter()
    const [isLoading, setIsLoading] = useState(true)
    const [projects, setProjects] = useState<ProjectUsage[]>([])
    const [editingTier, setEditingTier] = useState<string | null>(null)
    const [savingTier, setSavingTier] = useState<string | null>(null)
    const [totalTokens, setTotalTokens] = useState(0)

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

                // Fetch usage summary
                const { data: usageData, error } = await supabase.rpc("get_token_usage_summary") as any

                if (error) {
                    console.error("[TokenDashboard] Load error:", error)
                } else {
                    setProjects(usageData || [])
                    setTotalTokens(
                        (usageData || []).reduce((sum: number, p: ProjectUsage) => sum + (p.tokens_used || 0), 0)
                    )
                }
            } catch (err) {
                console.error("[TokenDashboard] Error:", err)
            } finally {
                setIsLoading(false)
            }
        }

        load()
    }, [router])

    const handleTierChange = async (projectId: string, newTier: string) => {
        setSavingTier(projectId)
        try {
            const supabase = createBrowserClient()
            // eslint-disable-next-line @typescript-eslint/no-explicit-any
            await (supabase as any)
                .from("projects")
                .update({ ai_tier: newTier })
                .eq("id", projectId)

            // Update local state
            setProjects(prev =>
                prev.map(p =>
                    p.project_id === projectId
                        ? {
                            ...p,
                            tier: newTier,
                            monthly_limit: TIERS.find(t => t.key === newTier)?.tokens || p.monthly_limit,
                            usage_percent: TIERS.find(t => t.key === newTier)?.tokens
                                ? Math.round(p.tokens_used / (TIERS.find(t => t.key === newTier)?.tokens || 1) * 1000) / 10
                                : p.usage_percent,
                            is_over_budget: p.tokens_used >= (TIERS.find(t => t.key === newTier)?.tokens || Infinity),
                        }
                        : p
                )
            )
            setEditingTier(null)
        } catch (err) {
            console.error("[TokenDashboard] Tier update error:", err)
        } finally {
            setSavingTier(null)
        }
    }

    if (isLoading) {
        return (
            <div className="min-h-screen bg-[#020617] flex items-center justify-center">
                <div className="flex flex-col items-center gap-4">
                    <Loader2 className="h-8 w-8 animate-spin text-primary" />
                    <p className="text-sm text-muted-foreground">Loading token usage...</p>
                </div>
            </div>
        )
    }

    return (
        <div className="min-h-screen bg-[#020617] relative">
            {/* Background effects */}
            <div className="absolute top-0 right-0 w-[400px] h-[400px] bg-primary/15 rounded-full blur-[120px] opacity-20 pointer-events-none" />
            <div className="absolute bottom-0 left-0 w-[300px] h-[300px] bg-violet-500/10 rounded-full blur-[100px] opacity-15 pointer-events-none" />

            <div className="relative z-10 max-w-5xl mx-auto px-4 py-8 md:py-12">
                {/* Back Navigation */}
                <Link
                    href="/dashboard/innergcomplete"
                    className="inline-flex items-center gap-2 text-sm text-muted-foreground hover:text-foreground transition-colors mb-8 group"
                >
                    <ArrowLeft className="h-4 w-4 group-hover:-translate-x-0.5 transition-transform" />
                    Back to Agency Dashboard
                </Link>

                {/* Header */}
                <div className="mb-10">
                    <div className="flex items-center gap-3 mb-3">
                        <div className="h-12 w-12 rounded-2xl bg-gradient-to-br from-primary/30 to-amber-500/30 flex items-center justify-center border border-primary/20">
                            <BarChart3 className="h-6 w-6 text-primary" />
                        </div>
                        <div>
                            <h1 className="text-2xl md:text-3xl font-bold text-foreground">
                                Token Usage Dashboard
                            </h1>
                            <p className="text-sm text-muted-foreground">
                                {new Date().toLocaleDateString("en-US", { month: "long", year: "numeric" })}
                            </p>
                        </div>
                    </div>
                    <p className="text-muted-foreground text-sm leading-relaxed max-w-2xl mt-4">
                        Monitor AI token consumption across all projects. Assign tiers to control monthly budgets.
                    </p>
                </div>

                {/* Summary Cards */}
                <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 mb-10">
                    <div className="glass-panel rounded-2xl border border-white/5 p-5">
                        <p className="text-xs text-muted-foreground mb-1 uppercase tracking-wider font-medium">Total Tokens Used</p>
                        <p className="text-3xl font-bold text-foreground">{formatTokens(totalTokens)}</p>
                        <p className="text-[10px] text-muted-foreground mt-1">This month across all projects</p>
                    </div>
                    <div className="glass-panel rounded-2xl border border-white/5 p-5">
                        <p className="text-xs text-muted-foreground mb-1 uppercase tracking-wider font-medium">Active Projects</p>
                        <p className="text-3xl font-bold text-foreground">{projects.length}</p>
                        <p className="text-[10px] text-muted-foreground mt-1">With AI tier assigned</p>
                    </div>
                    <div className="glass-panel rounded-2xl border border-white/5 p-5">
                        <p className="text-xs text-muted-foreground mb-1 uppercase tracking-wider font-medium">Over Budget</p>
                        <p className={`text-3xl font-bold ${projects.some(p => p.is_over_budget) ? "text-red-400" : "text-emerald-400"}`}>
                            {projects.filter(p => p.is_over_budget).length}
                        </p>
                        <p className="text-[10px] text-muted-foreground mt-1">
                            {projects.some(p => p.is_over_budget) ? "Projects at quota limit" : "All projects within budget"}
                        </p>
                    </div>
                </div>

                {/* Project Usage Table */}
                <div className="space-y-3">
                    <div className="flex items-center justify-between mb-2 px-1">
                        <h2 className="text-sm font-bold text-foreground">Project Usage</h2>
                        <p className="text-[10px] text-muted-foreground">Click tier badge to change</p>
                    </div>

                    {projects.map((project) => {
                        const tierDef = TIERS.find(t => t.key === project.tier) || TIERS[1]
                        const TierIcon = tierDef.icon
                        const isEditing = editingTier === project.project_id

                        return (
                            <div
                                key={project.project_id}
                                className={`p-5 rounded-2xl border transition-all duration-300 ${project.is_over_budget
                                        ? "glass-panel border-red-500/20 bg-red-500/[0.02]"
                                        : "glass-panel border-white/5 hover:border-white/10"
                                    }`}
                            >
                                <div className="flex items-start justify-between gap-4 mb-4">
                                    <div className="flex items-center gap-3 min-w-0">
                                        <div className={`h-10 w-10 rounded-xl flex items-center justify-center border shrink-0 ${tierDef.bgColor}`}>
                                            <TierIcon className={`h-5 w-5 ${tierDef.color}`} />
                                        </div>
                                        <div className="min-w-0">
                                            <h3 className="text-sm font-bold text-foreground truncate">
                                                {project.project_name}
                                            </h3>
                                            <p className="text-[10px] text-muted-foreground">/{project.project_slug}</p>
                                        </div>
                                    </div>

                                    {/* Tier Selector */}
                                    <div className="relative">
                                        <button
                                            onClick={() => setEditingTier(isEditing ? null : project.project_id)}
                                            className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg border text-xs font-bold transition-all ${tierDef.bgColor} ${tierDef.color}`}
                                        >
                                            {savingTier === project.project_id ? (
                                                <Loader2 className="h-3 w-3 animate-spin" />
                                            ) : (
                                                <TierIcon className="h-3 w-3" />
                                            )}
                                            {tierDef.label}
                                            <ChevronDown className={`h-3 w-3 transition-transform ${isEditing ? "rotate-180" : ""}`} />
                                        </button>

                                        {isEditing && (
                                            <div className="absolute right-0 top-full mt-1.5 z-20 bg-[#0f172a] border border-white/10 rounded-xl shadow-2xl overflow-hidden min-w-[200px]">
                                                {TIERS.map((t) => (
                                                    <button
                                                        key={t.key}
                                                        onClick={() => handleTierChange(project.project_id, t.key)}
                                                        className={`w-full flex items-center gap-3 px-4 py-3 text-left hover:bg-white/5 transition-colors ${t.key === project.tier ? "bg-white/[0.03]" : ""
                                                            }`}
                                                    >
                                                        <t.icon className={`h-4 w-4 ${t.color}`} />
                                                        <div className="flex-1">
                                                            <p className="text-xs font-bold text-foreground">{t.label}</p>
                                                            <p className="text-[10px] text-muted-foreground">{formatTokens(t.tokens)}/month</p>
                                                        </div>
                                                        {t.key === project.tier && (
                                                            <Check className="h-3.5 w-3.5 text-primary" />
                                                        )}
                                                    </button>
                                                ))}
                                            </div>
                                        )}
                                    </div>
                                </div>

                                {/* Usage Bar */}
                                <div className="mb-2">
                                    <UsageBar percent={project.usage_percent} tier={project.tier} />
                                </div>

                                <div className="flex items-center justify-between">
                                    <div className="flex items-center gap-3">
                                        <span className="text-xs text-muted-foreground">
                                            {formatTokens(project.tokens_used)} / {formatTokens(project.monthly_limit)}
                                        </span>
                                        {project.is_over_budget && (
                                            <span className="flex items-center gap-1 text-[10px] font-bold text-red-400">
                                                <AlertTriangle className="h-3 w-3" />
                                                QUOTA REACHED
                                            </span>
                                        )}
                                    </div>
                                    <span className={`text-xs font-bold ${project.usage_percent >= 100 ? "text-red-400" :
                                            project.usage_percent >= 80 ? "text-amber-400" :
                                                "text-muted-foreground"
                                        }`}>
                                        {project.usage_percent}%
                                    </span>
                                </div>
                            </div>
                        )
                    })}

                    {projects.length === 0 && (
                        <div className="text-center py-12">
                            <BarChart3 className="h-10 w-10 text-muted-foreground/30 mx-auto mb-3" />
                            <p className="text-sm text-muted-foreground">No projects found</p>
                            <p className="text-xs text-muted-foreground/60 mt-1">Token usage will appear here once projects start using the AI agent.</p>
                        </div>
                    )}
                </div>

                {/* Tier Legend */}
                <div className="mt-10 p-5 rounded-2xl glass-panel border border-white/5">
                    <h3 className="text-xs font-bold text-foreground uppercase tracking-wider mb-4">Tier Reference</h3>
                    <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                        {TIERS.map((t) => (
                            <div key={t.key} className={`p-4 rounded-xl border ${t.bgColor}`}>
                                <div className="flex items-center gap-2 mb-2">
                                    <t.icon className={`h-4 w-4 ${t.color}`} />
                                    <span className={`text-sm font-bold ${t.color}`}>{t.label}</span>
                                </div>
                                <p className="text-2xl font-bold text-foreground mb-1">{formatTokens(t.tokens)}</p>
                                <p className="text-[10px] text-muted-foreground">{t.description}</p>
                            </div>
                        ))}
                    </div>
                </div>
            </div>
        </div>
    )
}
