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
        <div className="flex flex-col h-full overflow-hidden bg-transparent">
            {/* Header - Subtle Column Title */}
            <div className="pb-6 flex items-center justify-between">
                <div className="flex items-center gap-3">
                    <h3 className="text-lg font-black uppercase tracking-[0.2em] text-white flex items-center gap-2">
                        Intelligence Hub
                        <Sparkles className="h-4 w-4 text-primary animate-pulse" />
                    </h3>
                </div>

                <div className="flex items-center gap-3">
                    <div className="flex items-center gap-1.5 px-3 py-1 rounded-full bg-primary/10 border border-primary/20">
                        <Cpu className="h-3 w-3 text-primary" />
                        <span className="text-[10px] font-black text-primary uppercase tracking-widest">
                            {selectedModel === "gemini-2.0-flash" ? "AURA-FLASH-2.0" : "AURA-PRO-2.5"}
                        </span>
                    </div>
                </div>
            </div>

            {/* Chat Container - Glassy but clean */}
            <div className="flex-1 flex flex-col glass-panel-strong rounded-3xl border border-white/5 overflow-hidden shadow-2xl">
                {/* Messages */}
                <div ref={scrollRef} className="flex-1 overflow-y-auto p-6 md:p-8 space-y-8 custom-scrollbar">
                    {messages.length === 0 && (
                        <div className="h-full flex flex-col items-center justify-center opacity-20 text-center px-12">
                            <Building2 className="h-16 w-16 mb-4 text-primary" />
                            <p className="text-lg font-bold uppercase tracking-[0.3em]">Awaiting Command</p>
                            <p className="text-xs max-w-xs mt-4 leading-relaxed font-medium">Ask Aura about cross-project performance, LinkedIn strategy, or GitHub deployments.</p>
                        </div>
                    )}
                    {messages.map((m) => (
                        <div key={m.id} className={`flex gap-6 ${m.role === "assistant" ? "" : "flex-row-reverse"}`}>
                            <div className={`h-10 w-10 rounded-xl flex items-center justify-center shrink-0 border ${m.role === "assistant" ? "bg-primary/20 border-primary/30" : "bg-white/5 border-white/10"}`}>
                                {m.role === "assistant" ? <Building2 className="h-5 w-5 text-primary" /> : <User className="h-5 w-5 text-foreground" />}
                            </div>
                            <div className={`max-w-[85%] rounded-3xl p-6 text-[15px] leading-relaxed relative ${m.role === "assistant" ? "bg-white/[0.02] border border-white/5 rounded-tl-none" : "bg-primary text-primary-foreground rounded-tr-none shadow-xl shadow-primary/10"}`}>
                                <span dangerouslySetInnerHTML={{ __html: m.content.replace(/\*\*(.*?)\*\*/g, '<strong>$1</strong>') }} />
                                
                                {m.signalCreated && (
                                    <div className={`mt-5 p-4 rounded-2xl border flex items-start gap-4 ${m.signalCreated.severity === 'critical' ? 'bg-red-500/10 border-red-500/20' :
                                        m.signalCreated.severity === 'warning' ? 'bg-amber-500/10 border-amber-500/20' :
                                            'bg-emerald-500/10 border-emerald-500/20'
                                        }`}>
                                        <div className="mt-1">
                                            {m.signalCreated.signal_type === 'bug_report' ? (
                                                <Bug className="h-5 w-5 text-red-400" />
                                            ) : (
                                                <Zap className="h-5 w-5 text-emerald-400" />
                                            )}
                                        </div>
                                        <div>
                                            <p className="text-xs font-black uppercase tracking-widest opacity-60 mb-1">{m.signalCreated.severity} Signal Streamed</p>
                                            <p className="text-sm font-bold text-white">{m.signalCreated.title}</p>
                                        </div>
                                    </div>
                                )}

                                <div className={`text-[9px] font-black uppercase tracking-widest mt-4 opacity-30 ${m.role === "assistant" ? "text-muted-foreground" : "text-primary-foreground"}`}>
                                    {m.timestamp.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })} • {m.role.toUpperCase()}
                                </div>
                            </div>
                        </div>
                    ))}
                    {isLoading && (
                        <div className="flex gap-6">
                            <div className="h-10 w-10 rounded-xl bg-primary/20 border border-primary/30 flex items-center justify-center shrink-0">
                                <Building2 className="h-5 w-5 text-primary" />
                            </div>
                            <div className="bg-white/[0.02] border border-white/5 rounded-3xl rounded-tl-none p-6">
                                <div className="flex items-center gap-3">
                                    <Loader2 className="h-4 w-4 text-primary animate-spin" />
                                    <span className="text-xs font-bold uppercase tracking-widest text-primary/60">Aura is thinking...</span>
                                </div>
                            </div>
                        </div>
                    )}
                </div>

                {/* Input - Clean Bottom Bar */}
                <div className="p-6 bg-black/40 border-t border-white/5">
                    <form onSubmit={handleSubmit} className="relative group">
                        <Input
                            value={input}
                            onChange={(e) => setInput(e.target.value)}
                            disabled={isLoading}
                            placeholder="Type a command or ask a question..."
                            className="bg-[#020617]/50 border-white/10 pr-16 h-14 rounded-2xl focus:border-primary focus:ring-1 focus:ring-primary/20 transition-all text-sm font-medium"
                        />
                        <div className="absolute right-2 top-2">
                            <Button
                                type="submit"
                                size="icon"
                                disabled={!input.trim() || isLoading}
                                className="h-10 w-10 bg-primary text-primary-foreground hover:bg-primary/90 rounded-xl shadow-lg transition-all group-hover:scale-105 active:scale-95"
                            >
                                <Send className="h-4 w-4" />
                            </Button>
                        </div>
                    </form>
                    <div className="flex items-center justify-center gap-4 mt-4 opacity-30 font-black text-[9px] uppercase tracking-[0.2em]">
                        <span>Secure Architecture</span>
                        <div className="h-1 w-1 rounded-full bg-white" />
                        <span>Quantum Context Mode</span>
                        <div className="h-1 w-1 rounded-full bg-white" />
                        <span>Agency Intelligence v2.5</span>
                    </div>
                </div>
            </div>
        </div>
    )
}
