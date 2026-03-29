"use client"

import { useState } from "react"
import { 
    Dialog, 
    DialogContent, 
    DialogHeader, 
    DialogTitle, 
    DialogDescription,
} from "@/components/ui/dialog"
import { Zap, Loader2, CheckCircle2, MessageSquare, Sparkles } from "lucide-react"
import { Button } from "@/components/ui/button"
import { createBrowserClient } from "@/lib/supabase/browser"
import { toast } from "sonner"

// The Inner G Complete Emoji Pack
// image_url points to the generated assets stored in the public folder
// (we'll copy them there from the artifacts directory)
const EMOJI_PACK = [
    {
        name: "innerg_fire",
        label: "Fire",
        description: "Hype, wins, energy",
        image_url: "/emojis/innerg_fire.png",
        preview: "🔥"
    },
    {
        name: "innerg_sync",
        label: "Sync",
        description: "AI sync, processing",
        image_url: "/emojis/innerg_sync.png",
        preview: "🔄"
    },
    {
        name: "innerg_check",
        label: "Check",
        description: "Verified, done, confirmed",
        image_url: "/emojis/innerg_check.png",
        preview: "✅"
    },
    {
        name: "innerg_neural",
        label: "Neural",
        description: "AI intelligence, recommendations",
        image_url: "/emojis/innerg_neural.png",
        preview: "🧠"
    },
    {
        name: "innerg_rocket",
        label: "Rocket",
        description: "Launches, growth, milestones",
        image_url: "/emojis/innerg_rocket.png",
        preview: "🚀"
    }
]

interface EmojiForgeModalProps {
    isOpen: boolean
    onClose: () => void
    discordChannels: Array<{ id: string; name: string; config: any }>
}

