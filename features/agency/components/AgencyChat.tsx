"use client"

import { useState, useRef, useEffect } from "react"
import {
    Building2,
    Sparkles,
    Cpu,
    Maximize2,
    Minimize2,
    User,
    AlertTriangle,
    Loader2,
    Send,
    Bug,
    Zap,
    Database,
    Instagram
} from "lucide-react"
import { Input } from "@/components/ui/input"
import { Button } from "@/components/ui/button"
import { useAgencyChat } from "../use-agency-chat"

export function AgencyChatInterface() {
    const {
        messages,
        input,
        setInput,
        isLoading,
        sendMessage,
        selectedModel
    } = useAgencyChat()

    const [isExpanded, setIsExpanded] = useState(false)
    const scrollRef = useRef<HTMLDivElement>(null)

    useEffect(() => {
        if (scrollRef.current) {
            scrollRef.current.scrollTo({ top: scrollRef.current.scrollHeight, behavior: "smooth" })
        }
    }, [messages])

    const handleSubmit = (e: React.FormEvent) => {
        e.preventDefault()
        sendMessage(input)
    }

    return (
        <div className={`flex flex-col glass-panel-strong transition-all duration-500 overflow-hidden min-h-0 ${isExpanded ? "fixed inset-0 md:inset-8 z-[102] shadow-2xl rounded-none md:rounded-2xl" : "h-full rounded-none border-x-0 border-b-0 border-t-0"}`}>
            {/* Header */}
            <div className="p-4 border-b border-border flex items-center justify-between bg-muted/10">
                <div className="flex items-center gap-3">
                    <div className="h-8 w-8 rounded-lg bg-gradient-to-br from-primary/30 to-accent/30 flex items-center justify-center border border-primary/30">
                        <Building2 className="h-5 w-5 text-primary" />
                    </div>
                    <div>
                        <h3 className="text-sm font-bold text-foreground flex items-center gap-2">
                            Agency Agent
                            <Sparkles className="h-3 w-3 text-primary animate-pulse" />
                        </h3>
                        <p className="text-[10px] text-emerald-500 font-medium uppercase tracking-wider">Cross-Project Intelligence</p>
                    </div>
                </div>

                <div className="flex items-center gap-3">
                    <div className="flex items-center gap-1.5 px-2.5 py-1 rounded-full bg-primary/10 border border-primary/20">
                        <Cpu className="h-3 w-3 text-primary" />
                        <span className="text-[9px] font-bold text-primary uppercase tracking-widest">
                            {selectedModel === "gemini-2.5-pro" ? "Gemini 2.5 Pro" : selectedModel}
                        </span>
                    </div>
                    <button
                        onClick={() => setIsExpanded(!isExpanded)}
                        className="hidden md:block p-2 hover:bg-white/5 rounded-lg transition-colors text-muted-foreground"
                    >
                        {isExpanded ? <Minimize2 className="h-4 w-4" /> : <Maximize2 className="h-4 w-4" />}
                    </button>
                </div>
            </div>

            {/* Messages */}
            <div ref={scrollRef} className="flex-1 overflow-y-auto p-4 space-y-6 custom-scrollbar">
                {messages.map((m) => (
                    <div key={m.id} className={`flex gap-3 ${m.role === "assistant" ? "" : "flex-row-reverse"}`}>
                        <div className={`h-8 w-8 rounded-full flex items-center justify-center shrink-0 border ${m.role === "assistant" ? "bg-primary/20 border-primary/30" : "bg-secondary/50 border-white/10"}`}>
                            {m.role === "assistant" ? <Building2 className="h-4 w-4 text-primary" /> : <User className="h-4 w-4 text-foreground" />}
                        </div>
                        <div className={`max-w-[80%] rounded-2xl p-4 text-sm leading-relaxed ${m.role === "assistant" ? "bg-muted/20 border border-border rounded-tl-none text-foreground" : "bg-primary text-primary-foreground rounded-tr-none shadow-lg shadow-primary/10"}`}>
                            <span dangerouslySetInnerHTML={{ __html: m.content.replace(/\*\*(.*?)\*\*/g, '<strong>$1</strong>') }} />
                            {m.signalCreated && (
                                <div className={`mt-3 p-3 rounded-xl border ${m.signalCreated.severity === 'critical' ? 'bg-red-500/10 border-red-500/20' :
                                    m.signalCreated.severity === 'warning' ? 'bg-amber-500/10 border-amber-500/20' :
                                        'bg-blue-500/10 border-blue-500/20'
                                    }`}>
                                    <div className="flex items-center gap-2 mb-1">
                                        {m.signalCreated.signal_type === 'bug_report' ? (
                                            <Bug className={`h-3.5 w-3.5 ${m.signalCreated.severity === 'critical' ? 'text-red-400' :
                                                m.signalCreated.severity === 'warning' ? 'text-amber-400' : 'text-blue-400'
                                                }`} />
                                        ) : (
                                            <AlertTriangle className={`h-3.5 w-3.5 ${m.signalCreated.severity === 'critical' ? 'text-red-400' :
                                                m.signalCreated.severity === 'warning' ? 'text-amber-400' : 'text-blue-400'
                                                }`} />
                                        )}
                                        <span className="text-xs font-bold uppercase tracking-wider">
                                            {m.signalCreated.severity} Signal Created
                                        </span>
                                    </div>
                                    <p className="text-xs font-medium">{m.signalCreated.title}</p>
                                    <p className="text-[10px] text-muted-foreground mt-0.5">{m.signalCreated.signal_type} • Added to project dashboard</p>
                                </div>
                            )}
                            <div className={`text-[10px] mt-2 opacity-50 ${m.role === "assistant" ? "text-muted-foreground" : "text-primary-foreground/80"}`}>
                                {m.timestamp.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                            </div>
                        </div>
                    </div>
                ))}
                {isLoading && (
                    <div className="flex gap-3">
                        <div className="h-8 w-8 rounded-full bg-primary/20 border border-primary/30 flex items-center justify-center shrink-0">
                            <Building2 className="h-4 w-4 text-primary" />
                        </div>
                        <div className="bg-muted/20 border border-border rounded-2xl rounded-tl-none p-4">
                            <Loader2 className="h-4 w-4 text-primary animate-spin" />
                        </div>
                    </div>
                )}
            </div>

            {/* Input */}
            <div className="p-4 border-t border-border bg-muted/5">
                <form onSubmit={handleSubmit} className="relative">
                    <Input
                        value={input}
                        onChange={(e) => setInput(e.target.value)}
                        disabled={isLoading}
                        placeholder="Ask about portfolio performance, methodology, or strategy..."
                        className="bg-background border-border pr-12 h-12 rounded-xl focus:border-primary transition-all text-sm"
                    />
                    <Button
                        type="submit"
                        size="icon"
                        disabled={!input.trim() || isLoading}
                        className="absolute right-1.5 top-1.5 h-9 w-9 bg-primary text-primary-foreground hover:bg-primary/90 rounded-lg shadow-lg shadow-primary/20"
                    >
                        <Send className="h-4 w-4" />
                    </Button>
                </form>
                <p className="hidden md:block text-[10px] text-center text-muted-foreground mt-3 opacity-50">
                    Agency Agent — Cross-project intelligence with Inner G Complete methodology.
                </p>
            </div>
        </div>
    )
}
