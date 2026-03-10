import { useState, useEffect, useCallback } from "react"
import { createBrowserClient } from "@/lib/supabase/browser"
import { ChatService } from "./chat-service"
import { Message } from "./types"

export function useChat(projectSlug: string) {
    const [messages, setMessages] = useState<Message[]>([])
    const [isLoading, setIsLoading] = useState(false)
    const [isInitialLoading, setIsInitialLoading] = useState(true)
    const [projectId, setProjectId] = useState<string | null>(null)
    const [sessionId, setSessionId] = useState<string | null>(null)
    const [selectedModel] = useState("gemini-2.5-flash-lite")
    const [supabase] = useState(() => createBrowserClient())
    const [chatService] = useState(() => new ChatService(supabase))

    const loadChat = useCallback(async () => {
        try {
            setIsInitialLoading(true)
            const pId = await chatService.getProjectId(projectSlug)
            if (!pId) return
            setProjectId(pId)

            const { data: { user } } = await supabase.auth.getUser()
            if (!user) return

            const sId = await chatService.getLatestSession(pId, user.id)
            if (sId) {
                setSessionId(sId)
                const history = await chatService.getMessageHistory(sId)
                if (history.length > 0) {
                    setMessages(history)
                } else {
                    addWelcomeMessage()
                }
            } else {
                addWelcomeMessage()
            }
        } catch (err) {
            console.error("[useChat] Load error:", err)
        } finally {
            setIsInitialLoading(false)
        }
    }, [projectSlug, chatService, supabase.auth])

    const addWelcomeMessage = () => {
        setMessages([
            {
                id: "welcome",
                role: "assistant",
                content: "Hello! I'm your Inner G Complete Growth Assistant. How can I help you scale your operations today?",
                timestamp: new Date(),
            }
        ])
    }

    useEffect(() => {
        loadChat()
    }, [loadChat])

    const sendMessage = async (content: string) => {
        if (!content.trim() || isLoading || !projectId) return

        const userMessage: Message = {
            id: Date.now().toString(),
            role: "user",
            content,
            timestamp: new Date(),
        }

        setMessages((prev) => [...prev, userMessage])
        setIsLoading(true)

        try {
            const { data: { session }, error: authError } = await supabase.auth.getSession()
            if (authError || !session) {
                throw new Error("Authentication required")
            }

            const functionData = await chatService.sendMessage({
                projectId,
                message: content,
                sessionId,
                model: selectedModel,
                accessToken: session.access_token
            })

            if (functionData) {
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
            console.error("[useChat] Send error:", err)
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

    return {
        messages,
        isLoading,
        isInitialLoading,
        sendMessage,
        selectedModel
    }
}
