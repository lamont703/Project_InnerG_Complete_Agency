"use client"

import { useState } from "react"
import { 
    Dialog, 
    DialogContent, 
    DialogHeader, 
    DialogTitle, 
    DialogDescription,
    DialogFooter
} from "@/components/ui/dialog"
import { 
    Link as LinkIcon, 
    Zap, 
    Save, 
    Loader2, 
    Bot, 
    Plug, 
    Globe, 
    MessageSquare, 
    BookOpen
} from "lucide-react"
import { Button } from "@/components/ui/button"
import { createBrowserClient } from "@/lib/supabase/browser"
import { toast } from "sonner"

interface DeploymentModalProps {
    isOpen: boolean
    onClose: () => void
    agents: any[]
    channels: any[]
    onSuccess: () => void
}

export function DeploymentModal({ isOpen, onClose, agents, channels, onSuccess }: DeploymentModalProps) {
    const [selectedAgent, setSelectedAgent] = useState<string | null>(null)
    const [selectedChannel, setSelectedChannel] = useState<string | null>(null)
    const [isSaving, setIsSaving] = useState(false)

    const handleDeploy = async () => {
        if (!selectedAgent || !selectedChannel) {
            toast.error("Please select both a persona and a channel.")
            return
        }

        setIsSaving(true)
        try {
            const supabase = createBrowserClient()
            
            const { error } = await (supabase as any)
                .from("community_agent_deployments")
                .insert({
                    agent_id: selectedAgent,
                    channel_id: selectedChannel,
                    is_active: true
                })

            if (error) {
                if (error.code === '23505') {
                    throw new Error("This persona is already deployed to this channel.")
                }
                throw error
            }

            toast.success("Deployment successful! AI persona is now linked to the channel.")
            onSuccess()
            onClose()
            setSelectedAgent(null)
            setSelectedChannel(null)
        } catch (err: any) {
            console.error("[DeploymentModal] Error:", err)
            toast.error(err.message || "Failed to establish bridge.")
        } finally {
            setIsSaving(false)
        }
    }

    return (
        <Dialog open={isOpen} onOpenChange={onClose}>
            <DialogContent className="max-w-xl bg-background border border-border rounded-3xl overflow-hidden glass-panel p-8">
                <DialogHeader className="mb-8 text-center sm:text-left">
                    <div className="h-12 w-12 rounded-xl bg-primary/10 border border-primary/20 flex items-center justify-center text-primary mb-4 mx-auto sm:ml-0">
                        <LinkIcon className="h-6 w-6" />
                    </div>
                    <DialogTitle className="text-2xl font-black uppercase tracking-tight">
                        Neural Synchronization Matrix
                    </DialogTitle>
                    <DialogDescription className="text-[10px] font-bold uppercase tracking-[0.2em] text-muted-foreground/60">
                        Connecting a Persona to a Platform Bridge.
                    </DialogDescription>
                </DialogHeader>

                <div className="space-y-8 animate-in fade-in slide-in-from-bottom-4">
                    
                    {/* STEP 1: SELECT PERSONA */}
                    <div className="space-y-4">
                        <h4 className="text-[10px] font-black uppercase tracking-widest text-muted-foreground flex items-center gap-2">
                            <Bot className="h-3 w-3" />
                            1. Select Intelligence Node (Persona)
                        </h4>
                        <div className="grid grid-cols-2 gap-2">
                            {agents.map(a => (
                                <button
                                    key={a.id}
                                    onClick={() => setSelectedAgent(a.id)}
                                    className={`p-3 rounded-xl border text-left transition-all ${
                                        selectedAgent === a.id 
                                        ? 'bg-primary/10 border-primary/40 text-primary shadow-sm' 
                                        : 'bg-muted/5 border-border hover:bg-muted/10'
                                    }`}
                                >
                                    <p className="text-[10px] font-black uppercase tracking-tight truncate">{a.name}</p>
                                    <p className="text-[8px] text-muted-foreground uppercase font-bold tracking-widest mt-1 italic">{a.role}</p>
                                </button>
                            ))}
                        </div>
                    </div>

                    <div className="flex justify-center flex-col items-center gap-2 opacity-50">
                        <div className="h-4 w-px bg-border" />
                        <Zap className="h-4 w-4 text-amber-500 animate-pulse" />
                        <div className="h-4 w-px bg-border" />
                    </div>

                    {/* STEP 2: SELECT CHANNEL */}
                    <div className="space-y-4">
                        <h4 className="text-[10px] font-black uppercase tracking-widest text-muted-foreground flex items-center gap-2">
                            <Plug className="h-3 w-3" />
                            2. Select Platform Bridge (Channel)
                        </h4>
                        <div className="grid grid-cols-2 gap-2">
                            {channels.map(c => (
                                <button
                                    key={c.id}
                                    onClick={() => setSelectedChannel(c.id)}
                                    className={`p-3 rounded-xl border text-left transition-all flex items-center gap-3 ${
                                        selectedChannel === c.id 
                                        ? 'bg-emerald-500/10 border-emerald-500/40 text-emerald-400 shadow-sm' 
                                        : 'bg-muted/5 border-border hover:bg-muted/10'
                                    }`}
                                >
                                    <div className="h-6 w-6 rounded-lg bg-black/20 flex items-center justify-center shrink-0">
                                        {c.platform === 'book_reader' ? <BookOpen className="h-3 w-3" /> : 
                                         c.platform === 'discord' ? <MessageSquare className="h-3 w-3" /> : 
                                         <Globe className="h-3 w-3" />}
                                    </div>
                                    <div className="min-w-0">
                                        <p className="text-[10px] font-black uppercase tracking-tight truncate">{c.name}</p>
                                        <p className="text-[8px] text-muted-foreground uppercase opacity-60">{c.platform}</p>
                                    </div>
                                </button>
                            ))}
                        </div>
                    </div>
                </div>

                <DialogFooter className="mt-12">
                    <Button 
                        onClick={handleDeploy} 
                        disabled={isSaving || !selectedAgent || !selectedChannel}
                        className="w-full h-14 rounded-2xl bg-primary text-primary-foreground font-black uppercase tracking-widest text-[10px] shadow-2xl shadow-primary/30"
                    >
                        {isSaving ? (
                            <><Loader2 className="h-4 w-4 animate-spin mr-2" /> Syncing neural nodes...</>
                        ) : (
                            <><Zap className="h-4 w-4 mr-2" /> Activate Cross-Protocol Deploy</>
                        )}
                    </Button>
                </DialogFooter>
            </DialogContent>
        </Dialog>
    )
}
