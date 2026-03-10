"use client"

import { useState } from "react"
import { useChat } from "./use-chat"
import { ChatHeader } from "./components/ChatHeader"
import { MessageList } from "./components/MessageList"
import { ChatInput } from "./components/ChatInput"

interface ChatInterfaceProps {
    projectSlug: string
}

export function ChatInterface({ projectSlug }: ChatInterfaceProps) {
    const [isExpanded, setIsExpanded] = useState(false)
    const {
        messages,
        isLoading,
        isInitialLoading,
        sendMessage,
        selectedModel
    } = useChat(projectSlug)

    return (
        <div className={`flex flex-col glass-panel-strong rounded-3xl border border-white/[0.05] transition-all duration-700 overflow-hidden relative ${isExpanded ? "fixed inset-0 md:inset-8 z-[102] shadow-2xl rounded-none md:rounded-3xl" : "h-[950px] shadow-xl shadow-black/40"
            }`}>
            {/* Ambient glow inside chat */}
            <div className="absolute -top-24 -right-24 w-64 h-64 bg-primary/10 rounded-full blur-[80px] pointer-events-none" />

            <ChatHeader
                isExpanded={isExpanded}
                onToggleExpand={() => setIsExpanded(!isExpanded)}
                modelName={selectedModel === "gemini-2.5-flash-lite" ? "Gemini 2.5 Lite" : selectedModel}
            />

            <MessageList
                messages={messages}
                isLoading={isLoading}
                isInitialLoading={isInitialLoading}
            />

            <ChatInput
                onSend={sendMessage}
                isLoading={isLoading}
                disabled={isInitialLoading}
            />
        </div>
    )
}
