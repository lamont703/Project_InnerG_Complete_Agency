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
    Globe, 
    MessageSquare, 
    Zap, 
    Plus, 
    Save, 
    Loader2, 
    Shield, 
    ExternalLink,
    Search,
    Check,
    Plug,
    BookOpen
} from "lucide-react"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { createBrowserClient } from "@/lib/supabase/browser"
import { toast } from "sonner"

interface ChannelModalProps {
    isOpen: boolean
    onClose: () => void
    projectId: string
    onSuccess: () => void
}

export function ChannelModal({ isOpen, onClose, projectId, onSuccess }: ChannelModalProps) {
    const [selectedPlatform, setSelectedPlatform] = useState<string | null>(null)
    const [isSaving, setIsSaving] = useState(false)
    const [formData, setFormData] = useState({
        name: "",
        apiKey: "",
        baseUrl: "",
        webhookUrl: ""
    })

    const platforms = [
        { 
            id: 'book_reader', 
            name: 'Book Reader App', 
            icon: BookOpen, 
            color: 'text-emerald-400', 
            bg: 'bg-emerald-500/10',
            description: 'Connect internal discussion threads.'
        },
        { 
            id: 'discord', 
            name: 'Discord Webhook', 
            icon: MessageSquare, 
            color: 'text-indigo-400', 
            bg: 'bg-indigo-500/10',
            description: 'Reply to messages in specific channels.'
        },
        { 
            id: 'slack', 
            name: 'Slack Internal', 
            icon: Zap, 
            color: 'text-amber-400', 
            bg: 'bg-amber-500/10',
            description: 'Monitor workspaces and key threads.'
        },
        { 
            id: 'telegram', 
            name: 'Telegram Bot', 
            icon: Globe, 
            color: 'text-sky-400', 
            bg: 'bg-sky-500/10',
            description: 'Broadcast and engage with groups.'
        }
    ]

    const handleSave = async () => {
        if (!selectedPlatform || !formData.name) {
            toast.error("Please select a platform and provide a name.")
            return
        }

        setIsSaving(true)
        try {
            const supabase = createBrowserClient()
            const config = {
                apiKey: formData.apiKey,
                baseUrl: formData.baseUrl,
                webhookUrl: formData.webhookUrl
            }

            const { error } = await (supabase as any)
                .from("community_channels")
                .insert({
                    project_id: projectId,
                    name: formData.name,
                    platform: selectedPlatform,
                    config,
                    is_active: true
                })

            if (error) throw error
            
            toast.success(`${formData.name} linked successfully.`)
            onSuccess()
            onClose()
            setSelectedPlatform(null)
            setFormData({ name: "", apiKey: "", baseUrl: "", webhookUrl: "" })
        } catch (err: any) {
            console.error("[ChannelModal] Save error:", err)
            toast.error(err.message || "Failed to link community channel.")
        } finally {
            setIsSaving(false)
        }
    }

    return (
        <Dialog open={isOpen} onOpenChange={onClose}>
            <DialogContent className="max-w-xl bg-background border border-border rounded-3xl overflow-hidden glass-panel p-8">
                <DialogHeader className="mb-8">
                    <div className="h-12 w-12 rounded-xl bg-primary/10 border border-primary/20 flex items-center justify-center text-primary mb-4">
                        <Plug className="h-6 w-6" />
                    </div>
                    <DialogTitle className="text-2xl font-black uppercase tracking-tight">
                        Link Community Infrastructure
                    </DialogTitle>
                    <DialogDescription className="text-xs font-bold uppercase tracking-widest text-muted-foreground/60">
                        Establish an external bridge for AI personas.
                    </DialogDescription>
                </DialogHeader>

                {!selectedPlatform ? (
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 animate-in fade-in slide-in-from-bottom-4">
                        {platforms.map(p => (
                            <button
                                key={p.id}
                                onClick={() => setSelectedPlatform(p.id)}
                                className="p-4 rounded-2xl border border-border bg-muted/5 hover:bg-muted/10 hover:border-primary/20 transition-all text-left group"
                            >
                                <div className={`h-10 w-10 rounded-xl ${p.bg} ${p.color} flex items-center justify-center mb-3 group-hover:scale-110 transition-transform`}>
                                    <p.icon className="h-5 w-5" />
                                </div>
                                <h4 className="text-sm font-bold text-foreground mb-1">{p.name}</h4>
                                <p className="text-[10px] text-muted-foreground leading-tight">{p.description}</p>
                            </button>
                        ))}
                    </div>
                ) : (
                    <div className="space-y-6 animate-in fade-in slide-in-from-right-4">
                        <div className="flex items-center justify-between p-4 rounded-xl bg-primary/5 border border-primary/10 mb-4">
                            <div className="flex items-center gap-3">
                                {(() => {
                                    const p = platforms.find(p => p.id === selectedPlatform)
                                    if (!p) return null
                                    const Icon = p.icon
                                    return (
                                        <div className="h-8 w-8 rounded-lg bg-background flex items-center justify-center text-primary border border-border shadow-sm">
                                            <Icon className="h-4 w-4" />
                                        </div>
                                    )
                                })()}
                                <span className="text-[10px] font-black uppercase tracking-widest">{platforms.find(p => p.id === selectedPlatform)?.name} Configuration</span>
                            </div>
                            <Button 
                                variant="ghost" 
                                size="sm" 
                                onClick={() => setSelectedPlatform(null)}
                                className="h-7 text-[9px] font-bold uppercase tracking-widest text-muted-foreground hover:text-primary"
                            >
                                Change
                            </Button>
                        </div>

                        <div className="space-y-4">
                            <div className="space-y-2">
                                <label className="text-[10px] font-black uppercase tracking-widest text-muted-foreground ml-1">Channel Label</label>
                                <Input 
                                    placeholder="e.g. Main Literature Room" 
                                    className="rounded-xl h-12"
                                    value={formData.name}
                                    onChange={e => setFormData({...formData, name: e.target.value})}
                                />
                            </div>

                            {selectedPlatform === 'book_reader' ? (
                                <>
                                    <div className="space-y-2">
                                        <label className="text-[10px] font-black uppercase tracking-widest text-muted-foreground ml-1">Internal Platform URL</label>
                                        <Input 
                                            placeholder="https://app.bookreader.io/api/v1" 
                                            className="rounded-xl h-12"
                                            value={formData.baseUrl}
                                            onChange={e => setFormData({...formData, baseUrl: e.target.value})}
                                        />
                                    </div>
                                    <div className="space-y-2">
                                        <label className="text-[10px] font-black uppercase tracking-widest text-muted-foreground ml-1">Secret Access Key</label>
                                        <Input 
                                            type="password"
                                            placeholder="••••••••••••••••" 
                                            className="rounded-xl h-12"
                                            value={formData.apiKey}
                                            onChange={e => setFormData({...formData, apiKey: e.target.value})}
                                        />
                                    </div>
                                </>
                            ) : (
                                <div className="space-y-2">
                                    <label className="text-[10px] font-black uppercase tracking-widest text-muted-foreground ml-1">Platform Webhook Destination URL</label>
                                    <Input 
                                        placeholder="https://discord.com/api/webhooks/..." 
                                        className="rounded-xl h-12"
                                        value={formData.webhookUrl}
                                        onChange={e => setFormData({...formData, webhookUrl: e.target.value})}
                                    />
                                </div>
                            )}
                        </div>

                        <div className="p-4 rounded-xl bg-amber-500/5 border border-amber-500/10 flex items-start gap-3">
                            <Shield className="h-4 w-4 text-amber-500 shrink-0 mt-0.5" />
                            <p className="text-[10px] text-muted-foreground leading-relaxed italic">
                                Connection details are encrypted in transit. Your AI personas will use this bridge to listen and engage in real-time.
                            </p>
                        </div>
                    </div>
                )}

                <DialogFooter className="mt-12">
                    <div className="flex items-center gap-3 w-full">
                        <Button 
                            variant="outline" 
                            onClick={onClose}
                            className="rounded-xl flex-1 border-border font-bold uppercase tracking-widest text-[10px]"
                        >
                            Abort Link
                        </Button>
                        <Button 
                            onClick={handleSave}
                            disabled={isSaving || !selectedPlatform}
                            className="rounded-xl flex-1 bg-emerald-600 hover:bg-emerald-500 text-white shadow-lg shadow-emerald-500/20 font-bold uppercase tracking-widest text-[10px]"
                        >
                            {isSaving ? (
                                <><Loader2 className="h-4 w-4 animate-spin mr-2" /> Encrypting...</>
                            ) : (
                                <><Save className="h-4 w-4 mr-2" /> Establish Neural Bridge</>
                            )}
                        </Button>
                    </div>
                </DialogFooter>
            </DialogContent>
        </Dialog>
    )
}
