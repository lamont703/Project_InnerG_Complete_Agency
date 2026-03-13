"use client"

import { useState, useMemo } from "react"
import { 
    Sparkles, 
    Send, 
    Linkedin, 
    Instagram, 
    Loader2, 
    CheckCircle2, 
    Zap,
    Activity,
    Database,
    Bug,
    ArrowUpRight
} from "lucide-react"
import { Button } from "@/components/ui/button"

interface SocialDraft {
    id: string
    platform: string
    content_text: string
    ai_reasoning: string
    source_type: string
    projects: { name: string }
    created_at: string
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
}

interface UnifiedStreamProps {
    signals: Signal[]
    drafts: SocialDraft[]
    onResolveSignal: (id: string) => void
    onPublishDraft: (id: string) => Promise<void>
    isResolving?: boolean
    highlightId?: string | null
}

const TYPE_ICONS: Record<string, any> = {
    inventory: Database,
    conversion: Zap,
    social: Instagram,
    bug_report: Bug,
    strategic: Sparkles,
}

export function UnifiedStream({ 
    signals, 
    drafts, 
    onResolveSignal, 
    onPublishDraft, 
    isResolving = false,
    highlightId = null 
}: UnifiedStreamProps) {
    const [isPublishingId, setIsPublishingId] = useState<string | null>(null)

    const handlePublish = async (id: string) => {
        setIsPublishingId(id)
        try {
            await onPublishDraft(id)
        } finally {
            setIsPublishingId(null)
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
        <div className="glass-panel-strong rounded-3xl border border-white/[0.05] relative overflow-hidden group/main h-full flex flex-col">
            {/* Background ambient glow */}
            <div className="absolute top-0 right-0 w-64 h-64 bg-primary/5 rounded-full blur-[100px] pointer-events-none" />
            <div className="absolute bottom-0 left-0 w-64 h-64 bg-violet-500/5 rounded-full blur-[100px] pointer-events-none" />

            {/* Header */}
            <div className="p-8 border-b border-white/[0.05] relative z-10 flex items-center justify-between">
                <div className="flex items-center gap-3">
                    <div className="h-10 w-10 rounded-xl bg-primary/10 flex items-center justify-center border border-primary/20 shadow-inner">
                        <Activity className="h-5 w-5 text-primary" />
                    </div>
                    <div>
                        <h3 className="text-lg font-black uppercase tracking-[0.2em] text-white">Global Portfolio Monitoring</h3>
                        <p className="text-[10px] font-bold text-muted-foreground/60 uppercase tracking-widest mt-1">Unified command stream & operational health</p>
                    </div>
                </div>
                <div className="flex items-center gap-2 px-3 py-1 rounded-full bg-white/5 border border-white/10">
                    <span className="h-1.5 w-1.5 rounded-full bg-emerald-500 animate-pulse shadow-[0_0_8px_rgba(16,185,129,0.5)]" />
                    <span className="text-[9px] font-black uppercase tracking-widest text-muted-foreground">Live Stream</span>
                </div>
            </div>

            {/* Content Feed */}
            <div className="flex-1 p-6 space-y-6 overflow-y-auto custom-scrollbar relative z-10 min-h-0">
                {streamItems.length === 0 ? (
                    <div className="h-full flex flex-col items-center justify-center py-20 text-center border border-dashed border-white/5 rounded-3xl bg-white/[0.01]">
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
                            const signal = item.data
                            const Icon = TYPE_ICONS[signal.signalType] || Zap
                            const isAgencyInsight = signal.isAgencyOnly
                            
                            return (
                                <div 
                                    key={signal.id}
                                    className={`p-6 rounded-2xl border transition-all duration-700 relative overflow-hidden group ${
                                        isHighlighted 
                                            ? 'border-emerald-500 shadow-[0_0_20px_rgba(16,185,129,0.15)] animate-pulse bg-emerald-500/5' 
                                            : isAgencyInsight 
                                                ? 'bg-primary/[0.02] border-primary/20 hover:border-primary/40' 
                                                : 'bg-white/[0.02] border-white/5 hover:border-white/10 shadow-sm'
                                    }`}
                                >
                                    <div className="flex items-center gap-3 mb-4">
                                        <div className={`h-8 w-8 rounded-lg flex items-center justify-center border ${
                                            isAgencyInsight ? 'bg-violet-500/10 border-violet-500/20' : 'bg-white/5 border-white/10'
                                        }`}>
                                            <Icon className={`h-4 w-4 ${isAgencyInsight ? 'text-violet-400' : 'text-primary'}`} />
                                        </div>
                                        <div className="flex-1">
                                            <div className="flex items-center justify-between">
                                                <span className={`text-[9px] font-black uppercase tracking-widest ${
                                                    isAgencyInsight ? 'text-violet-400' : 'text-primary/80'
                                                }`}>
                                                    {isAgencyInsight ? 'Aura Intelligence' : signal.signalType.toUpperCase()}
                                                </span>
                                                <span className="text-[8px] font-bold text-muted-foreground/30 uppercase tracking-tighter">
                                                    {signal.projectName}
                                                </span>
                                            </div>
                                        </div>
                                    </div>
                                    
                                    <h4 className="text-sm font-bold text-white mb-2 leading-tight">{signal.title}</h4>
                                    <p className="text-[11px] text-muted-foreground leading-relaxed mb-4 line-clamp-3 italic">
                                        {signal.body}
                                    </p>

                                    <Button
                                        size="sm"
                                        className={`w-full h-8 rounded-lg text-[9px] font-black uppercase tracking-widest ${
                                            isAgencyInsight ? 'bg-violet-600 hover:bg-violet-500' : 'bg-primary hover:bg-primary/80'
                                        }`}
                                        onClick={() => onResolveSignal(signal.id)}
                                        disabled={isResolving}
                                    >
                                        {isResolving ? <Loader2 className="h-3 w-3 animate-spin" /> : <>ACKNOWLEDGE <ArrowUpRight className="ml-1.5 h-3 w-3" /></>}
                                    </Button>
                                </div>
                            )
                        } else {
                            const draft = item.data
                            return (
                                <div 
                                    key={draft.id}
                                    className={`p-6 rounded-2xl border transition-all duration-700 relative overflow-hidden group ${
                                        isHighlighted 
                                            ? 'border-emerald-500 shadow-[0_0_20px_rgba(16,185,129,0.15)] animate-pulse bg-emerald-500/5' 
                                            : 'bg-violet-500/[0.02] border-violet-500/20 hover:border-violet-500/40 shadow-sm'
                                    }`}
                                >
                                    <div className="flex items-center gap-3 mb-4">
                                        <div className="h-8 w-8 rounded-lg bg-violet-500/10 flex items-center justify-center border border-violet-500/20">
                                            {draft.platform === 'linkedin' ? <Linkedin className="h-4 w-4 text-blue-400" /> : <Send className="h-4 w-4 text-violet-400" />}
                                        </div>
                                        <div className="flex-1">
                                            <div className="flex items-center justify-between">
                                                <span className="text-[9px] font-black uppercase tracking-widest text-violet-400">Content Planning</span>
                                                <span className="text-[8px] font-bold text-muted-foreground/30 uppercase tracking-tighter">
                                                    {draft.projects?.name}
                                                </span>
                                            </div>
                                        </div>
                                    </div>

                                    <h4 className="text-sm font-bold text-white mb-2 leading-tight italic">"{draft.content_text.substring(0, 100)}..."</h4>
                                    
                                    <div className="bg-white/[0.02] border border-white/5 rounded-xl p-3 mb-4">
                                        <div className="flex items-center gap-2 mb-1">
                                            <Sparkles className="h-3 w-3 text-violet-400/50" />
                                            <span className="text-[8px] font-black uppercase tracking-widest text-violet-400/60">AI Logic</span>
                                        </div>
                                        <p className="text-[10px] text-muted-foreground/60 leading-relaxed truncate">
                                            {draft.ai_reasoning}
                                        </p>
                                    </div>

                                    <Button
                                        size="sm"
                                        className="w-full h-8 rounded-lg bg-violet-600 hover:bg-violet-500 text-white text-[9px] font-black uppercase tracking-widest"
                                        onClick={() => handlePublish(draft.id)}
                                        disabled={isPublishingId === draft.id}
                                    >
                                        {isPublishingId === draft.id ? <Loader2 className="h-3 w-3 animate-spin" /> : <>APPROVE & POST <Send className="ml-1.5 h-3 w-3" /></>}
                                    </Button>
                                </div>
                            )
                        }
                    })
                )}
            </div>

            {/* Footer Status */}
            <div className="p-4 border-t border-white/[0.05] bg-white/[0.01] flex items-center justify-center">
                <p className="text-[8px] font-black uppercase tracking-[0.3em] text-muted-foreground/30">Intelligence Pipeline Active</p>
            </div>
        </div>
    )
}
