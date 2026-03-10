import { useRef, useEffect } from "react"
import { Bot, User, AlertTriangle, Loader2 } from "lucide-react"
import { Message } from "../types"

interface MessageListProps {
    messages: Message[]
    isLoading: boolean
    isInitialLoading: boolean
}

export function MessageList({ messages, isLoading, isInitialLoading }: MessageListProps) {
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
    }, [messages, isLoading])

    if (isInitialLoading) {
        return (
            <div className="flex-1 flex items-center justify-center">
                <Loader2 className="h-6 w-6 animate-spin text-primary opacity-50" />
            </div>
        )
    }

    return (
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
    )
}
