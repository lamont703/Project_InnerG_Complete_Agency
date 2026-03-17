"use client"

import { useState, useMemo } from "react"
import { 
    Send, 
    Linkedin, 
    Instagram, 
    Loader2, 
    CheckCircle2, 
    Zap,
    Activity,
    Database,
    Bug,
    ArrowUpRight,
    ChevronDown,
    ChevronUp,
    Trash2,
    Youtube,
    Edit3,
    Sparkles
} from "lucide-react"
import { Button } from "@/components/ui/button"
import { SignalCard } from "../../signals/components/SignalCard"

interface SocialDraft {
    id: string
    platform: string
    content_text: string
    ai_reasoning: string
    source_type: string
    projects: { name: string }
    project_id: string
    created_at: string
    media_url?: string | null
}

interface Signal {
    id: string
    signalType: string
    title: string
    body: string
    actionLabel: string
    severity: string
    color: string
    buttonColor: string
    isAgencyOnly?: boolean
    projectName?: string
    createdAt?: string
    metadata?: any
}

interface UnifiedStreamProps {
    signals: Signal[]
    drafts: SocialDraft[]
    onResolveSignal: (id: string) => void
    onPublishDraft: (id: string) => Promise<void>
    onDeleteDraft?: (draftId: string, projectId: string) => Promise<void>
    onGenerateImage?: (draftId: string) => Promise<string>
    onClearMedia?: (draftId: string) => Promise<void>
    isResolving?: boolean
    highlightId?: string | null
    isFlush?: boolean
}

const TYPE_ICONS: Record<string, any> = {
    inventory: Database,
    conversion: Zap,
    social: Instagram,
    linkedin: Linkedin,
    youtube: Youtube,
    bug_report: Bug,
    strategic: Sparkles,
    ai_insight: Sparkles,
}

