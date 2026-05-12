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
    RadioGroup, 
    RadioGroupItem 
} from "@/components/ui/radio-group"
import { 
    Label 
} from "@/components/ui/label"
import { 
    Textarea 
} from "@/components/ui/textarea"
import { 
    Button 
} from "@/components/ui/button"
import { 
    Radio,
    Zap,
    Loader2,
    Bot,
    Globe,
    MessageSquare,
    BookOpen,
    Send,
    AlertTriangle
} from "lucide-react"
import { toast } from "sonner"

interface BroadcastModalProps {
    isOpen: boolean
    onClose: () => void
    agents: any[]
    deployments: any[]
    projectId: string
    onSuccess: () => void
}

export function BroadcastModal({ isOpen, onClose, agents, deployments, projectId, onSuccess }: BroadcastModalProps) {
    const [selectedAgent, setSelectedAgent] = useState<string | null>(null)
    const [selectedDeployment, setSelectedDeployment] = useState<string | null>(null)
    const [message, setMessage] = useState("")
    const [isBroadcasting, setIsBroadcasting] = useState(false)
    const [useAI, setUseAI] = useState(true)

    const handleBroadcast = async () => {
        if (!selectedAgent || !selectedDeployment || !message.trim()) {
            toast.error("Please fill in all fields.")
            return
        }

        setIsBroadcasting(true)
        try {
            const deployment = deployments.find(d => d.id === selectedDeployment)
            if (!deployment) throw new Error("Deployment not found")

            // Call the Next.js API route (server-side, uses service role key — no auth issues)
            const res = await fetch("/api/broadcast", {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({
                    agent_id: selectedAgent,
                    deployment_id: selectedDeployment,
                    message: message.trim(),
                    use_ai: useAI,
                    project_id: projectId
                })
            })

            const json = await res.json()

            if (!res.ok) {
                throw new Error(json.error || `Server error: ${res.status}`)
            }

            const label = json.ai_refined ? "AI-refined broadcast dispatched!" : "Broadcast payload logged."
            toast.success(`✅ ${label}`)
            onSuccess()
            onClose()
            setMessage("")
            setSelectedAgent(null)
            setSelectedDeployment(null)
        } catch (err: any) {
            console.error("[BroadcastModal] Error:", err)
            toast.error(err.message || "Failed to dispatch broadcast.")
        } finally {
            setIsBroadcasting(false)
        }
    }

    return (
        <Dialog open={isOpen} onOpenChange={onClose}>
            <DialogContent className="max-w-2xl bg-background border border-border rounded-3xl overflow-hidden glass-panel p-0">
                <div className="p-8 border-b border-border bg-muted/20">
                    <DialogHeader>
                        <div className="flex items-center gap-4 mb-4">
                            <div className="h-12 w-12 rounded-2xl bg-orange-500/10 border border-orange-500/20 flex items-center justify-center text-orange-500">
                                <Radio className="h-6 w-6 animate-pulse" />
                            </div>
                            <div>
                                <DialogTitle className="text-2xl font-black uppercase tracking-tight">Tactical Broadcast</DialogTitle>
                                <DialogDescription className="text-[10px] font-bold uppercase tracking-widest text-muted-foreground/60">
                                    Disseminate intelligence across your neural network.
                                </DialogDescription>
                            </div>
                        </div>
                    </DialogHeader>
                </div>

                <div className="p-8 space-y-8 max-h-[60vh] overflow-y-auto custom-scrollbar">
                    {/* STEP 1: SELECT AGENT */}
                    <div className="space-y-4">
                        <Label className="text-[10px] font-black uppercase tracking-widest text-muted-foreground flex items-center gap-2">
                            <Bot className="h-3 w-3" />
                            1. Select Broadcast Voice (Agent)
                        </Label>
                        <div className="grid grid-cols-2 gap-2">
                            {agents.map(a => (
                                <button
                                    key={a.id}
                                    onClick={() => setSelectedAgent(a.id)}
                                    className={`p-3 rounded-xl border text-left transition-all ${
                                        selectedAgent === a.id 
                                        ? 'bg-primary/10 border-primary/40 text-primary' 
                                        : 'bg-muted/5 border-border hover:bg-muted/10'
                                    }`}
                                >
                                    <p className="text-[10px] font-black uppercase tracking-tight">{a.name}</p>
                                    <p className="text-[8px] text-muted-foreground uppercase font-bold tracking-widest mt-1 italic">{a.role}</p>
                                </button>
                            ))}
                        </div>
                    </div>

                    {/* STEP 2: SELECT DEPLOYMENT */}
                    <div className="space-y-4">
                        <Label className="text-[10px] font-black uppercase tracking-widest text-muted-foreground flex items-center gap-2">
                            <Globe className="h-3 w-3" />
                            2. Select Distribution Port (Channel)
                        </Label>
                        <div className="grid grid-cols-2 gap-2">
                            {deployments.map(d => (
                                <button
                                    key={d.id}
                                    onClick={() => setSelectedDeployment(d.id)}
                                    className={`p-3 rounded-xl border text-left transition-all flex items-center gap-3 ${
                                        selectedDeployment === d.id 
                                        ? 'bg-emerald-500/10 border-emerald-500/40 text-emerald-400' 
                                        : 'bg-muted/5 border-border hover:bg-muted/10'
                                    }`}
                                >
                                    <div className="h-6 w-6 rounded-lg bg-black/20 flex items-center justify-center shrink-0">
                                        {d.channel?.platform === 'book_reader' ? <BookOpen className="h-3 w-3" /> : 
                                         d.channel?.platform === 'discord' ? <MessageSquare className="h-3 w-3" /> : 
                                         <Globe className="h-3 w-3" />}
                                    </div>
                                    <div className="min-w-0">
                                        <p className="text-[10px] font-black uppercase tracking-tight truncate">{d.channel?.name}</p>
                                        <p className="text-[8px] text-muted-foreground uppercase opacity-60">{d.channel?.platform}</p>
                                    </div>
                                </button>
                            ))}
                        </div>
                    </div>

                    {/* STEP 3: MESSAGE */}
                    <div className="space-y-4">
                        <div className="flex items-center justify-between">
                            <Label className="text-[10px] font-black uppercase tracking-widest text-muted-foreground flex items-center gap-2">
                                <Send className="h-3 w-3" />
                                3. Broadcast Payload (Message / Topic)
                            </Label>
                            <div className="flex items-center gap-2">
                                <button 
                                    onClick={() => setUseAI(!useAI)}
                                    className={`text-[8px] font-black uppercase tracking-widest px-2 py-1 rounded-md transition-all ${
                                        useAI ? 'bg-primary/20 text-primary border border-primary/30' : 'bg-muted text-muted-foreground border border-transparent'
                                    }`}
                                >
                                    AI Refinement: {useAI ? 'ON' : 'OFF'}
                                </button>
                            </div>
                        </div>
                        <Textarea 
                            value={message}
                            onChange={(e) => setMessage(e.target.value)}
                            placeholder="Enter the broadcast topic or raw content..."
                            className="min-h-[120px] rounded-2xl border-border bg-muted/5 focus:ring-primary/20 p-4 text-xs italic"
                        />
                        <p className="text-[9px] text-muted-foreground italic flex items-center gap-1">
                            <AlertTriangle className="h-3 w-3 text-amber-500" />
                            Broadcasts will be formatted according to the platform's specific protocols.
                        </p>
                    </div>
                </div>

                <div className="p-8 bg-muted/10 border-t border-border">
                    <DialogFooter>
                        <Button 
                            onClick={handleBroadcast} 
                            disabled={isBroadcasting || !selectedAgent || !selectedDeployment || !message.trim()}
                            className="w-full h-14 rounded-2xl bg-orange-600 hover:bg-orange-500 text-white font-black uppercase tracking-widest text-[10px] shadow-2xl shadow-orange-500/20 active:scale-95 transition-all"
                        >
                            {isBroadcasting ? (
                                <><Loader2 className="h-4 w-4 animate-spin mr-2" /> Dispatching Payload...</>
                            ) : (
                                <><Zap className="h-4 w-4 mr-2" /> Execute Tactical Broadcast</>
                            )}
                        </Button>
                    </DialogFooter>
                </div>
            </DialogContent>
        </Dialog>
    )
}
