import { useState } from "react"
import { Sparkles, Send, Edit3, Github, FileText, CheckCircle2, Loader2, Linkedin, Instagram, ChevronDown, ChevronUp, Trash2 } from "lucide-react"
import { Button } from "@/components/ui/button"

interface SocialDraft {
    id: string
    platform: string
    content_text: string
    ai_reasoning: string
    source_type: string
    projects: { name: string }
    project_id: string
    created_at: string
}

interface SocialOrchestratorProps {
    drafts: SocialDraft[]
    onPublish: (id: string) => Promise<void>
    onDelete?: (draftId: string, projectId: string) => Promise<void>
    highlightId?: string | null
}

export function SocialOrchestrator({ drafts, onPublish, onDelete, highlightId = null }: SocialOrchestratorProps) {
    const [isPublishingId, setIsPublishingId] = useState<string | null>(null)
    const [isDeletingId, setIsDeletingId] = useState<string | null>(null)
    const [expandedIds, setExpandedIds] = useState<string[]>([])

    const handlePublish = async (id: string) => {
        setIsPublishingId(id)
        try {
            await onPublish(id)
        } finally {
            setIsPublishingId(null)
        }
    }

    const handleDelete = async (draftId: string, projectId: string) => {
        if (!onDelete) return
        setIsDeletingId(draftId)
        try {
            await onDelete(draftId, projectId)
        } finally {
            setIsDeletingId(null)
        }
    }

    const toggleExpand = (id: string) => {
        setExpandedIds(prev => 
            prev.includes(id) 
                ? prev.filter(item => item !== id) 
                : [...prev, id]
        )
    }

    return (
        <div className="glass-panel-strong rounded-3xl p-8 border border-border relative overflow-hidden group/main h-full flex flex-col">
            {/* Background ambient glow */}
            <div className="absolute top-0 right-0 w-64 h-64 bg-violet-500/5 rounded-full blur-[100px] pointer-events-none" />

            <div className="flex items-center justify-between mb-8 relative z-10">
                <div className="flex items-center gap-3">
                    <div className="h-10 w-10 rounded-xl bg-violet-500/10 flex items-center justify-center border border-violet-500/20">
                        <Sparkles className="h-5 w-5 text-violet-400" />
                    </div>
                    <div>
                        <h3 className="text-lg font-black uppercase tracking-[0.2em] text-foreground">Content Planning</h3>
                        <p className="text-[10px] font-bold text-muted-foreground/60 uppercase tracking-widest mt-1">Autonomous Strategy Queue</p>
                    </div>
                </div>
                <div className="flex items-center gap-4">
                    <div className="flex items-center gap-2 px-3 py-1 rounded-full bg-muted/20 border border-border">
                        <span className="h-1.5 w-1.5 rounded-full bg-violet-500 animate-pulse" />
                        <span className="text-[9px] font-black uppercase tracking-widest text-muted-foreground">AI Thinking</span>
                    </div>
                </div>
            </div>

            <div className="flex-1 space-y-4 overflow-y-auto custom-scrollbar pr-2 relative z-10 min-h-0">
                {drafts.length === 0 ? (
                    <div className="h-full flex flex-col items-center justify-center py-20 text-center border border-dashed border-border rounded-3xl bg-muted/5">
                        <div className="h-16 w-16 rounded-full bg-violet-500/5 flex items-center justify-center mb-4 border border-violet-500/10">
                            <CheckCircle2 className="h-8 w-8 text-violet-400/40" />
                        </div>
                        <p className="text-sm font-bold text-muted-foreground uppercase tracking-widest leading-relaxed">Planning Complete</p>
                        <p className="text-[10px] text-muted-foreground/40 mt-2 px-12 italic">No pending drafts. Your agent is monitoring for new milestones.</p>
                    </div>
                ) : (
                    drafts.map((draft) => {
                        const isExpanded = expandedIds.includes(draft.id)
                        return (
                            <div 
                                key={draft.id} 
                                className={`p-5 rounded-2xl bg-muted/10 border transition-all group ${draft.id === highlightId ? 'border-primary shadow-[0_0_20px_rgba(var(--primary-rgb),0.15)] animate-pulse' : 'border-border/50 hover:border-violet-500/30'}`}
                            >
                                <div className="flex items-start justify-between gap-4 mb-4">
                                    <div className="flex items-center gap-3">
                                        <div className="h-8 w-8 rounded-lg bg-muted/20 flex items-center justify-center border border-border">
                                            {draft.platform === 'linkedin' ? (
                                                <Linkedin className="h-4 w-4 text-blue-400" />
                                            ) : (
                                                <Instagram className="h-4 w-4 text-pink-400" />
                                            )}
                                        </div>
                                        <div>
                                            <div className="flex items-center gap-2">
                                                <span className="text-[10px] font-black uppercase tracking-widest text-foreground">{draft.platform}</span>
                                                <span className="h-1 w-1 rounded-full bg-border" />
                                                <span className="text-[9px] font-black uppercase tracking-[0.1em] text-violet-400/80">{draft.projects?.name}</span>
                                            </div>
                                            <p className="text-[9px] text-muted-foreground/50 font-medium">Proposed {new Date(draft.created_at).toLocaleDateString()}</p>
                                        </div>
                                    </div>
                                    <div className={`px-2 py-1 rounded bg-violet-500/10 border border-violet-500/20`}>
                                       <span className="text-[8px] font-black text-violet-400 uppercase tracking-tighter">Ready for Review</span>
                                    </div>
                                </div>

                                <div className="mb-4">
                                    <p className={`text-xs text-foreground/90 leading-relaxed font-medium italic ${isExpanded ? "" : "line-clamp-3"}`}>
                                        "{draft.content_text}"
                                    </p>
                                </div>

                                {isExpanded && draft.ai_reasoning && (
                                    <div className="p-3 rounded-xl bg-violet-500/5 border border-violet-500/10 mb-5 animate-in fade-in slide-in-from-top-2">
                                        <div className="flex items-center gap-2 mb-1">
                                            <Sparkles className="h-3 w-3 text-violet-400" />
                                            <span className="text-[9px] font-black uppercase tracking-widest text-violet-400">AI Logic</span>
                                        </div>
                                        <p className="text-[10px] text-muted-foreground/80 leading-relaxed">
                                            {draft.ai_reasoning}
                                        </p>
                                    </div>
                                )}

                                <div className="flex items-center justify-between gap-4">
                                    <div className="flex items-center gap-3">
                                        <Button
                                            variant="ghost"
                                            size="sm"
                                            className="h-8 px-3 rounded-lg text-[9px] font-black uppercase tracking-widest border border-border/50 hover:bg-white/5"
                                            onClick={() => toggleExpand(draft.id)}
                                        >
                                            {isExpanded ? <>Collapse <ChevronUp className="ml-1 h-3 w-3" /></> : <>Expansion <ChevronDown className="ml-1 h-3 w-3" /></>}
                                        </Button>
                                        {isExpanded && onDelete && (
                                            <Button
                                                variant="destructive"
                                                size="sm"
                                                className="h-8 px-3 rounded-lg text-[9px] font-black uppercase tracking-widest bg-red-500/10 hover:bg-red-500 text-red-500 hover:text-white border border-red-500/20"
                                                onClick={() => handleDelete(draft.id, draft.project_id)}
                                                disabled={isDeletingId === draft.id}
                                            >
                                                {isDeletingId === draft.id ? <Loader2 className="h-3 w-3 animate-spin" /> : <><Trash2 className="h-3 w-3 mr-1" /> Discard</>}
                                            </Button>
                                        )}
                                    </div>
                                    <div className="flex gap-2">
                                        <button 
                                            onClick={() => handlePublish(draft.id)}
                                            disabled={isPublishingId === draft.id}
                                            className="h-8 px-4 rounded-lg bg-violet-500 hover:bg-violet-600 text-white text-[10px] font-black uppercase tracking-widest transition-all flex items-center gap-2 disabled:opacity-50 disabled:cursor-not-allowed group-hover:shadow-[0_0_15px_rgba(139,92,246,0.3)]"
                                        >
                                            {isPublishingId === draft.id ? (
                                                <Loader2 className="h-3 w-3 animate-spin" />
                                            ) : (
                                                <Send className="h-3 w-3" />
                                            )}
                                            Approve & Post
                                        </button>
                                    </div>
                                </div>
                            </div>
                        )
                    })
                )}
            </div>
        </div>
    )
}
