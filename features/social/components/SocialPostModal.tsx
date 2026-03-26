"use client"

import { useState, useEffect } from "react"
import { 
    X,
    Calendar,
    Loader2,
    Save,
    Check,
    Youtube,
    Instagram,
    Facebook,
    Linkedin,
    Twitter,
    MessageSquare,
    Zap,
    Clock,
    AlertTriangle,
    Image as ImageIcon,
    Globe,
    ChevronDown,
    Shield
} from "lucide-react"
import { Button } from "@/components/ui/button"
import { createBrowserClient } from "@/lib/supabase/browser"
import { toast } from "sonner"

interface SocialPostModalProps {
    isOpen: boolean
    onClose: () => void
    projectId: string
    onSuccess: () => void
    platforms: string[]
}

interface GHLAccount {
    id: string
    ghl_account_id: string
    name: string
    type: string
}

export function SocialPostModal({ isOpen, onClose, projectId, onSuccess, platforms }: SocialPostModalProps) {
    const [isSaving, setIsSaving] = useState(false)
    const [title, setTitle] = useState("")
    const [content, setContent] = useState("")
    const [selectedPlatform, setSelectedPlatform] = useState(platforms[0] || "")
    const [scheduledAt, setScheduledAt] = useState("")
    const [executeNow, setExecuteNow] = useState(false)
    const [ghlAccounts, setGHLAccounts] = useState<GHLAccount[]>([])
    const [selectedGHLAccount, setSelectedGHLAccount] = useState("")
    const [ghlNotify, setGHLNotify] = useState(false)
    const [isLoadingAccounts, setIsLoadingAccounts] = useState(false)

    useEffect(() => {
        if (isOpen && selectedPlatform === 'ghl') {
            fetchGHLAccounts()
        }
    }, [isOpen, selectedPlatform])

    const fetchGHLAccounts = async () => {
        setIsLoadingAccounts(true)
        try {
            const supabase = createBrowserClient()
            const { data } = await supabase
                .from("ghl_social_accounts")
                .select("*")
                .eq("project_id", projectId) as any
            
            if (data) {
                setGHLAccounts(data)
                if (data.length > 0) setSelectedGHLAccount(data[0].ghl_account_id)
            }
        } catch (err) {
            console.error("Failed to load GHL accounts", err)
        } finally {
            setIsLoadingAccounts(false)
        }
    }

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault()
        if (!selectedPlatform || !scheduledAt || !content) {
            toast.error("Please fill all mandatory protocols")
            return
        }

        setIsSaving(true)
        try {
            const supabase = createBrowserClient()
            
            let destinationId = selectedPlatform // Default
            let metadata: any = {}

            if (selectedPlatform === 'ghl') {
                destinationId = selectedGHLAccount
                metadata = {
                    communityPostDetails: {
                        title: title,
                        notifyAllGroupMembers: ghlNotify,
                        shortenedLinks: []
                    }
                }
            }

            // Unified Dispatch Protocol: Consolidated Strategic Planning & Execution
            const { error } = await (supabase as any)
                .from("social_content_plan")
                .insert({
                    project_id: projectId,
                    platform: selectedPlatform,
                    destination_id: destinationId,
                    title,
                    content_text: content,
                    status: executeNow ? 'published' : 'scheduled',
                    source_type: 'manual',
                    scheduled_at: executeNow ? new Date().toISOString() : new Date(scheduledAt || new Date()).toISOString(),
                    ai_reasoning: executeNow ? "Immediate human-led broadcast override." : "Human-provisioned tactical broadcast via Social Planner.",
                    dispatch_metadata: metadata
                })

            if (error) throw error
            
            toast.success("Broadcast synchronized and provisioned")
            onSuccess()
            onClose()
            // Reset state
            setTitle("")
            setContent("")
            setScheduledAt("")
        } catch (err: any) {
            toast.error(`Provisioning Failed: ${err.message}`)
        } finally {
            setIsSaving(false)
        }
    }

    if (!isOpen) return null

    const PLATFORM_UI: Record<string, { icon: any, color: string }> = {
        youtube: { icon: Youtube, color: 'text-red-500' },
        instagram: { icon: Instagram, color: 'text-pink-500' },
        facebook: { icon: Facebook, color: 'text-blue-600' },
        linkedin: { icon: Linkedin, color: 'text-blue-500' },
        twitter: { icon: Twitter, color: 'text-zinc-400' },
        ghl: { icon: MessageSquare, color: 'text-orange-500' },
        discord: { icon: MessageSquare, color: 'text-indigo-400' },
        slack: { icon: Zap, color: 'text-emerald-400' }
    }

    return (
        <div className="fixed inset-0 z-[100] flex items-center justify-center p-4">
            <div className="absolute inset-0 bg-background/80 backdrop-blur-xl" onClick={onClose} />
            
            <form 
                onSubmit={handleSubmit}
                className="relative w-full max-w-2xl bg-background border border-border rounded-[2.5rem] shadow-2xl overflow-hidden animate-in fade-in zoom-in-95 duration-300"
            >
                {/* Header */}
                <div className="px-8 py-8 border-b border-border flex items-center justify-between">
                    <div>
                        <h2 className="text-xl font-black uppercase tracking-tight flex items-center gap-3">
                            <Zap className="h-5 w-5 text-primary" />
                            Provision <span className="text-primary italic font-light lowercase">broadcast</span>
                        </h2>
                        <p className="text-[10px] text-muted-foreground font-bold uppercase tracking-widest mt-1">Multi-Platform Automated Dispatch Protocol</p>
                    </div>
                    <button type="button" onClick={onClose} className="h-10 w-10 flex items-center justify-center rounded-2xl hover:bg-muted transition-colors">
                        <X className="h-5 w-5" />
                    </button>
                </div>

                <div className="p-8 space-y-8 max-h-[70vh] overflow-y-auto custom-scrollbar">
                    {/* Platform Matrix */}
                    <div className="space-y-4">
                        <label className="text-[10px] font-black uppercase tracking-widest text-muted-foreground flex items-center gap-2">
                            <Globe className="h-3 w-3" />
                            Target Delivery Node
                        </label>
                        <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
                            {platforms.map(p => {
                                const ui = PLATFORM_UI[p] || { icon: Globe, color: 'text-primary' }
                                return (
                                    <button
                                        key={p}
                                        type="button"
                                        onClick={() => setSelectedPlatform(p)}
                                        className={`p-4 rounded-2xl border transition-all flex flex-col items-center gap-2 group ${
                                            selectedPlatform === p 
                                            ? 'bg-primary/5 border-primary shadow-lg shadow-primary/5' 
                                            : 'bg-muted/5 border-border hover:border-primary/40'
                                        }`}
                                    >
                                        <ui.icon className={`h-6 w-6 ${selectedPlatform === p ? ui.color : 'text-muted-foreground opacity-40 group-hover:opacity-100'}`} />
                                        <span className={`text-[9px] font-black uppercase tracking-widest ${selectedPlatform === p ? 'text-primary' : 'text-muted-foreground opacity-60'}`}>{p}</span>
                                    </button>
                                )
                            })}
                        </div>
                    </div>

                    {/* Platform Specific Config (e.g. GHL Account) */}
                    {selectedPlatform === 'ghl' && (
                        <div className="space-y-4 animate-in slide-in-from-top-2">
                            <label className="text-[10px] font-black uppercase tracking-widest text-primary flex items-center gap-2">
                                <Shield className="h-3 w-3" />
                                GHL Location Entity
                            </label>
                            {isLoadingAccounts ? (
                                <Loader2 className="h-4 w-4 animate-spin text-primary" />
                            ) : (
                                <select 
                                    value={selectedGHLAccount}
                                    onChange={(e) => setSelectedGHLAccount(e.target.value)}
                                    className="w-full h-12 bg-muted/5 border border-border rounded-xl px-4 text-xs font-bold outline-none ring-primary/20 focus:ring-1"
                                >
                                    {ghlAccounts.map(acc => (
                                        <option key={acc.id} value={acc.ghl_account_id}>{acc.name} ({acc.type})</option>
                                    ))}
                                    {ghlAccounts.length === 0 && <option disabled>No active accounts found</option>}
                                </select>
                            )}

                            <label className="flex items-center gap-3 p-4 rounded-2xl bg-orange-500/5 border border-orange-500/10 cursor-pointer group">
                                <input 
                                    type="checkbox" 
                                    checked={ghlNotify}
                                    onChange={(e) => setGHLNotify(e.target.checked)}
                                    className="h-4 w-4 rounded border-border text-orange-500 focus:ring-orange-500/20"
                                />
                                <div className="space-y-0.5">
                                    <span className="text-[10px] font-black uppercase tracking-widest text-orange-500 block">Broadcast Alert</span>
                                    <p className="text-[9px] text-muted-foreground opacity-80 leading-tight">Notify all community members as soon as this post goes live.</p>
                                </div>
                            </label>
                        </div>
                    )}

                    {/* Content Editor */}
                    <div className="space-y-6">
                        <div className="space-y-2">
                            <label className="text-[10px] font-black uppercase tracking-widest text-muted-foreground">Broadcast Title (Internal / GHL Community)</label>
                            <input 
                                type="text"
                                placeholder="E.g. Morning Strategy Bulletin"
                                value={title}
                                onChange={(e) => setTitle(e.target.value)}
                                className="w-full h-12 bg-muted/10 border border-border rounded-xl px-4 text-sm font-bold placeholder:text-muted-foreground/30 focus:ring-1 focus:ring-primary outline-none transition-all"
                            />
                        </div>

                        <div className="space-y-2">
                            <label className="text-[10px] font-black uppercase tracking-widest text-muted-foreground">Payload Content (The Post Content)</label>
                            <textarea
                                value={content}
                                onChange={(e) => setContent(e.target.value)}
                                placeholder="What would you like to broadcast to your nodes?"
                                className="w-full h-40 bg-muted/10 border border-border rounded-2xl p-6 text-sm font-medium leading-relaxed placeholder:text-muted-foreground/30 focus:ring-1 focus:ring-primary outline-none transition-all resize-none"
                            />
                        </div>

                        {/* Dispatch Control */}
                        <div className="p-6 rounded-3xl bg-primary/5 border border-primary/10 space-y-4">
                            <div className="flex items-center justify-between">
                                <label className="text-[10px] font-black uppercase tracking-widest text-primary flex items-center gap-2">
                                    <Clock className="h-3 w-3" />
                                    Dispatch Protocol
                                </label>
                                <div className="flex items-center gap-2">
                                    <span className="text-[8px] font-bold text-muted-foreground uppercase tracking-widest">Execute Immediately</span>
                                    <button
                                        type="button"
                                        onClick={() => setExecuteNow(!executeNow)}
                                        className={`w-10 h-5 rounded-full transition-all relative ${executeNow ? 'bg-primary' : 'bg-muted border border-border'}`}
                                    >
                                        <div className={`absolute top-1 w-3 h-3 rounded-full bg-white transition-all ${executeNow ? 'left-6' : 'left-1'}`} />
                                    </button>
                                </div>
                            </div>

                            {!executeNow ? (
                                <div className="grid grid-cols-1 md:grid-cols-2 gap-6 animate-in fade-in slide-in-from-top-1">
                                    <div className="space-y-2">
                                        <label className="text-[10px] font-black uppercase tracking-widest text-muted-foreground">Dispatch Timestamp</label>
                                        <input 
                                            type="datetime-local"
                                            value={scheduledAt}
                                            onChange={(e) => setScheduledAt(e.target.value)}
                                            className="w-full h-10 bg-background border border-border rounded-xl px-4 text-xs font-bold focus:ring-1 focus:ring-primary outline-none"
                                        />
                                    </div>
                                    <div className="flex flex-col justify-center">
                                        <p className="text-[10px] text-muted-foreground leading-relaxed italic pr-4">
                                            "Your broadcast will join the orbital queue for future dispatch."
                                        </p>
                                    </div>
                                </div>
                            ) : (
                                <div className="p-4 rounded-2xl bg-primary/10 border border-primary/20 animate-in zoom-in-95">
                                    <p className="text-[10px] text-primary font-bold uppercase tracking-widest flex items-center gap-2 mb-1">
                                        <Zap className="h-3 w-3" />
                                        Manual Force-Dispatch Active
                                    </p>
                                    <p className="text-[9px] text-muted-foreground leading-relaxed italic">
                                        "Bypassing the queue. This broadcast will be executed immediately across all target nodes."
                                    </p>
                                </div>
                            )}
                        </div>
                    </div>
                </div>

                {/* Footer Controls */}
                <div className="px-8 py-8 border-t border-border bg-muted/5 flex items-center justify-between">
                    <Button 
                        type="button" 
                        variant="ghost" 
                        onClick={onClose}
                        className="rounded-xl h-12 px-8 font-black uppercase tracking-widest text-[9px] hover:bg-muted"
                    >
                        Halt Sequence
                    </Button>
                    <Button 
                        type="submit"
                        disabled={isSaving}
                        className="rounded-xl h-12 px-10 bg-primary text-primary-foreground font-black uppercase tracking-widest text-[9px] shadow-xl shadow-primary/20 transition-all hover:scale-[1.02] active:scale-95"
                    >
                        {isSaving ? (
                            <><Loader2 className="h-4 w-4 animate-spin mr-2" /> Initializing Node...</>
                        ) : (
                            <><Check className="h-4 w-4 mr-2" /> Sealing Broadcast</>
                        )}
                    </Button>
                </div>
            </form>
        </div>
    )
}