export function UnifiedStream({ 
    signals, 
    drafts, 
    onResolveSignal, 
    onPublishDraft, 
    onDeleteDraft,
    onGenerateImage,
    onClearMedia,
    isResolving = false,
    highlightId = null,
    isFlush = false
}: UnifiedStreamProps) {
    const [isPublishingId, setIsPublishingId] = useState<string | null>(null)
    const [expandedDraftIds, setExpandedDraftIds] = useState<string[]>([])
    const [isDeletingDraftId, setIsDeletingDraftId] = useState<string | null>(null)
    const [isGeneratingImageId, setIsGeneratingImageId] = useState<string | null>(null)

    const handleGenerateImage = async (id: string) => {
        if (!onGenerateImage) return
        setIsGeneratingImageId(id)
        try {
            await onGenerateImage(id)
        } finally {
            setIsGeneratingImageId(null)
        }
    }

    const handleClearMedia = async (id: string) => {
        if (!onClearMedia) return
        try {
            await onClearMedia(id)
        } catch (e) {
            console.error("Failed to clear media", e)
        }
    }

    const handlePublish = async (id: string) => {
        setIsPublishingId(id)
        try {
            await onPublishDraft(id)
        } finally {
            setIsPublishingId(null)
        }
    }

    const handleDeleteDraft = async (draftId: string, projectId: string) => {
        if (!onDeleteDraft) return
        setIsDeletingDraftId(draftId)
        try {
            await onDeleteDraft(draftId, projectId)
        } finally {
            setIsDeletingDraftId(null)
        }
    }

    // Merge and sort all items by date
    const streamItems = useMemo(() => {
        const signalItems = signals.map(s => ({
            type: 'signal' as const,
            id: s.id,
            date: new Date(s.createdAt || 0).getTime(),
            data: s
        }))

        const draftItems = drafts.map(d => ({
            type: 'draft' as const,
            id: d.id,
            date: new Date(d.created_at || 0).getTime(),
            data: d
        }))

        return [...signalItems, ...draftItems].sort((a, b) => b.date - a.date)
    }, [signals, drafts])

    return (
        <div className={`${isFlush ? 'border-none rounded-none' : 'glass-panel-strong rounded-3xl border border-border'} relative overflow-hidden group/main h-full flex flex-col min-h-0`}>
            {/* Background ambient glow */}
            <div className="absolute top-0 right-0 w-64 h-64 bg-primary/5 rounded-full blur-[100px] pointer-events-none" />
            <div className="absolute bottom-0 left-0 w-64 h-64 bg-violet-500/5 rounded-full blur-[100px] pointer-events-none" />

            {/* Header */}
            <div className="hidden lg:flex p-8 border-b border-border relative z-10 items-center justify-between">
                <div className="flex items-center gap-3">
                    <div className="h-10 w-10 rounded-xl bg-primary/10 flex items-center justify-center border border-primary/20 shadow-inner">
                        <Activity className="h-5 w-5 text-primary" />
                    </div>
                    <div>
                        <h3 className="text-lg font-black uppercase tracking-[0.2em] text-foreground">Global Portfolio Monitoring</h3>
                        <p className="text-[10px] font-bold text-muted-foreground/60 uppercase tracking-widest mt-1">Unified command stream & operational health</p>
                    </div>
                </div>
                <div className="flex items-center gap-2 px-3 py-1 rounded-full bg-muted/10 border border-border">
                    <span className="h-1.5 w-1.5 rounded-full bg-emerald-500 animate-pulse shadow-[0_0_8px_rgba(16,185,129,0.5)]" />
                    <span className="text-[9px] font-black uppercase tracking-widest text-muted-foreground">Live Stream</span>
                </div>
            </div>

            {/* Content Feed */}
            <div className="flex-1 p-6 pb-24 space-y-6 overflow-y-auto custom-scrollbar relative z-10 min-h-0">
                {streamItems.length === 0 ? (
                    <div className="h-full flex flex-col items-center justify-center py-20 text-center border border-dashed border-border rounded-3xl bg-muted/5">
                        <div className="h-16 w-16 rounded-full bg-primary/5 flex items-center justify-center mb-4 border border-primary/10">
                            <CheckCircle2 className="h-8 w-8 text-primary/40" />
                        </div>
                        <p className="text-sm font-bold text-muted-foreground uppercase tracking-widest">No Activity Detected</p>
                        <p className="text-[10px] text-muted-foreground/40 mt-2 italic px-12">Aura is monitoring for signals and strategy opportunities.</p>
                    </div>
                ) : (
                    streamItems.map((item) => {
                        const isHighlighted = item.id === highlightId
                        
                if (item.type === 'signal') {
                            const signal = item.data as any
                            return (
                                <SignalCard 
                                    key={signal.id}
                                    signal={signal}
                                    isResolving={isResolving}
                                    onResolve={onResolveSignal}
                                    onDeleteAction={onDeleteDraft}
                                    isAgencyMode={true}
                                    isHighlighted={isHighlighted}
                                />
                            )
                        } else {
                            const draft = item.data as any
                            const isExpanded = expandedDraftIds.includes(draft.id)
                            const isDeleting = isDeletingDraftId === draft.id
                            
                            return (
                                <div 
                                    key={draft.id}
                                    className={`p-6 rounded-2xl border transition-all duration-700 relative overflow-hidden group/draft ${
                                        isHighlighted 
                                            ? 'border-emerald-500 shadow-[0_0_20px_rgba(16,185,129,0.15)] animate-pulse bg-emerald-500/5' 
                                            : 'bg-violet-500/[0.02] border-violet-500/10 hover:border-violet-500/30 shadow-sm'
                                    }`}
                                >
                                    <div className="flex items-center gap-3 mb-4">
                                        <div className="h-8 w-8 rounded-lg bg-violet-500/10 flex items-center justify-center border border-violet-500/20 shadow-inner">
                                            {draft.platform === 'linkedin' ? <Linkedin className="h-4 w-4 text-blue-400" /> : draft.platform === 'youtube' ? <Youtube className="h-4 w-4 text-red-500" /> : <Instagram className="h-4 w-4 text-pink-400" />}
                                        </div>
                                        <div className="flex-1">
                                            <div className="flex items-center justify-between">
                                                <span className="text-[9px] font-black uppercase tracking-[0.2em] text-violet-400">Campaign Content</span>
                                                <span className="text-[8px] font-bold text-muted-foreground/30 uppercase tracking-tighter">
                                                    {draft.projects?.name}
                                                </span>
                                            </div>
                                        </div>
                                    </div>

                                    <div className="mb-4">
                                        <p className={`text-sm text-foreground/90 leading-relaxed italic ${isExpanded ? "" : "line-clamp-2"}`}>
                                            "{draft.content_text}"
                                        </p>
                                    </div>
                                    
                                    {isExpanded && (
                                        <div className="p-4 rounded-xl bg-violet-500/5 border border-violet-500/10 mb-4 animate-in fade-in slide-in-from-top-2 duration-300">
                                            <div className="flex items-center gap-2 mb-2">
                                                <Sparkles className="h-3 w-3 text-violet-400/50" />
                                                <span className="text-[8px] font-black uppercase tracking-widest text-violet-400/60">Algorithm Strategy</span>
                                            </div>
                                            <p className="text-[10px] text-muted-foreground leading-relaxed">
                                                {draft.ai_reasoning}
                                            </p>
                                        </div>
                                    )}

                                    {isExpanded && draft.media_url && (
                                        <div className="mb-4 rounded-2xl overflow-hidden border border-violet-500/20 shadow-lg relative group/media">
                                            <img 
                                                src={draft.media_url} 
                                                alt="AI Generated Visual" 
                                                className="w-full h-auto object-cover max-h-[300px] hover:scale-[1.02] transition-transform duration-500"
                                            />
                                            <div className="absolute top-2 right-2 px-2 py-1 rounded-md bg-black/60 backdrop-blur-md border border-white/10 opacity-0 group-hover/media:opacity-100 transition-opacity">
                                                <span className="text-[8px] font-black text-white uppercase tracking-widest">Nano Banana Pro</span>
                                            </div>
                                        </div>
                                    )}

                                    <div className="flex flex-col gap-2 relative z-10">
                                        <Button
                                            size="sm"
                                            className="w-full h-9 rounded-lg bg-violet-600 hover:bg-violet-500 text-white text-[10px] font-black uppercase tracking-widest shadow-md transition-all active:scale-95"
                                            onClick={() => handlePublish(draft.id)}
                                            disabled={isPublishingId === draft.id}
                                        >
                                            {isPublishingId === draft.id ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <>APPROVE & PUBLISH <Send className="ml-2 h-3.5 w-3.5" /></>}
                                        </Button>
                                        
                                        <div className="flex gap-2">
                                            <Button
                                                variant="ghost"
                                                size="sm"
                                                className="flex-1 h-8 rounded-lg text-[9px] font-black uppercase tracking-widest border border-white/5 hover:bg-white/5 text-muted-foreground/70 hover:text-white transition-colors"
                                                onClick={(e) => {
                                                    e.stopPropagation()
                                                    setExpandedDraftIds(prev => 
                                                        prev.includes(draft.id) 
                                                            ? prev.filter(id => id !== draft.id) 
                                                            : [...prev, draft.id]
                                                    )
                                                }}
                                            >
                                                {isExpanded ? <>COLLAPSE <ChevronUp className="ml-1.5 h-3.5 w-3.5" /></> : <>VIEW FULL POST <ChevronDown className="ml-1.5 h-3.5 w-3.5" /></>}
                                            </Button>

                                            {isExpanded && (
                                                <div className="flex gap-2 flex-grow">
                                                    {draft.media_url ? (
                                                        <>
                                                            <Button
                                                                variant="ghost"
                                                                size="sm"
                                                                className="flex-1 h-8 rounded-lg text-[9px] font-black uppercase tracking-widest text-violet-400 bg-violet-500/5 hover:bg-violet-500/10 border border-violet-500/20"
                                                                onClick={(e) => {
                                                                    e.stopPropagation()
                                                                    handleGenerateImage(draft.id)
                                                                }}
                                                                disabled={isGeneratingImageId === draft.id}
                                                            >
                                                                {isGeneratingImageId === draft.id ? <Loader2 className="h-3 w-3 animate-spin mr-1" /> : <Edit3 className="h-3 w-3 mr-1" />}
                                                                REGENERATE
                                                            </Button>
                                                            <Button
                                                                variant="ghost"
                                                                size="sm"
                                                                className="flex-1 h-8 rounded-lg text-[9px] font-black uppercase tracking-widest text-muted-foreground hover:text-red-400 hover:bg-red-400/5 border border-border/50"
                                                                onClick={(e) => {
                                                                    e.stopPropagation()
                                                                    handleClearMedia(draft.id)
                                                                }}
                                                            >
                                                                DECLINE ASSET
                                                            </Button>
                                                        </>
                                                    ) : (
                                                        <Button
                                                            variant="ghost"
                                                            size="sm"
                                                            className="flex-1 h-8 rounded-lg text-[9px] font-black uppercase tracking-widest text-violet-400 bg-violet-500/5 hover:bg-violet-500/10 border border-violet-500/20"
                                                            onClick={(e) => {
                                                                e.stopPropagation()
                                                                handleGenerateImage(draft.id)
                                                            }}
                                                            disabled={isGeneratingImageId === draft.id}
                                                        >
                                                            {isGeneratingImageId === draft.id ? <Loader2 className="h-3 w-3 animate-spin mr-1" /> : <Sparkles className="h-3 w-3 mr-1" />}
                                                            GENERATE IMAGE
                                                        </Button>
                                                    )}
                                                </div>
                                            )}
                                            
                                            {isExpanded && onDeleteDraft && (
                                                <Button
                                                    variant="destructive"
                                                    size="sm"
                                                    className="flex-1 h-8 rounded-lg text-[9px] font-black uppercase tracking-widest bg-red-500/5 hover:bg-red-500 text-red-500 hover:text-white border border-red-500/20 transition-all font-black"
                                                    onClick={(e) => {
                                                        e.stopPropagation()
                                                        handleDeleteDraft(draft.id, draft.project_id)
                                                    }}
                                                    disabled={isDeleting}
                                                >
                                                    {isDeleting ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <>DISCARD <Trash2 className="ml-1.5 h-3.5 w-3.5" /></>}
                                                </Button>
                                            )}
                                        </div>
                                    </div>
                                </div>
                            )
                        }
                    })
                )}
            </div>

            {/* Footer Status */}
            <div className="hidden lg:flex p-4 border-t border-border bg-muted/5 items-center justify-center">
                <p className="text-[8px] font-black uppercase tracking-[0.3em] text-muted-foreground/30">Intelligence Pipeline Active</p>
            </div>
        </div>
    )
}
