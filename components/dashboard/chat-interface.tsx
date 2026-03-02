"use client"

import { useState, useRef, useEffect } from "react"
import { Send, Bot, User, Sparkles, Loader2, Maximize2, Minimize2 } from "lucide-react"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"

interface Message {
    id: string
    role: "user" | "assistant"
    content: string
    timestamp: Date
}

export function ChatInterface() {
    const [messages, setMessages] = useState<Message[]>([
        {
            id: "1",
            role: "assistant",
            content: "Hello! I'm your Inner G Growth Assistant. How can I help you scale your operations today?",
            timestamp: new Date(),
        },
    ])
    const [input, setInput] = useState("")
    const [isLoading, setIsLoading] = useState(false)
    const [isExpanded, setIsExpanded] = useState(false)
    const scrollContainerRef = useRef<HTMLDivElement>(null)

    const scrollToBottom = () => {
        if (scrollContainerRef.current) {
            scrollContainerRef.current.scrollTo({
                top: scrollContainerRef.current.scrollHeight,
                behavior: "smooth"
            })
        }
    }

    useEffect(() => {
        scrollToBottom()
    }, [messages])

    const handleSend = async (e: React.FormEvent) => {
        e.preventDefault()
        if (!input.trim() || isLoading) return

        const userMessage: Message = {
            id: Date.now().toString(),
            role: "user",
            content: input,
            timestamp: new Date(),
        }

        setMessages((prev) => [...prev, userMessage])
        setInput("")
        setIsLoading(true)

        // Simulate AI response
        setTimeout(() => {
            const assistantMessage: Message = {
                id: (Date.now() + 1).toString(),
                role: "assistant",
                content: getMockResponse(input),
                timestamp: new Date(),
            }
            setMessages((prev) => [...prev, assistantMessage])
            setIsLoading(false)
        }, 1500)
    }

    const getMockResponse = (userInput: string) => {
        const input = userInput.toLowerCase()
        if (input.includes("database") || input.includes("scale")) {
            return "Your database architecture is currently optimized for 10x throughput. Our last audit showed 99.99% uptime during peak spikes. Would you like me to run a predictive load test for next month?"
        }
        if (input.includes("ghl") || input.includes("gohighlevel")) {
            return "The GoHighLevel sync is performing at optimal speed. We've synced 452 new contacts in the last 24 hours with zero duplication errors."
        }
        if (input.includes("automation")) {
            return "I've identified two new manual bottlenecks in your customer onboarding workflow. Automating these could reclaim an additional 15 hours per week for your team."
        }
        return "That's a strategic area for growth. I'm analyzing your current metrics to provide a data-driven recommendation. Give me a moment to pull the latest infrastructure logs."
    }

    return (
        <div className={`flex flex-col glass-panel-strong rounded-2xl border border-white/[0.03] transition-all duration-500 overflow-hidden ${isExpanded ? "fixed inset-0 md:inset-8 z-[102] shadow-2xl rounded-none md:rounded-2xl" : "h-[500px] md:h-full min-h-[400px]"}`}>
            {/* Header */}
            <div className="p-4 border-b border-white/5 flex items-center justify-between bg-white/[0.02]">
                <div className="flex items-center gap-3">
                    <div className="h-8 w-8 rounded-lg bg-primary/20 flex items-center justify-center border border-primary/30">
                        <Bot className="h-5 w-5 text-primary" />
                    </div>
                    <div>
                        <h3 className="text-sm font-bold text-foreground flex items-center gap-2">
                            Growth Assistant
                            <Sparkles className="h-3 w-3 text-primary animate-pulse" />
                        </h3>
                        <p className="text-[10px] text-emerald-500 font-medium uppercase tracking-wider">Systems Online</p>
                    </div>
                </div>
                <button
                    onClick={() => setIsExpanded(!isExpanded)}
                    className="p-2 hover:bg-white/5 rounded-lg transition-colors text-muted-foreground"
                >
                    {isExpanded ? <Minimize2 className="h-4 w-4" /> : <Maximize2 className="h-4 w-4" />}
                </button>
            </div>

            {/* Messages */}
            <div
                ref={scrollContainerRef}
                className="flex-1 overflow-y-auto p-4 space-y-6 custom-scrollbar"
            >
                {messages.map((m) => (
                    <div key={m.id} className={`flex gap-3 ${m.role === "assistant" ? "" : "flex-row-reverse"}`}>
                        <div className={`h-8 w-8 rounded-full flex items-center justify-center shrink-0 border ${m.role === "assistant" ? "bg-primary/20 border-primary/30" : "bg-secondary/50 border-white/10"}`}>
                            {m.role === "assistant" ? <Bot className="h-4 w-4 text-primary" /> : <User className="h-4 w-4 text-foreground" />}
                        </div>
                        <div className={`max-w-[80%] rounded-2xl p-4 text-sm leading-relaxed ${m.role === "assistant" ? "bg-white/[0.03] border border-white/5 rounded-tl-none" : "bg-primary text-primary-foreground rounded-tr-none shadow-lg shadow-primary/10"}`}>
                            {m.content}
                            <div className={`text-[10px] mt-2 opacity-50 ${m.role === "assistant" ? "text-muted-foreground" : "text-primary-foreground/80"}`}>
                                {m.timestamp.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                            </div>
                        </div>
                    </div>
                ))}
                {isLoading && (
                    <div className="flex gap-3">
                        <div className="h-8 w-8 rounded-full bg-primary/20 border border-primary/30 flex items-center justify-center shrink-0">
                            <Bot className="h-4 w-4 text-primary" />
                        </div>
                        <div className="bg-white/[0.03] border border-white/5 rounded-2xl rounded-tl-none p-4">
                            <Loader2 className="h-4 w-4 text-primary animate-spin" />
                        </div>
                    </div>
                )}
            </div>

            {/* Input */}
            <div className="p-4 border-t border-white/5 bg-white/[0.01]">
                <form onSubmit={handleSend} className="relative">
                    <Input
                        value={input}
                        onChange={(e) => setInput(e.target.value)}
                        placeholder="Ask about your infrastructure or growth strategy..."
                        className="bg-background/50 border-white/10 pr-12 h-12 rounded-xl focus:border-primary transition-all text-sm"
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
                <p className="text-[10px] text-center text-muted-foreground mt-3 opacity-50">
                    Inner G Assistant can help with database queries, automation maps, and scaling audits.
                </p>
            </div>
        </div>
    )
}
