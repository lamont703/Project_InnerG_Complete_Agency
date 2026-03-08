"use client"

import { useState, useRef, useEffect } from "react"
import { Send, Bot, User, Sparkles, Loader2, Maximize2, Minimize2, Cpu, AlertTriangle } from "lucide-react"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { createBrowserClient, supabaseAnonKey } from "@/lib/supabase/browser"
import {
    Select,
    SelectContent,
    SelectItem,
    SelectTrigger,
    SelectValue,
} from "@/components/ui/select"

interface Message {
    id: string
    role: "user" | "assistant"
    content: string
    timestamp: Date
    signalCreated?: {
        id: string
        title: string
        severity: string
        signal_type: string
    } | null
}

interface ChatInterfaceProps {
    projectSlug: string
}

export function ChatInterface({ projectSlug }: ChatInterfaceProps) {
    const [messages, setMessages] = useState<Message[]>([])
    const [input, setInput] = useState("")
    const [isLoading, setIsLoading] = useState(false)
    const [isInitialLoading, setIsInitialLoading] = useState(true)
    const [isExpanded, setIsExpanded] = useState(false)
    const [selectedModel] = useState("gemini-2.5-flash-lite")
    const [projectId, setProjectId] = useState<string | null>(null)
    const [sessionId, setSessionId] = useState<string | null>(null)
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

    const [supabase] = useState(() => createBrowserClient())

    // Load project and existing chat history
    useEffect(() => {
        const loadChat = async () => {
            try {
                // 1. Get Project ID
                const { data: project } = await supabase
                    .from("projects")
                    .select("id")
                    .eq("slug", projectSlug)
                    .single() as any

                if (!project) return
                setProjectId(project.id)

                // 2. Try to get the latest session for this user + project
                const { data: { user } } = await supabase.auth.getUser()
                if (!user) return

                const { data: sessionData } = await supabase
                    .from("chat_sessions")
                    .select("id")
                    .eq("project_id", project.id)
                    .eq("user_id", user.id)
                    .order("updated_at", { ascending: false })
                    .limit(1)
                    .maybeSingle() as any

                if (sessionData) {
                    setSessionId(sessionData.id)

                    // 3. Load messages for this session
                    const { data: history } = await supabase
                        .from("chat_messages")
                        .select("*")
                        .eq("session_id", sessionData.id)
                        .order("created_at", { ascending: true }) as any

                    if (history && history.length > 0) {
                        const mappedMessages: Message[] = (history as any[]).map(m => ({
                            id: m.id,
                            role: m.role as "user" | "assistant",
                            content: m.content,
                            timestamp: new Date(m.created_at)
                        }))
                        setMessages(mappedMessages)
                    } else {
                        // Default welcome message if session is empty
                        setMessages([
                            {
                                id: "welcome",
                                role: "assistant",
                                content: "Hello! I'm your Inner G Complete Growth Assistant. How can I help you scale your operations today?",
                                timestamp: new Date(),
                            }
                        ])
                    }
                } else {
                    // New session placeholder
                    setMessages([
                        {
                            id: "welcome",
                            role: "assistant",
                            content: "Hello! I'm your Inner G Complete Growth Assistant. How can I help you scale your operations today?",
                            timestamp: new Date(),
                        }
                    ])
                }
            } catch (err) {
                console.error("[Chat] Failed to load history:", err)
            } finally {
                setIsInitialLoading(false)
            }
        }

        loadChat()
    }, [projectSlug, supabase])

    const handleSend = async (e: React.FormEvent) => {
        e.preventDefault()
        if (!input.trim() || isLoading || !projectId) return

        const userMsgContent = input
        const tempId = Date.now().toString()
        const userMessage: Message = {
            id: tempId,
            role: "user",
            content: userMsgContent,
            timestamp: new Date(),
        }

        setMessages((prev) => [...prev, userMessage])
        setInput("")
        setIsLoading(true)

        try {
            // Force session refresh/validation
            const { data: { session }, error: authError } = await supabase.auth.getSession()

            if (authError || !session) {
                console.error("[Chat] Authentication required:", authError)
                setMessages((prev) => [...prev, {
                    id: (Date.now() + 2).toString(),
                    role: "assistant",
                    content: "Please log in again to use the Growth Assistant.",
                    timestamp: new Date()
                }])
                return
            }

            const { data, error } = await supabase.functions.invoke("send-chat-message", {
                body: {
                    project_id: projectId,
                    message: userMsgContent,
                    session_id: sessionId,
                    model: selectedModel
                },
                headers: {
                    Authorization: `Bearer ${session.access_token}`,
                    apikey: supabaseAnonKey
                }
            })

            if (error) throw error

            if (data?.data) {
                const functionData = data.data
                if (!sessionId) setSessionId(functionData.session_id)

                const assistantMessage: Message = {
                    id: (Date.now() + 1).toString(),
                    role: "assistant",
                    content: functionData.reply,
                    timestamp: new Date(),
                    signalCreated: functionData.signal_created || null,
                }
                setMessages((prev) => [...prev, assistantMessage])
            }
        } catch (err) {
            console.error("[Chat] Send error:", err)
            setMessages((prev) => [...prev, {
                id: (Date.now() + 2).toString(),
                role: "assistant",
                content: "I'm sorry, I encountered an error connecting to the AI engine. Please check your connection and try again.",
                timestamp: new Date()
            }])
        } finally {
            setIsLoading(false)
        }
    }

    return (
        <div className={`flex flex-col glass-panel-strong rounded-2xl border border-white/[0.03] transition-all duration-500 overflow-hidden ${isExpanded ? "fixed inset-0 md:inset-8 z-[102] shadow-2xl rounded-none md:rounded-2xl" : "h-[950px]"}`}>
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

                <div className="flex items-center gap-3">
                    <div className="flex items-center gap-1.5 px-2.5 py-1 rounded-full bg-primary/10 border border-primary/20">
                        <Cpu className="h-3 w-3 text-primary" />
                        <span className="text-[9px] font-bold text-primary uppercase tracking-widest">Gemini 2.5 Lite</span>
                    </div>

                    <button
                        onClick={() => setIsExpanded(!isExpanded)}
                        className="p-2 hover:bg-white/5 rounded-lg transition-colors text-muted-foreground"
                    >
                        {isExpanded ? <Minimize2 className="h-4 w-4" /> : <Maximize2 className="h-4 w-4" />}
                    </button>
                </div>
            </div>

            {/* Messages */}
            <div
                ref={scrollContainerRef}
                className="flex-1 overflow-y-auto p-4 space-y-6 custom-scrollbar"
            >
                {isInitialLoading ? (
                    <div className="h-full flex items-center justify-center">
                        <Loader2 className="h-6 w-6 animate-spin text-primary opacity-50" />
                    </div>
                ) : (
                    messages.map((m) => (
                        <div key={m.id} className={`flex gap-3 ${m.role === "assistant" ? "" : "flex-row-reverse"}`}>
                            <div className={`h-8 w-8 rounded-full flex items-center justify-center shrink-0 border ${m.role === "assistant" ? "bg-primary/20 border-primary/30" : "bg-secondary/50 border-white/10"}`}>
                                {m.role === "assistant" ? <Bot className="h-4 w-4 text-primary" /> : <User className="h-4 w-4 text-foreground" />}
                            </div>
                            <div className={`max-w-[80%] rounded-2xl p-4 text-sm leading-relaxed ${m.role === "assistant" ? "bg-white/[0.03] border border-white/5 rounded-tl-none" : "bg-primary text-primary-foreground rounded-tr-none shadow-lg shadow-primary/10"}`}>
                                <span dangerouslySetInnerHTML={{ __html: m.content.replace(/\*\*(.*?)\*\*/g, '<strong>$1</strong>') }} />
                                {m.signalCreated && (
                                    <div className={`mt-3 p-3 rounded-xl border ${m.signalCreated.severity === 'critical' ? 'bg-red-500/10 border-red-500/20' :
                                            m.signalCreated.severity === 'warning' ? 'bg-amber-500/10 border-amber-500/20' :
                                                'bg-blue-500/10 border-blue-500/20'
                                        }`}>
                                        <div className="flex items-center gap-2 mb-1">
                                            <AlertTriangle className={`h-3.5 w-3.5 ${m.signalCreated.severity === 'critical' ? 'text-red-400' :
                                                    m.signalCreated.severity === 'warning' ? 'text-amber-400' : 'text-blue-400'
                                                }`} />
                                            <span className="text-xs font-bold uppercase tracking-wider">
                                                {m.signalCreated.severity} Signal
                                            </span>
                                        </div>
                                        <p className="text-xs font-medium">{m.signalCreated.title}</p>
                                        <p className="text-[10px] text-muted-foreground mt-0.5">{m.signalCreated.signal_type} • Added to dashboard</p>
                                    </div>
                                )}
                                <div className={`text-[10px] mt-2 opacity-50 ${m.role === "assistant" ? "text-muted-foreground" : "text-primary-foreground/80"}`}>
                                    {m.timestamp.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                                </div>
                            </div>
                        </div>
                    ))
                )}
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
                        disabled={isLoading || isInitialLoading}
                        placeholder="Ask about your infrastructure or growth strategy..."
                        className="bg-background/50 border-white/10 pr-12 h-12 rounded-xl focus:border-primary transition-all text-sm"
                    />
                    <Button
                        type="submit"
                        size="icon"
                        disabled={!input.trim() || isLoading || isInitialLoading}
                        className="absolute right-1.5 top-1.5 h-9 w-9 bg-primary text-primary-foreground hover:bg-primary/90 rounded-lg shadow-lg shadow-primary/20"
                    >
                        <Send className="h-4 w-4" />
                    </Button>
                </form>
                <p className="text-[10px] text-center text-muted-foreground mt-3 opacity-50">
                    Inner G Complete Assistant can help with database queries, automation maps, and scaling audits.
                </p>
            </div>
        </div>
    )
}
