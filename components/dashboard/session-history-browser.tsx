"use client"

import { useState, useEffect } from "react"
import { Loader2, MessageSquare, Clock, ChevronDown, ChevronUp, FileText } from "lucide-react"
import { createBrowserClient } from "@/lib/supabase/browser"

interface SessionSummary {
    id: string
    session_id: string
    summary: string
    message_count: number
    generated_at: string
    chat_sessions: {
        title: string | null
        model_used: string
        created_at: string
        updated_at: string
    }
}

interface SessionHistoryBrowserProps {
    projectSlug: string
}

export function SessionHistoryBrowser({ projectSlug }: SessionHistoryBrowserProps) {
    const [summaries, setSummaries] = useState<SessionSummary[]>([])
    const [isLoading, setIsLoading] = useState(true)
    const [expandedId, setExpandedId] = useState<string | null>(null)

    useEffect(() => {
        const loadSummaries = async () => {
            try {
                const supabase = createBrowserClient()

                // Get project ID from slug
                const { data: project } = await supabase
                    .from("projects")
                    .select("id")
                    .eq("slug", projectSlug)
                    .single() as any

                if (!project) return

                // Fetch session summaries (RLS ensures only current user's summaries)
                // eslint-disable-next-line @typescript-eslint/no-explicit-any
                const { data, error } = await (supabase as any)
                    .from("session_summaries")
                    .select(`
                        id,
                        session_id,
                        summary,
                        message_count,
                        generated_at,
                        chat_sessions(title, model_used, created_at, updated_at)
                    `)
                    .eq("project_id", project.id)
                    .order("generated_at", { ascending: false })
                    .limit(20) as any

                if (error) {
                    console.error("[SessionHistory] Load error:", error)
                    return
                }

                setSummaries(data || [])
            } catch (err) {
                console.error("[SessionHistory] Error:", err)
            } finally {
                setIsLoading(false)
            }
        }

        loadSummaries()
    }, [projectSlug])

    const formatDate = (dateStr: string) => {
        const d = new Date(dateStr)
        const now = new Date()
        const diffMs = now.getTime() - d.getTime()
        const diffDays = Math.floor(diffMs / (1000 * 60 * 60 * 24))

        if (diffDays === 0) return "Today"
        if (diffDays === 1) return "Yesterday"
        if (diffDays < 7) return `${diffDays} days ago`

        return d.toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric" })
    }

    if (isLoading) {
        return (
            <div className="glass-panel rounded-2xl border border-white/5 p-6">
                <div className="flex items-center justify-center gap-2 py-4">
                    <Loader2 className="h-4 w-4 animate-spin text-primary" />
                    <span className="text-sm text-muted-foreground">Loading session history...</span>
                </div>
            </div>
        )
    }

    if (summaries.length === 0) {
        return (
            <div className="glass-panel rounded-2xl border border-white/5 p-6">
                <div className="flex items-center gap-3 mb-4">
                    <div className="h-8 w-8 rounded-lg bg-indigo-500/10 flex items-center justify-center border border-indigo-500/20">
                        <FileText className="h-4 w-4 text-indigo-400" />
                    </div>
                    <h3 className="text-sm font-bold text-foreground">Session Memory</h3>
                </div>
                <div className="flex flex-col items-center justify-center py-8 text-center">
                    <MessageSquare className="h-10 w-10 text-muted-foreground/30 mb-3" />
                    <p className="text-sm text-muted-foreground">No session summaries yet</p>
                    <p className="text-xs text-muted-foreground/60 mt-1 max-w-xs">
                        Session summaries are generated automatically after conversations.
                        They help the agent remember context from your past interactions.
                    </p>
                </div>
            </div>
        )
    }

    return (
        <div className="glass-panel rounded-2xl border border-white/5 p-6">
            {/* Header */}
            <div className="flex items-center justify-between mb-5">
                <div className="flex items-center gap-3">
                    <div className="h-8 w-8 rounded-lg bg-indigo-500/10 flex items-center justify-center border border-indigo-500/20">
                        <FileText className="h-4 w-4 text-indigo-400" />
                    </div>
                    <div>
                        <h3 className="text-sm font-bold text-foreground">Session Memory</h3>
                        <p className="text-[10px] text-muted-foreground">{summaries.length} past {summaries.length === 1 ? "session" : "sessions"} remembered</p>
                    </div>
                </div>
            </div>

            {/* Summary List */}
            <div className="space-y-2">
                {summaries.map((s) => {
                    const isExpanded = expandedId === s.id
                    const session = s.chat_sessions as any

                    return (
                        <div
                            key={s.id}
                            className={`rounded-xl border transition-all duration-300 ${isExpanded
                                ? "bg-white/[0.03] border-white/10"
                                : "bg-white/[0.01] border-white/5 hover:border-white/10"
                                }`}
                        >
                            <button
                                onClick={() => setExpandedId(isExpanded ? null : s.id)}
                                className="w-full flex items-center justify-between p-3.5 text-left"
                            >
                                <div className="flex items-center gap-3 min-w-0">
                                    <div className="h-8 w-8 rounded-lg bg-primary/10 flex items-center justify-center border border-primary/20 shrink-0">
                                        <MessageSquare className="h-3.5 w-3.5 text-primary" />
                                    </div>
                                    <div className="min-w-0">
                                        <p className="text-xs font-medium text-foreground truncate">
                                            {session?.title || `Session — ${formatDate(s.generated_at)}`}
                                        </p>
                                        <div className="flex items-center gap-2 mt-0.5">
                                            <Clock className="h-3 w-3 text-muted-foreground/50" />
                                            <span className="text-[10px] text-muted-foreground">{formatDate(s.generated_at)}</span>
                                            <span className="text-muted-foreground/30">•</span>
                                            <span className="text-[10px] text-muted-foreground">{s.message_count} messages</span>
                                        </div>
                                    </div>
                                </div>
                                <div className="shrink-0 text-muted-foreground">
                                    {isExpanded ? (
                                        <ChevronUp className="h-4 w-4" />
                                    ) : (
                                        <ChevronDown className="h-4 w-4" />
                                    )}
                                </div>
                            </button>

                            {isExpanded && (
                                <div className="px-3.5 pb-3.5">
                                    <div className="p-3 rounded-lg bg-white/[0.02] border border-white/5">
                                        <p className="text-xs text-muted-foreground leading-relaxed whitespace-pre-line">
                                            {s.summary}
                                        </p>
                                    </div>
                                    <div className="flex items-center gap-2 mt-2 px-1">
                                        <span className="text-[9px] text-muted-foreground/40 uppercase tracking-wider">
                                            Model: {session?.model_used || "unknown"}
                                        </span>
                                    </div>
                                </div>
                            )}
                        </div>
                    )
                })}
            </div>
        </div>
    )
}
