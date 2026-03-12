import { useState, useEffect, useCallback, useRef } from "react"
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
    const loadedSlugRef = useRef<string | null>(null)
    const [isNotFound, setIsNotFound] = useState(false)

    const loadChat = useCallback(async () => {
        if (loadedSlugRef.current === projectSlug) return

        try {
            setIsInitialLoading(true)

            // 1. Wait for Auth hydration - RLS depends on this
            const { data: { user } } = await supabase.auth.getUser()
            if (!user) {
                addWelcomeMessage()
                return
            }

            // 2. Resolve Project ID
            const pId = await chatService.getProjectId(projectSlug)
            if (!pId) {
                console.warn(`[useChat] Project with slug "${projectSlug}" not found or unauthorized.`)
                setIsNotFound(true)
                setMessages([
                    {
                        id: "not-found",
                        role: "assistant",
                        content: `⚠️ **Secure Bridge Error:** The project architecture for "${projectSlug}" could not be resolved. Please verify the URL or contact Inner G support to sync this architecture.`,
                        timestamp: new Date()
                    }
                ])
                return
            }

            setIsNotFound(false)
            setProjectId(pId)
            loadedSlugRef.current = projectSlug

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
    }, [projectSlug, chatService, supabase])

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

    const sendMessage = useCallback(async (content: string) => {
        if (!content.trim() || isLoading) return

        const userMessage: Message = {
            id: Date.now().toString(),
            role: "user",
            content,
            timestamp: new Date(),
        }

        setMessages((prev) => [...prev, userMessage])

        // If we don't have a projectId yet, we can't send to backend
        if (!projectId) {
            const errorMessage = isNotFound
                ? "This connection is unauthorized or the project does not exist. Please use a valid portal URL."
                : "I'm still initializing the secure project bridge. Please wait a moment or refresh if this persists."

            setMessages((prev) => [...prev, {
                id: (Date.now() + 1).toString(),
                role: "assistant",
                content: errorMessage,
                timestamp: new Date()
            }])
            return
        }

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
    }, [projectId, sessionId, isLoading, selectedModel, chatService, supabase.auth])

    useEffect(() => {
        const handleDiscussSignal = (event: any) => {
            const { signalTitle, signalBody } = event.detail
            sendMessage(`I'd like to discuss the signal: "${signalTitle}". Context: ${signalBody}$.`)
        }

        window.addEventListener('innerg-discuss-signal', handleDiscussSignal)
        return () => window.removeEventListener('innerg-discuss-signal', handleDiscussSignal)
    }, [sendMessage])

    return {
        messages,
        isLoading,
        isInitialLoading,
        sendMessage,
        selectedModel
    }
}
