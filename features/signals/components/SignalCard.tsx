import { useState, useEffect } from "react"
import { Database, Zap, Instagram, Loader2, ArrowUpRight, Bug, ChevronDown, ChevronUp, Trash2, Send } from "lucide-react"
import { Button } from "@/components/ui/button"
import { Signal } from "../types"
import { createBrowserClient } from "@/lib/supabase/browser"

const TYPE_ICONS: Record<string, any> = {
    inventory: Database,
    conversion: Zap,
    social: Instagram,
    bug_report: Bug,
    strategic: Zap,
    ai_insight: Zap,
}

interface SignalCardProps {
    signal: Signal
    isResolving: boolean
    onResolve: (id: string) => void
    onDeleteAction?: (draftId: string, projectId: string) => Promise<void>
    isHighlighted?: boolean
    isAgencyMode?: boolean
}

export function SignalCard({ 
    signal, 
    isResolving, 
    onResolve, 
    onDeleteAction,
    isAgencyMode = false, 
    isHighlighted = false 
}: SignalCardProps) {
    const [isExpanded, setIsExpanded] = useState(false)
    const [draftContent, setDraftContent] = useState<string | null>(null)
    const [isFetchingDraft, setIsFetchingDraft] = useState(false)
    const [isDeleting, setIsDeleting] = useState(false)

    const Icon = TYPE_ICONS[signal.signalType] || Zap
    const isAgencyInsight = signal.isAgencyOnly || isAgencyMode
    const socialPlanId = signal.metadata?.social_plan_id
    const isLongBody = signal.body.length > 120

    const handleDiscuss = (e: React.MouseEvent) => {
        e.stopPropagation()
        const eventName = isAgencyInsight ? 'innerg-agency-discuss-signal' : 'innerg-discuss-signal'
        window.dispatchEvent(new CustomEvent(eventName, {
            detail: {
                signalTitle: signal.title,
                signalBody: signal.body
            }
        }))
    }

    const toggleExpand = async (e: React.MouseEvent) => {
        e.stopPropagation()
        const newExpanded = !isExpanded
        setIsExpanded(newExpanded)

        if (newExpanded && socialPlanId && !draftContent) {
            setIsFetchingDraft(true)
            try {
                const supabase = createBrowserClient()
                const { data } = await supabase
                    .from("social_content_plan")
                    .select("content_text")
                    .eq("id", socialPlanId)
                    .single() as { data: { content_text: string } | null }
                
                if (data) {
                    setDraftContent(data.content_text)
                }
            } catch (err) {
                console.error("Failed to fetch draft content:", err)
            } finally {
                setIsFetchingDraft(false)
            }
        }
    }

    const handleDelete = async (e: React.MouseEvent) => {
        e.stopPropagation()
        if (!socialPlanId || !onDeleteAction || !(signal as any).project_id) return
        
        setIsDeleting(true)
        try {
            await onDeleteAction(socialPlanId, (signal as any).project_id)
        } catch (err) {
            console.error("Delete failed:", err)
        } finally {
            setIsDeleting(false)
        }
    }

    return (
        <div className={`glass-panel-strong rounded-3xl p-8 border relative overflow-hidden group transition-all duration-700 hover:shadow-2xl ${isHighlighted ? "border-emerald-500 shadow-[0_0_30px_rgba(16,185,129,0.2)] animate-pulse" : isAgencyInsight
            ? "border-primary/20 hover:border-primary/40 hover:shadow-primary/10 bg-primary/[0.02]"
            : "border-white/[0.05] hover:border-white/10 hover:shadow-primary/5"
            }`}>
            {/* Ambient electric gradient */}
            <div className="absolute inset-0 bg-gradient-to-br from-primary/5 via-transparent to-accent/5 opacity-0 group-hover:opacity-100 transition-opacity pointer-events-none" />

            {/* Pulse Indicator */}
            <div className="absolute top-0 right-0 p-6">
                <div className="flex items-center gap-2">
                    <span className="text-[9px] font-black uppercase tracking-[0.3em] text-muted-foreground/20">
                        {isAgencyInsight ? "Intelligence Layer" : "Monitoring"}
                    </span>
                    <span className={`flex h-2 w-2 rounded-full animate-pulse ${isAgencyInsight ? "bg-violet-500 shadow-[0_0_12px_rgba(139,92,246,0.6)]" : `${signal.color} shadow-[0_0_12px_rgba(var(--primary),0.6)]`
                        }`} />
                </div>
            </div>

            <div className="flex flex-col md:flex-row md:items-start gap-6 relative z-10">
                {/* Visual Icon Pillar */}
                <div className={`shrink-0 h-14 w-14 rounded-2xl flex items-center justify-center border border-white/5 shadow-inner transition-transform duration-500 group-hover:scale-110 ${isAgencyInsight ? "bg-violet-500/10 border-violet-500/20" : "bg-white/5"
                    }`}>
                    <Icon className={`h-7 w-7 ${isAgencyInsight ? "text-violet-400" : signal.color.replace('bg-', 'text-')}`} />
                </div>

                <div className="flex-1">
                    <div className="flex items-center gap-3 mb-3">
                        <span className={`px-2.5 py-1 rounded-md text-[8px] font-black uppercase tracking-[0.2em] border border-white/5 ${isAgencyInsight
                            ? "bg-violet-500/10 text-violet-400 border-violet-500/20"
                            : `${signal.color.replace('bg-', 'bg- opacity-10')} ${signal.color.replace('bg-', 'text-')}`
                            }`}>
                            {isAgencyInsight ? (signal.signalType === 'strategic' ? "Strategic Insight" : "Algorithm Logic") : signal.signalType.toUpperCase().replace("_", " ")}
                        </span>
                        {signal.projectName && (
                            <span className="text-[8px] font-bold uppercase tracking-[0.2em] text-muted-foreground/30">
                                • {signal.projectName}
                            </span>
                        )}
                    </div>

                    <h3 className="text-xl font-bold mb-3 text-foreground group-hover:text-primary transition-colors duration-300 tracking-tight leading-tight">
                        {signal.title}
                    </h3>

                    <div className="mb-8">
                        <p className={`text-sm text-muted-foreground leading-relaxed max-w-xl group-hover:text-white/80 transition-all duration-500 ${isExpanded ? "" : "line-clamp-2"}`}>
                            {signal.body}
                        </p>
                        
                        {isExpanded && socialPlanId && (
                            <div className="mt-6 p-6 rounded-2xl bg-violet-500/5 border border-violet-500/10 animate-in fade-in slide-in-from-top-4 duration-500">
                                <div className="flex items-center gap-2 mb-4">
                                    <Send className="h-4 w-4 text-violet-400" />
                                    <span className="text-[10px] font-black uppercase tracking-widest text-violet-400">Content Draft Review</span>
                                </div>
                                {isFetchingDraft ? (
                                    <div className="flex items-center gap-2 py-4">
                                        <Loader2 className="h-4 w-4 animate-spin text-violet-400" />
                                        <span className="text-xs text-muted-foreground italic">Fetching optimized copy...</span>
                                    </div>
                                ) : (
                                    <p className="text-sm text-foreground/90 leading-relaxed italic whitespace-pre-wrap border-l-2 border-violet-500/30 pl-4 py-1">
                                        "{draftContent || "Retrieval error: No content mapping found."}"
                                    </p>
                                )}
                            </div>
                        )}
                    </div>

                    {/* Action Hub */}
                    <div className="flex flex-wrap items-center gap-3">
                        <Button
                            id={`btn-signal-action-${signal.id}`}
                            className={`${isAgencyInsight ? "bg-violet-600 hover:bg-violet-500 text-white" : signal.buttonColor} px-6 rounded-xl h-10 font-black uppercase tracking-[0.1em] text-[10px] shadow-lg shadow-black/20 transition-all hover:scale-105 active:scale-95 border-b-2 border-black/20`}
                            onClick={() => onResolve(signal.id)}
                            disabled={isResolving}
                        >
                            {isResolving ? (
                                <Loader2 className="h-4 w-4 animate-spin" />
                            ) : (
                                <>
                                    {isAgencyInsight ? "ACKNOWLEDGE" : signal.actionLabel}
                                    <ArrowUpRight className="h-3.5 w-3.5 ml-2" />
                                </>
                            )}
                        </Button>

                        {(isLongBody || socialPlanId) && (
                            <Button
                                variant="outline"
                                className="h-10 px-4 rounded-xl text-[9px] font-black uppercase tracking-[0.15em] text-muted-foreground hover:text-white hover:bg-white/5 border border-white/5 hover:border-violet-500/30 transition-all flex items-center gap-2"
                                onClick={toggleExpand}
                            >
                                {isExpanded ? (
                                    <>COLLAPSE <ChevronUp className="h-3.5 w-3.5" /></>
                                ) : (
                                    <>{socialPlanId ? "EXPAND POST" : "REVEAL FULL INSIGHT"} <ChevronDown className="h-3.5 w-3.5" /></>
                                )}
                            </Button>
                        )}

                        {isExpanded && socialPlanId && onDeleteAction && (
                            <Button
                                variant="destructive"
                                className="h-10 px-4 rounded-xl text-[9px] font-black uppercase tracking-[0.15em] bg-red-500/5 hover:bg-red-500 text-red-500 hover:text-white border border-red-500/20 transition-all flex items-center gap-2"
                                onClick={handleDelete}
                                disabled={isDeleting}
                            >
                                {isDeleting ? (
                                    <Loader2 className="h-3.5 w-3.5 animate-spin" />
                                ) : (
                                    <>DISCARD POST <Trash2 className="h-3.5 w-3.5" /></>
                                )}
                            </Button>
                        )}

                        <Button
                            variant="ghost"
                            className="h-10 px-4 rounded-xl text-[9px] font-black uppercase tracking-[0.15em] text-muted-foreground/50 hover:text-white transition-all ml-auto"
                            onClick={handleDiscuss}
                        >
                            Discuss Strategy
                        </Button>
                    </div>
                </div>
            </div>
        </div>
    )
}
