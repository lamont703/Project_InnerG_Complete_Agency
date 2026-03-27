import { useState, useEffect } from "react"
import { Database, Zap, Instagram, Loader2, ArrowUpRight, Bug, ChevronDown, ChevronUp, Trash2, Send, Linkedin, Youtube, Calendar as CalendarIcon, Clock } from "lucide-react"
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
import { Signal } from "../types"
import { createBrowserClient } from "@/lib/supabase/browser"

const TYPE_ICONS: Record<string, any> = {
    inventory: Database,
    conversion: Zap,
    social: Instagram,
    linkedin: Linkedin,
    youtube: Youtube,
    bug_report: Bug,
    strategic: Zap,
    ai_insight: Zap,
}

interface SignalCardProps {
    signal: Signal
    isResolving: boolean
    onResolve: (id: string, params?: { platforms?: string[], scheduledAt?: string }) => void
    onDeleteAction?: (draftId: string, projectId: string) => Promise<void>
    isHighlighted?: boolean
    statusBadge?: React.ReactNode
    isAgencyMode?: boolean
}

export function SignalCard({
    signal,
    onResolve,
    onDeleteAction,
    isResolving,
    isAgencyMode = false,
    isHighlighted = false,
    statusBadge
}: SignalCardProps) {
    const [isExpanded, setIsExpanded] = useState(false)
    const [draftContent, setDraftContent] = useState<string | null>(null)
    const [isFetchingDraft, setIsFetchingDraft] = useState(false)
    const [isDeleting, setIsDeleting] = useState(false)
    const [selectedPlatforms, setSelectedPlatforms] = useState<string[]>([])
    const [scheduledDate, setScheduledDate] = useState<Date | undefined>(undefined)
    const [scheduledTime, setScheduledTime] = useState<string>("12:00")

    const isSocial = signal.signalType === 'social'
    const platform = signal.metadata?.platform?.toLowerCase()
    const Icon = (isSocial && platform === 'linkedin') ? Linkedin : (isSocial && platform === 'youtube') ? Youtube : (TYPE_ICONS[signal.signalType] || Zap)

    const isAgencyInsight = signal.isAgencyOnly || isAgencyMode
    const socialPlanId = signal.metadata?.social_plan_id
    const isLongBody = signal.body.length > 120

    const getFullScheduledDate = () => {
        if (!scheduledDate) return null
        const [hours, minutes] = scheduledTime.split(':').map(Number)
        const d = new Date(scheduledDate)
        d.setHours(hours, minutes, 0, 0)
        return d
    }

    const togglePlatform = (p: string) => {
        const pLower = p.toLowerCase()
        const defaultPlatform = platform?.toLowerCase()
        setSelectedPlatforms(prev => {
            const current = (prev.length === 0 && defaultPlatform) ? [defaultPlatform] : prev
            if (current.includes(pLower)) {
                if (current.length === 1) return current
                return current.filter(x => x !== pLower)
            } else {
                return [...current, pLower]
            }
        })
    }

    const currentSelected = selectedPlatforms.length > 0 ? selectedPlatforms : (platform ? [platform.toLowerCase()] : [])

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
                    {statusBadge}
                    <span className={`flex h-2 w-2 rounded-full animate-pulse ${isAgencyInsight ? "bg-violet-500 shadow-[0_0_12px_rgba(139,92,246,0.6)]" : `${signal.color} shadow-[0_0_12px_rgba(var(--primary),0.6)]`
                        }`} />
                </div>
            </div>

            <div className="flex flex-col md:flex-row md:items-start gap-6 relative z-10">
                {/* Visual Icon Pillar */}
                <div className={`shrink-0 h-14 w-14 rounded-2xl flex items-center justify-center border border-white/5 shadow-inner transition-transform duration-500 group-hover:scale-110 ${(isAgencyInsight && signal.signalType !== 'social') ? "bg-violet-500/10 border-violet-500/20" : "bg-white/5"
                    }`}>
                    <Icon className={`h-7 w-7 ${(isAgencyInsight && signal.signalType !== 'social') ? "text-violet-400" : signal.color.replace('bg-', 'text-')}`} />
                </div>

                <div className="flex-1">
                    <div className="flex items-center gap-3 mb-3">
                        <span className={`px-2.5 py-1 rounded-md text-[8px] font-black uppercase tracking-[0.2em] border border-white/5 ${isAgencyInsight && signal.signalType !== 'social'
                            ? "bg-violet-500/10 text-violet-400 border-violet-500/20"
                            : `${signal.color.replace('bg-', 'bg- opacity-10')} ${signal.color.replace('bg-', 'text-')}`
                            }`}>
                            {isAgencyInsight ? (signal.signalType === 'strategic' ? "Strategic Insight" : (signal.signalType === 'social' ? "SOCIAL" : "Algorithm Logic")) : signal.signalType.toUpperCase().replace("_", " ")}
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

                        {isExpanded && (isSocial || socialPlanId) && (
                            <div className="mt-4 flex items-center gap-3 p-4 rounded-2xl bg-white/5 border border-white/10 animate-in fade-in slide-in-from-top-2">
                                <span className="text-[10px] font-black uppercase tracking-widest text-muted-foreground mr-1">Distribution Ports:</span>
                                <button
                                    onClick={(e) => { e.stopPropagation(); togglePlatform('linkedin'); }}
                                    className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg border transition-all ${currentSelected.includes('linkedin') ? 'bg-blue-500/20 border-blue-500/40 text-blue-400 font-bold' : 'bg-transparent border-white/5 text-muted-foreground/30 hover:border-white/10'}`}
                                >
                                    <Linkedin className="h-3.5 w-3.5" />
                                    <span className="text-[9px] font-black uppercase tracking-tighter">LinkedIn</span>
                                </button>
                                <button
                                    onClick={(e) => { e.stopPropagation(); togglePlatform('instagram'); }}
                                    className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg border transition-all ${currentSelected.includes('instagram') ? 'bg-pink-500/20 border-pink-500/40 text-pink-400 font-bold' : 'bg-transparent border-white/5 text-muted-foreground/30 hover:border-white/10'}`}
                                >
                                    <Instagram className="h-3.5 w-3.5" />
                                    <span className="text-[9px] font-black uppercase tracking-tighter">Instagram</span>
                                </button>
                            </div>
                        )}
                    </div>

                    {/* Action Hub */}
                    <div className="flex flex-wrap items-center gap-3">
                        {(isSocial || socialPlanId) && (signal.actionLabel?.includes("APPROVE") || signal.actionLabel?.includes("PUBLISH")) ? (
                            <div className="flex items-center">
                                <Button
                                    id={`btn-signal-action-${signal.id}`}
                                    className={`${isAgencyInsight ? "bg-violet-600 hover:bg-violet-500 text-white" : signal.buttonColor} px-6 rounded-l-xl rounded-r-none h-10 font-black uppercase tracking-[0.1em] text-[10px] shadow-lg shadow-black/20 transition-all hover:scale-[1.02] active:scale-95 border-b-2 border-black/20 border-r border-white/10`}
                                    onClick={() => onResolve(signal.id, { platforms: currentSelected })}
                                    disabled={isResolving}
                                >
                                    {isResolving ? (
                                        <Loader2 className="h-4 w-4 animate-spin" />
                                    ) : (
                                        <>
                                            PUBLISH NOW
                                            <Zap className="h-3.5 w-3.5 ml-2" />
                                        </>
                                    )}
                                </Button>
                                
                                <DropdownMenu>
                                    <DropdownMenuTrigger asChild>
                                        <Button
                                            className={`${isAgencyInsight ? "bg-violet-600 hover:bg-violet-500 text-white" : signal.buttonColor} px-2 rounded-r-xl rounded-l-none h-10 border-b-2 border-black/20`}
                                            disabled={isResolving}
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
                                                        selected={scheduledDate}
                                                        onSelect={setScheduledDate}
                                                        initialFocus
                                                    />
                                                    {scheduledDate && (
                                                        <div className="mt-4 pt-4 border-t border-white/5 space-y-3">
                                                            <div className="flex items-center justify-between">
                                                                <span className="text-[10px] font-black uppercase tracking-widest text-muted-foreground mr-4">Target Date</span>
                                                                <span className="text-xs font-bold text-primary">{format(scheduledDate, "PPP")}</span>
                                                            </div>
                                                            <div className="flex items-center justify-between bg-white/5 p-2 rounded-xl border border-white/10">
                                                                <div className="flex items-center gap-2">
                                                                    <Clock className="h-3.5 w-3.5 text-muted-foreground" />
                                                                    <span className="text-[10px] font-black uppercase tracking-widest text-muted-foreground">Post Time</span>
                                                                </div>
                                                                <input 
                                                                    type="time" 
                                                                    className="bg-transparent text-xs font-bold text-primary outline-none focus:text-white transition-colors"
                                                                    value={scheduledTime}
                                                                    onChange={(e) => setScheduledTime(e.target.value)}
                                                                />
                                                            </div>
                                                            <Button 
                                                                className="w-full bg-primary text-primary-foreground h-10 rounded-xl font-black uppercase tracking-widest text-[9px]"
                                                                onClick={() => {
                                                                    const dt = getFullScheduledDate()
                                                                    if (dt) onResolve(signal.id, { 
                                                                        platforms: currentSelected,
                                                                        scheduledAt: dt.toISOString() 
                                                                    })
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
                        ) : (
                            <Button
                                id={`btn-signal-action-${signal.id}`}
                                className={`${isAgencyInsight ? "bg-violet-600 hover:bg-violet-500 text-white" : signal.buttonColor} px-6 rounded-xl h-10 font-black uppercase tracking-[0.1em] text-[10px] shadow-lg shadow-black/20 transition-all hover:scale-105 active:scale-95 border-b-2 border-black/20`}
                                onClick={() => onResolve(signal.id, isSocial ? { platforms: currentSelected } : undefined)}
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
                        )}

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
