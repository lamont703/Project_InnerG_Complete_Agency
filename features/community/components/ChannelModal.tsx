"use client"

import { useState, useEffect } from "react"
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
    BookOpen,
    Trash2
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
    initialData?: {
        id: string
        name: string
        platform: string
        config: any
    } | null
}

export function ChannelModal({ isOpen, onClose, projectId, onSuccess, initialData }: ChannelModalProps) {
    const [selectedPlatform, setSelectedPlatform] = useState<string | null>(null)
    const [isSaving, setIsSaving] = useState(false)
    const [whitelist, setWhitelist] = useState<string[] | null>(null)
    const [formData, setFormData] = useState({
        name: "",
        apiKey: "",
        baseUrl: "",
        webhookUrl: ""
    })

    useEffect(() => {
        if (isOpen && initialData) {
            setSelectedPlatform(initialData.platform)
            setFormData({
                name: initialData.name,
                apiKey: initialData.config?.apiKey || "",
                baseUrl: initialData.config?.baseUrl || "",
                webhookUrl: initialData.config?.webhookUrl || ""
            })
        } else if (isOpen) {
            setSelectedPlatform(null)
            setFormData({ name: "", apiKey: "", baseUrl: "", webhookUrl: "" })
        }
    }, [isOpen, initialData])

    useEffect(() => {
        const fetchProject = async () => {
            const supabase = createBrowserClient()
            const { data } = await (supabase as any)
                .from("projects")
                .select("settings")
                .eq("id", projectId)
                .single()
            
            const allowed = data?.settings?.features?.community_infrastructure_whitelist || []
            setWhitelist(allowed)
        }
        if (isOpen && projectId) fetchProject()
    }, [isOpen, projectId])

    const allPlatforms = [
        { 
            id: 'link', 
            name: 'Link Community Infrastructure', 
            icon: Globe, 
            color: 'text-primary', 
            bg: 'bg-primary/10',
            description: 'Establish an external bridge for AI personas.'
        },
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
            name: 'Discord Neural Bridge', 
            icon: MessageSquare, 
            color: 'text-indigo-400', 
            bg: 'bg-indigo-500/10',
            description: 'Full bot integration for active persona engagement.'
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
        },
        { 
            id: 'ghl', 
            name: 'GoHighLevel Community', 
            icon: MessageSquare, 
            color: 'text-amber-500', 
            bg: 'bg-amber-500/10',
            description: 'Manage GHL community posts and member engagement.'
        }
    ]

    const platforms = allPlatforms.filter(p => whitelist?.includes(p.id))

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

            const payload = {
                project_id: projectId,
                name: formData.name,
                platform: selectedPlatform,
                config,
                is_active: true
            }

            let result;
            if (initialData?.id) {
                result = await (supabase as any)
                    .from("community_channels")
                    .update(payload)
                    .eq("id", initialData.id)
            } else {
                result = await (supabase as any)
                    .from("community_channels")
                    .insert(payload)
            }

            if (result.error) throw result.error
            
            toast.success(`${formData.name} ${initialData?.id ? 'updated' : 'linked'} successfully.`)
            onSuccess()
            onClose()
        } catch (err: any) {
            console.error("[ChannelModal] Save error:", err)
            toast.error(err.message || "Failed to link community channel.")
        } finally {
            setIsSaving(false)
        }
    }

    const handleDelete = async () => {
        if (!initialData?.id) return
        if (!confirm("Are you sure you want to decommission this connection?")) return

        setIsSaving(true)
        try {
            const supabase = createBrowserClient()
            const { error } = await (supabase as any)
                .from("community_channels")
                .delete()
                .eq("id", initialData.id)

            if (error) throw error
            
            toast.success("Bridge connection decommissioned.")
            onSuccess()
            onClose()
        } catch (err: any) {
            console.error("[ChannelModal] Delete error:", err)
            toast.error(err.message || "Failed to delete connection.")
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
                        {initialData?.id ? "Re-Configure Community Bridge" : "Link Community Infrastructure"}
                    </DialogTitle>
                    <DialogDescription className="text-xs font-bold uppercase tracking-widest text-muted-foreground/60">
                        {initialData?.id ? "Update the neural bridge parameters." : "Establish an external bridge for AI personas."}
                    </DialogDescription>
                </DialogHeader>

                {!selectedPlatform ? (
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 animate-in fade-in slide-in-from-bottom-4">
                        {whitelist === null ? (
                            <div className="col-span-full py-10 flex flex-col items-center justify-center gap-3">
                                <Loader2 className="h-5 w-5 animate-spin text-primary opacity-40" />
                                <span className="text-[9px] font-black uppercase tracking-widest text-muted-foreground italic">Verifying Deployment Tokens...</span>
                            </div>
                        ) : platforms.length === 0 ? (
                            <div className="col-span-full py-10 px-6 rounded-2xl bg-amber-500/5 border border-amber-500/10 flex flex-col items-center text-center">
                                <Shield className="h-6 w-6 text-amber-500 mb-3" />
                                <h4 className="text-sm font-bold mb-1 tracking-tight italic">Protocol Restriction Active</h4>
                                <p className="text-xs text-muted-foreground leading-relaxed">No infrastructure connections have been whitelisted for this portal by the parent agency.</p>
                            </div>
                        ) : platforms.map(p => (
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
                            ) : selectedPlatform === 'ghl' ? (
                                <>
                                    <div className="space-y-2">
                                        <label className="text-[10px] font-black uppercase tracking-widest text-muted-foreground ml-1">Location ID</label>
                                        <Input 
                                            placeholder="GHL Location ID (e.g. QLyYYRoOhCg65lKW9HDX)" 
                                            className="rounded-xl h-12"
                                            value={formData.baseUrl}
                                            onChange={e => setFormData({...formData, baseUrl: e.target.value})}
                                        />
                                    </div>
                                    <div className="space-y-2">
                                        <label className="text-[10px] font-black uppercase tracking-widest text-muted-foreground ml-1">Location Access Token</label>
                                        <Input 
                                            type="password"
                                            placeholder="pit-••••••••••••••••" 
                                            className="rounded-xl h-12"
                                            value={formData.apiKey}
                                            onChange={e => setFormData({...formData, apiKey: e.target.value})}
                                        />
                                    </div>
                                </>
                            ) : selectedPlatform === 'discord' ? (
                                <div className="space-y-6">
                                    <div className="p-6 rounded-2xl bg-indigo-500/5 border border-indigo-500/10 text-center space-y-4">
                                        <div className="h-12 w-12 rounded-2xl bg-indigo-500/10 flex items-center justify-center mx-auto text-indigo-400">
                                            <MessageSquare className="h-6 w-6" />
                                        </div>
                                        <div className="space-y-2">
                                            <h4 className="text-sm font-bold tracking-tight">Advanced Neural Integration</h4>
                                            <p className="text-[10px] text-muted-foreground leading-relaxed italic">
                                                This will invite the <strong>{process.env.NEXT_PUBLIC_APP_NAME || 'Agency'}</strong> bot to your server. 
                                                Ensure you have <strong>Manage Server</strong> permissions on the target Discord server.
                                            </p>
                                        </div>
                                        
                                        <Button 
                                            variant="secondary"
                                            className="w-full h-12 rounded-xl bg-indigo-600 hover:bg-indigo-500 text-white font-black uppercase tracking-widest text-[10px]"
                                            onClick={() => {
                                                const clientId = "1487865692589002892" // From .env
                                                const redirect = encodeURIComponent(`${window.location.origin}/discord/callback`)
                                                const scopes = encodeURIComponent("identify bot email applications.commands guilds role_connections.write")
                                                const permissions = "311494735936" // The permissions integer I calculated
                                                // Using projectId as state to associate the guild with this client
                                                const oauthUrl = `https://discord.com/oauth2/authorize?client_id=${clientId}&permissions=${permissions}&response_type=code&redirect_uri=${redirect}&integration_type=0&scope=${scopes}&state=${projectId}`
                                                window.location.href = oauthUrl
                                            }}
                                        >
                                            <ExternalLink className="h-4 w-4 mr-2" />
                                            Authorize Neural App
                                        </Button>
                                    </div>

                                    <div className="relative">
                                        <div className="absolute inset-0 flex items-center">
                                            <span className="w-full border-t border-border/50" />
                                        </div>
                                        <div className="relative flex justify-center text-[8px] font-black uppercase tracking-[0.3em] text-muted-foreground bg-background px-3">
                                            OR USE LEGACY WEBHOOK
                                        </div>
                                    </div>

                                    <div className="space-y-2 opacity-60 hover:opacity-100 transition-opacity">
                                        <label className="text-[10px] font-black uppercase tracking-widest text-muted-foreground ml-1">Legacy Webhook URL</label>
                                        <Input 
                                            placeholder="https://discord.com/api/webhooks/..." 
                                            className="rounded-xl h-12"
                                            value={formData.webhookUrl}
                                            onChange={e => setFormData({...formData, webhookUrl: e.target.value})}
                                        />
                                    </div>
                                </div>
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
                            onClick={initialData?.id ? handleDelete : onClose}
                            disabled={isSaving}
                            className={`rounded-xl flex-1 border-border font-bold uppercase tracking-widest text-[10px] ${
                                initialData?.id ? 'hover:bg-red-500/10 hover:text-red-500 hover:border-red-500/40 text-muted-foreground' : ''
                            }`}
                        >
                            {initialData?.id ? (
                                <><Trash2 className="h-4 w-4 mr-2" /> Decommission Connection</>
                            ) : (
                                "Abort Link"
                            )}
                        </Button>
                        <Button 
                            onClick={handleSave}
                            disabled={isSaving || !selectedPlatform}
                            className="rounded-xl flex-1 bg-emerald-600 hover:bg-emerald-500 text-white shadow-lg shadow-emerald-500/20 font-bold uppercase tracking-widest text-[10px]"
                        >
                            {isSaving ? (
                                <><Loader2 className="h-4 w-4 animate-spin mr-2" /> Encrypting...</>
                            ) : (
                                <><Save className="h-4 w-4 mr-2" /> {initialData?.id ? 'Seal Neural Bridge Update' : 'Establish Neural Bridge'}</>
                            )}
                        </Button>
                    </div>
                </DialogFooter>
            </DialogContent>
        </Dialog>
    )
}
