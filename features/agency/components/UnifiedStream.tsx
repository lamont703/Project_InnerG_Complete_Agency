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
    Sparkles,
    Video,
    Calendar as CalendarIcon,
    Clock,
    Facebook,
    Twitter,
    MessageSquare,
    Zap as ZapIcon
} from "lucide-react"
import { Button } from "@/components/ui/button"
import { 
    DropdownMenu, 
    DropdownMenuContent, 
    DropdownMenuItem, 
    DropdownMenuTrigger 
} from "@/components/ui/dropdown-menu"
import { 
    Popover, 
    PopoverContent, 
    PopoverTrigger 
} from "@/components/ui/popover"
import { Calendar } from "@/components/ui/calendar"
import { format } from "date-fns"
import { SignalCard } from "../../signals/components/SignalCard"
import { createBrowserClient } from "@/lib/supabase/browser"
import { toast } from "sonner"

interface SocialDraft {
    id: string
    platform: string
    content_text: string
    ai_reasoning: string
    source_type: string
    status: string
    projects: { name: string }
    project_id: string
    created_at: string
    media_url?: string | null
    metadata?: any
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
    onPublishDraft: (id: string, params?: { platforms?: string[], scheduledAt?: string }) => Promise<void>
    onDeleteDraft?: (draftId: string, projectId: string) => Promise<void>
    onGenerateImage?: (draftId: string) => Promise<string>
    onGenerateVideo?: (draftId: string) => Promise<string>
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
    onGenerateVideo,
    onClearMedia,
    isResolving = false,
    highlightId = null,
    isFlush = false
}: UnifiedStreamProps) {
    const [isPublishingId, setIsPublishingId] = useState<string | null>(null)
    const [expandedDraftIds, setExpandedDraftIds] = useState<string[]>([])
    const [isDeletingDraftId, setIsDeletingDraftId] = useState<string | null>(null)
    const [isGeneratingImageId, setIsGeneratingImageId] = useState<string | null>(null)
    const [isGeneratingVideoId, setIsGeneratingVideoId] = useState<string | null>(null)
    const [scheduledDates, setScheduledDates] = useState<Record<string, Date>>({})
    const [scheduledTimes, setScheduledTimes] = useState<Record<string, string>>({})

    const handleGenerateImage = async (id: string) => {
        if (!onGenerateImage) return
        setIsGeneratingImageId(id)
        try {
            await onGenerateImage(id)
        } finally {
            setIsGeneratingImageId(null)
        }
    }

    const handleGenerateVideo = async (id: string) => {
        if (!onGenerateVideo) return
        setIsGeneratingVideoId(id)
        try {
            await onGenerateVideo(id)
        } finally {
            setIsGeneratingVideoId(null)
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

    const [selectedDraftPlatforms, setSelectedDraftPlatforms] = useState<Record<string, string[]>>({})

    const getSelectedDraftPlatforms = (draftId: string, defaultPlatform: string) => {
        return selectedDraftPlatforms[draftId] || [defaultPlatform.toLowerCase()]
    }

    const toggleDraftPlatform = (draftId: string, platform: string, defaultPlatform: string) => {
        const current = getSelectedDraftPlatforms(draftId, defaultPlatform)
        const pLower = platform.toLowerCase()
        let next: string[]
        if (current.includes(pLower)) {
            if (current.length === 1) return
            next = current.filter(p => p !== pLower)
        } else {
            next = [...current, pLower]
        }
        setSelectedDraftPlatforms(prev => ({ ...prev, [draftId]: next }))
    }

    const StatusBadge = ({ status }: { status?: string | null }) => {
        if (!status) return null
        
        const COLORS: Record<string, string> = {
            draft: 'bg-muted/20 text-muted-foreground border-white/5',
            scheduled: 'bg-primary/20 text-primary border-primary/40 animate-pulse',
            published: 'bg-emerald-500/20 text-emerald-400 border-emerald-500/30',
            approved: 'bg-amber-500/20 text-amber-500 border-amber-500/30',
            failed: 'bg-red-500/20 text-red-500 border-red-500/40'
        }

        return (
            <span className={`text-[8px] px-1.5 py-0.5 rounded-md font-black uppercase tracking-widest border ${COLORS[status] || COLORS.draft}`}>
                {status}
            </span>
        )
    }

    const getScheduledDateTime = (draftId: string) => {
        const date = scheduledDates[draftId]
        if (!date) return null
        const time = scheduledTimes[draftId] || "12:00"
        const [hours, minutes] = time.split(':').map(Number)
        const d = new Date(date)
        d.setHours(hours, minutes, 0, 0)
        return d
    }

    const handlePublish = async (id: string, defaultPlatform: string, scheduledAt?: string) => {
        const platforms = getSelectedDraftPlatforms(id, defaultPlatform)
        setIsPublishingId(id)
        
        try {
            const supabase = createBrowserClient()
            const draft = drafts.find(d => d.id === id)
            if (!draft) return

            for (const platform of platforms) {
                let targetId = id
                
                // If this is a different platform than the original draft, we need a separate record
                if (platform.toLowerCase() !== draft.platform.toLowerCase()) {
                    // Create a clone for this platform
                    const { data: newDraft, error: cloneError } = await (supabase as any)
                        .from("social_content_plan")
                        .insert({
                            project_id: draft.project_id,
                            platform: platform,
                            content_text: draft.content_text,
                            ai_reasoning: draft.ai_reasoning,
                            source_type: draft.source_type,
                            status: scheduledAt ? "scheduled" : "approved", // Set to approved momentarily so publish function can pick it up
                            scheduled_at: scheduledAt || new Date().toISOString(),
                            media_url: draft.media_url,
                            metadata: {
                                ...draft.metadata,
                                cloned_from: id,
                                cloned_at: new Date().toISOString()
                            }
                        })
                        .select("id")
                        .single()
                    
                    if (cloneError) {
                        console.error(`Failed to clone draft for ${platform}:`, cloneError)
                        toast.error(`Error provisioning ${platform}`)
                        continue
                    }
                    targetId = newDraft.id
                }

                // Now publish/schedule this specific draft for this specific platform
                await onPublishDraft(targetId, { 
                    platforms: [platform], // Pass specifically this platform to the publish function
                    scheduledAt 
                })
            }
            toast.success(`Broadcasting to ${platforms.length} distribution ports`)
        } catch (err) {
            console.error("Publishing error:", err)
            toast.error("Multi-platform dispatch failed")
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

        const draftItems = drafts
            .filter(d => d.status !== 'scheduled')
            .map(d => ({
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
                            const status = signal.metadata?.social_plan_id 
                                ? drafts.find(d => d.id === signal.metadata.social_plan_id)?.status 
                                : null

                            return (
                                <SignalCard 
                                    key={signal.id}
                                    signal={signal}
                                    isResolving={isResolving}
                                    onResolve={onResolveSignal}
                                    onDeleteAction={onDeleteDraft}
                                    isAgencyMode={true}
                                    isHighlighted={isHighlighted}
                                    statusBadge={<StatusBadge status={status} />}
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
                                            {(() => {
                                                const p = draft.platform.toLowerCase()
                                                if (p === 'linkedin') return <Linkedin className="h-4 w-4 text-blue-400" />
                                                if (p === 'instagram') return <Instagram className="h-4 w-4 text-pink-400" />
                                                if (p === 'facebook') return <Facebook className="h-4 w-4 text-blue-600" />
                                                if (p === 'twitter' || p === 'x') return <Twitter className="h-4 w-4 text-zinc-400" />
                                                if (p === 'youtube') return <Youtube className="h-4 w-4 text-red-500" />
                                                if (p === 'ghl') return <MessageSquare className="h-4 w-4 text-orange-400" />
                                                return <Sparkles className="h-4 w-4 text-violet-400" />
                                            })()}
                                        </div>
                                        <div className="flex-1">
                                            <div className="flex items-center justify-between">
                                                <div className="flex items-center gap-2">
                                                    <span className="text-[9px] font-black uppercase tracking-[0.2em] text-violet-400">Campaign Content</span>
                                                    <StatusBadge status={draft.status} />
                                                </div>
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
                                        <div className="mb-4 flex flex-wrap items-center gap-2 p-3 rounded-xl bg-white/5 border border-white/10 animate-in fade-in slide-in-from-top-1">
                                            <span className="text-[9px] font-black uppercase tracking-widest text-muted-foreground mr-1 w-full md:w-auto mb-2 md:mb-0">Target Ports:</span>
                                            
                                            <button
                                                onClick={(e) => { e.stopPropagation(); toggleDraftPlatform(draft.id, 'linkedin', draft.platform); }}
                                                className={`flex items-center gap-1.5 px-2.5 py-1 rounded-md border transition-all ${getSelectedDraftPlatforms(draft.id, draft.platform).includes('linkedin') ? 'bg-blue-500/20 border-blue-500/40 text-blue-400 font-bold' : 'bg-transparent border-white/5 text-muted-foreground/30 hover:border-white/10'}`}
                                            >
                                                <Linkedin className="h-3 w-3" />
                                                <span className="text-[8px] font-black uppercase tracking-tighter">LinkedIn</span>
                                            </button>

                                            <button
                                                onClick={(e) => { e.stopPropagation(); toggleDraftPlatform(draft.id, 'instagram', draft.platform); }}
                                                className={`flex items-center gap-1.5 px-2.5 py-1 rounded-md border transition-all ${getSelectedDraftPlatforms(draft.id, draft.platform).includes('instagram') ? 'bg-pink-500/20 border-pink-500/40 text-pink-400 font-bold' : 'bg-transparent border-white/5 text-muted-foreground/30 hover:border-white/10'}`}
                                            >
                                                <Instagram className="h-3 w-3" />
                                                <span className="text-[8px] font-black uppercase tracking-tighter">Instagram</span>
                                            </button>

                                            <button
                                                onClick={(e) => { e.stopPropagation(); toggleDraftPlatform(draft.id, 'facebook', draft.platform); }}
                                                className={`flex items-center gap-1.5 px-2.5 py-1 rounded-md border transition-all ${getSelectedDraftPlatforms(draft.id, draft.platform).includes('facebook') ? 'bg-blue-600/20 border-blue-600/40 text-blue-500 font-bold' : 'bg-transparent border-white/5 text-muted-foreground/30 hover:border-white/10'}`}
                                            >
                                                <Facebook className="h-3 w-3" />
                                                <span className="text-[8px] font-black uppercase tracking-tighter">Facebook</span>
                                            </button>

                                            <button
                                                onClick={(e) => { e.stopPropagation(); toggleDraftPlatform(draft.id, 'twitter', draft.platform); }}
                                                className={`flex items-center gap-1.5 px-2.5 py-1 rounded-md border transition-all ${getSelectedDraftPlatforms(draft.id, draft.platform).includes('twitter') ? 'bg-zinc-500/20 border-zinc-500/40 text-zinc-400 font-bold' : 'bg-transparent border-white/5 text-muted-foreground/30 hover:border-white/10'}`}
                                            >
                                                <Twitter className="h-3 w-3" />
                                                <span className="text-[8px] font-black uppercase tracking-tighter">X (Twitter)</span>
                                            </button>

                                            <button
                                                onClick={(e) => { e.stopPropagation(); toggleDraftPlatform(draft.id, 'youtube', draft.platform); }}
                                                className={`flex items-center gap-1.5 px-2.5 py-1 rounded-md border transition-all ${getSelectedDraftPlatforms(draft.id, draft.platform).includes('youtube') ? 'bg-red-500/20 border-red-500/40 text-red-500 font-bold' : 'bg-transparent border-white/5 text-muted-foreground/30 hover:border-white/10'}`}
                                            >
                                                <Youtube className="h-3 w-3" />
                                                <span className="text-[8px] font-black uppercase tracking-tighter">YouTube</span>
                                            </button>

                                            <button
                                                onClick={(e) => { e.stopPropagation(); toggleDraftPlatform(draft.id, 'ghl', draft.platform); }}
                                                className={`flex items-center gap-1.5 px-2.5 py-1 rounded-md border transition-all ${getSelectedDraftPlatforms(draft.id, draft.platform).includes('ghl') ? 'bg-orange-500/20 border-orange-500/40 text-orange-400 font-bold' : 'bg-transparent border-white/5 text-muted-foreground/30 hover:border-white/10'}`}
                                            >
                                                <MessageSquare className="h-3 w-3" />
                                                <span className="text-[8px] font-black uppercase tracking-tighter">GHL</span>
                                            </button>
                                        </div>
                                    )}
                                    
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
                                            {draft.media_url.includes(".mp4") || draft.media_url.includes(".mov") ? (
                                                <video 
                                                    src={draft.media_url} 
                                                    autoPlay 
                                                    loop 
                                                    muted 
                                                    playsInline
                                                    className="w-full h-auto object-cover max-h-[400px]"
                                                />
                                            ) : (
                                                <img 
                                                    src={draft.media_url} 
                                                    alt="AI Generated Visual" 
                                                    className="w-full h-auto object-cover max-h-[300px] hover:scale-[1.02] transition-transform duration-500"
                                                />
                                            )}
                                            <div className="absolute top-2 right-2 px-2 py-1 rounded-md bg-black/60 backdrop-blur-md border border-white/10 opacity-0 group-hover/media:opacity-100 transition-opacity">
                                                <span className="text-[8px] font-black text-white uppercase tracking-widest">
                                                    {draft.media_url.includes(".mp4") ? "Google Veo 3 Motion" : "Nano Banana Pro"}
                                                </span>
                                            </div>
                                        </div>
                                    )}

                                    <div className="flex flex-col gap-2 relative z-10">
                                        <div className="flex items-center">
                                            <Button
                                                id={`btn-draft-publish-${draft.id}`}
                                                size="sm"
                                                className="flex-1 h-9 rounded-l-lg rounded-r-none bg-violet-600 hover:bg-violet-500 text-white text-[10px] font-black uppercase tracking-widest shadow-md transition-all active:scale-95 border-r border-white/10"
                                                onClick={(e) => {
                                                    e.stopPropagation()
                                                    handlePublish(draft.id, draft.platform)
                                                }}
                                                disabled={isPublishingId === draft.id}
                                            >
                                                {isPublishingId === draft.id ? (
                                                    <Loader2 className="h-3.5 w-3.5 animate-spin" />
                                                ) : (
                                                    <>
                                                        {draft.status === 'scheduled' ? 'POST NOW' : 'PUBLISH NOW'} 
                                                        <Zap className="ml-2 h-3.5 w-3.5" />
                                                    </>
                                                )}
                                            </Button>

                                            <DropdownMenu>
                                                <DropdownMenuTrigger asChild>
                                                    <Button
                                                        size="sm"
                                                        className="h-9 px-2 rounded-r-lg rounded-l-none bg-violet-600 hover:bg-violet-500 text-white border-l border-white/10"
                                                        disabled={isPublishingId === draft.id}
                                                    >
                                                        <ChevronDown className="h-4 w-4" />
                                                    </Button>
                                                </DropdownMenuTrigger>
                                                <DropdownMenuContent align="end" className="glass-panel-strong border-white/10 p-2">
                                                    <Popover>
                                                        <PopoverTrigger asChild>
                                                            <DropdownMenuItem 
                                                                onSelect={(e) => e.preventDefault()}
                                                                className="flex items-center gap-2 text-[10px] font-black uppercase tracking-widest text-muted-foreground hover:text-white cursor-pointer p-3 rounded-lg"
                                                            >
                                                                <CalendarIcon className="h-3.5 w-3.5" />
                                                                Schedule Dispatch
                                                            </DropdownMenuItem>
                                                        </PopoverTrigger>
                                                        <PopoverContent className="w-auto p-0 border-white/10 glass-panel-strong" align="end">
                                                            <div className="p-4 bg-background/50 backdrop-blur-3xl rounded-3xl overflow-hidden border border-white/5">
                                                                <Calendar
                                                                    mode="single"
                                                                    selected={scheduledDates[draft.id]}
                                                                    onSelect={(date) => date && setScheduledDates(prev => ({ ...prev, [draft.id]: date }))}
                                                                    initialFocus
                                                                />
                                                                {scheduledDates[draft.id] && (
                                                                    <div className="mt-4 pt-4 border-t border-white/5 space-y-3">
                                                                        <div className="flex items-center justify-between">
                                                                            <span className="text-[10px] font-black uppercase tracking-widest text-muted-foreground mr-4">Target Date</span>
                                                                            <span className="text-xs font-bold text-primary">{format(scheduledDates[draft.id], "PPP")}</span>
                                                                        </div>
                                                                        <div className="flex items-center justify-between bg-white/5 p-2 rounded-xl border border-white/10">
                                                                            <div className="flex items-center gap-2">
                                                                                <Clock className="h-3.5 w-3.5 text-muted-foreground" />
                                                                                <span className="text-[10px] font-black uppercase tracking-widest text-muted-foreground">Post Time</span>
                                                                            </div>
                                                                            <input 
                                                                                type="time" 
                                                                                className="bg-transparent text-xs font-bold text-primary outline-none focus:text-white transition-colors"
                                                                                value={scheduledTimes[draft.id] || "12:00"}
                                                                                onChange={(e) => setScheduledTimes(prev => ({ ...prev, [draft.id]: e.target.value }))}
                                                                            />
                                                                        </div>
                                                                        <Button 
                                                                            className="w-full bg-primary text-primary-foreground h-9 rounded-xl font-black uppercase tracking-widest text-[9px]"
                                                                            onClick={() => {
                                                                                const dt = getScheduledDateTime(draft.id)
                                                                                if (dt) handlePublish(draft.id, draft.platform, dt.toISOString())
                                                                            }}
                                                                        >
                                                                            Confirm Schedule
                                                                        </Button>
                                                                    </div>
                                                                )}
                                                            </div>
                                                        </PopoverContent>
                                                    </Popover>
                                                </DropdownMenuContent>
                                            </DropdownMenu>
                                        </div>
                                        
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
                                                                    draft.media_url?.includes(".mp4") ? handleGenerateVideo(draft.id) : handleGenerateImage(draft.id)
                                                                }}
                                                                disabled={isGeneratingImageId === draft.id || isGeneratingVideoId === draft.id}
                                                            >
                                                                {(isGeneratingImageId === draft.id || isGeneratingVideoId === draft.id) ? <Loader2 className="h-3 w-3 animate-spin mr-1" /> : <Edit3 className="h-3 w-3 mr-1" />}
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
                                                        <div className="flex gap-2 flex-grow">
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
                                                                IMAGE
                                                            </Button>
                                                            <Button
                                                                variant="ghost"
                                                                size="sm"
                                                                className="flex-1 h-8 rounded-lg text-[9px] font-black uppercase tracking-widest text-blue-400 bg-blue-500/5 hover:bg-blue-500/10 border border-blue-500/20"
                                                                onClick={(e) => {
                                                                    e.stopPropagation()
                                                                    handleGenerateVideo(draft.id)
                                                                }}
                                                                disabled={isGeneratingVideoId === draft.id}
                                                            >
                                                                {isGeneratingVideoId === draft.id ? <Loader2 className="h-3 w-3 animate-spin mr-1" /> : <Video className="h-3 w-3 mr-1" />}
                                                                VIDEO
                                                            </Button>
                                                        </div>
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