export function EmojiForgeModal({ isOpen, onClose, discordChannels }: EmojiForgeModalProps) {
    const [selectedEmojis, setSelectedEmojis] = useState<string[]>([])
    const [selectedChannel, setSelectedChannel] = useState<string | null>(
        discordChannels.length === 1 ? discordChannels[0].id : null
    )
    const [deploying, setDeploying] = useState(false)
    const [results, setResults] = useState<Record<string, "success" | "error" | "pending">>({})

    const toggleEmoji = (name: string) => {
        setSelectedEmojis(prev =>
            prev.includes(name) ? prev.filter(e => e !== name) : [...prev, name]
        )
    }

    const selectAll = () => {
        setSelectedEmojis(EMOJI_PACK.map(e => e.name))
    }

    const handleDeploy = async () => {
        if (!selectedChannel || selectedEmojis.length === 0) {
            toast.error("Select at least one emoji and a target guild.")
            return
        }

        setDeploying(true)
        const supabase = createBrowserClient()
        const newResults: Record<string, "success" | "error" | "pending"> = {}
        selectedEmojis.forEach(name => { newResults[name] = "pending" })
        setResults({ ...newResults })

        let successCount = 0
        let failCount = 0

        for (const emojiName of selectedEmojis) {
            const emoji = EMOJI_PACK.find(e => e.name === emojiName)!
            try {
                // Convert image to Base64 DATA URI in the browser
                // This avoids the Edge Function trying to reach localhost
                const imgRes = await fetch(emoji.image_url)
                if (!imgRes.ok) throw new Error(`Could not load ${emoji.image_url}`)
                const blob = await imgRes.blob()
                const base64 = await new Promise<string>((resolve, reject) => {
                    const reader = new FileReader()
                    reader.onload = () => resolve(reader.result as string)
                    reader.onerror = reject
                    reader.readAsDataURL(blob)
                })

                const { data, error } = await (supabase.functions.invoke as any)("deploy-emoji", {
                    body: {
                        channel_id: selectedChannel,
                        emoji_name: emojiName,
                        image_data: base64  // Send raw base64 Data URI
                    }
                })

                if (error || data?.error) throw new Error(error?.message || data?.error)
                
                newResults[emojiName] = "success"
                successCount++
            } catch (err: any) {
                newResults[emojiName] = "error"
                failCount++
                console.error(`[EmojiForge] Failed to deploy ${emojiName}:`, err)
            }
            setResults({ ...newResults })
        }

        setDeploying(false)
        if (successCount > 0) toast.success(`${successCount} emoji${successCount > 1 ? 's' : ''} deployed to Discord!`)
        if (failCount > 0) toast.error(`${failCount} emoji${failCount > 1 ? 's' : ''} failed. Check console for details.`)
    }

    const channel = discordChannels.find(c => c.id === selectedChannel)
    const deployedEmojiNames = (channel?.config?.deployed_emojis || []).map((e: any) => e.name)

    return (
        <Dialog open={isOpen} onOpenChange={onClose}>
            <DialogContent className="max-w-2xl bg-background border border-border rounded-3xl overflow-hidden glass-panel p-0">
                {/* Header */}
                <div className="p-8 pb-0">
                    <DialogHeader>
                        <div className="h-12 w-12 rounded-2xl bg-indigo-500/10 border border-indigo-500/20 flex items-center justify-center mb-4">
                            <Sparkles className="h-6 w-6 text-indigo-400" />
                        </div>
                        <DialogTitle className="text-2xl font-black uppercase tracking-tight">
                            Neural Emoji Forge
                        </DialogTitle>
                        <DialogDescription className="text-[10px] font-bold uppercase tracking-[0.2em] text-muted-foreground/60">
                            Deploy branded emojis to your Discord servers.
                        </DialogDescription>
                    </DialogHeader>
                </div>

                <div className="p-8 space-y-8 max-h-[70vh] overflow-y-auto">
                    
                    {/* Guild Selector */}
                    {discordChannels.length > 1 && (
                        <div className="space-y-3">
                            <h4 className="text-[10px] font-black uppercase tracking-widest text-muted-foreground flex items-center gap-2">
                                <MessageSquare className="h-3 w-3" />
                                Target Discord Server
                            </h4>
                            <div className="grid grid-cols-2 gap-2">
                                {discordChannels.map(c => (
                                    <button
                                        key={c.id}
                                        onClick={() => setSelectedChannel(c.id)}
                                        className={`p-3 rounded-xl border text-left transition-all ${
                                            selectedChannel === c.id
                                                ? 'bg-indigo-500/10 border-indigo-500/40 text-indigo-400'
                                                : 'bg-muted/5 border-border hover:bg-muted/10'
                                        }`}
                                    >
                                        <p className="text-[10px] font-black uppercase truncate">{c.name}</p>
                                        <p className="text-[8px] text-muted-foreground mt-0.5">
                                            {(c.config?.deployed_emojis || []).length} emojis deployed
                                        </p>
                                    </button>
                                ))}
                            </div>
                        </div>
                    )}

                    {/* Emoji Pack */}
                    <div className="space-y-4">
                        <div className="flex items-center justify-between">
                            <h4 className="text-[10px] font-black uppercase tracking-widest text-muted-foreground flex items-center gap-2">
                                <Sparkles className="h-3 w-3" />
                                Inner G Emoji Pack
                            </h4>
                            <button
                                onClick={selectAll}
                                className="text-[9px] font-black uppercase tracking-widest text-primary hover:underline"
                            >
                                Select All
                            </button>
                        </div>

                        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
                            {EMOJI_PACK.map(emoji => {
                                const isSelected = selectedEmojis.includes(emoji.name)
                                const isDeployed = deployedEmojiNames.includes(emoji.name)
                                const status = results[emoji.name]

                                return (
                                    <button
                                        key={emoji.name}
                                        onClick={() => !isDeployed && toggleEmoji(emoji.name)}
                                        disabled={isDeployed}
                                        className={`p-4 rounded-2xl border text-left transition-all group relative ${
                                            isDeployed
                                                ? 'bg-emerald-500/5 border-emerald-500/20 opacity-60 cursor-default'
                                                : isSelected
                                                    ? 'bg-indigo-500/10 border-indigo-500/40 shadow-sm shadow-indigo-500/10'
                                                    : 'bg-muted/5 border-border hover:bg-muted/10 hover:border-primary/20'
                                        }`}
                                    >
                                        {/* Status badge */}
                                        {status === "success" && (
                                            <div className="absolute top-2 right-2">
                                                <CheckCircle2 className="h-4 w-4 text-emerald-500" />
                                            </div>
                                        )}
                                        {status === "pending" && (
                                            <div className="absolute top-2 right-2">
                                                <Loader2 className="h-4 w-4 text-primary animate-spin" />
                                            </div>
                                        )}
                                        {isDeployed && !status && (
                                            <div className="absolute top-2 right-2">
                                                <CheckCircle2 className="h-3.5 w-3.5 text-emerald-500/60" />
                                            </div>
                                        )}

                                        <div className="text-3xl mb-3">{emoji.preview}</div>
                                        <p className="text-[10px] font-black uppercase tracking-tight">{emoji.label}</p>
                                        <p className="text-[9px] text-muted-foreground mt-1 font-mono">:{emoji.name}:</p>
                                        <p className="text-[8px] text-muted-foreground/60 mt-1 italic">{emoji.description}</p>
                                        {isDeployed && (
                                            <p className="text-[8px] text-emerald-500/80 font-bold mt-2 uppercase tracking-widest">Already Live</p>
                                        )}
                                    </button>
                                )
                            })}
                        </div>
                    </div>
                </div>

                {/* Footer */}
                <div className="p-6 border-t border-border bg-muted/5">
                    <div className="flex items-center justify-between gap-4">
                        <p className="text-[9px] text-muted-foreground italic">
                            {selectedEmojis.length} emoji{selectedEmojis.length !== 1 ? 's' : ''} selected
                            {selectedChannel && channel ? ` → ${channel.name}` : ''}
                        </p>
                        <Button
                            onClick={handleDeploy}
                            disabled={deploying || selectedEmojis.length === 0 || !selectedChannel}
                            className="h-12 px-8 rounded-2xl bg-indigo-600 hover:bg-indigo-500 text-white font-black uppercase tracking-widest text-[10px] shadow-lg shadow-indigo-500/20"
                        >
                            {deploying ? (
                                <><Loader2 className="h-4 w-4 animate-spin mr-2" /> Forging...</>
                            ) : (
                                <><Zap className="h-4 w-4 mr-2" /> Deploy to Discord</>
                            )}
                        </Button>
                    </div>
                </div>
            </DialogContent>
        </Dialog>
    )
}
