"use client"

import { useState, useEffect, useRef, useCallback } from "react"
import { createBrowserClient, supabaseAnonKey } from "@/lib/supabase/browser"

import { AgencyChatMessage } from "./types"

export function useAgencyChat() {
    const [messages, setMessages] = useState<AgencyChatMessage[]>([])
    const [input, setInput] = useState("")
    const [isLoading, setIsLoading] = useState(false)
    const [isHistoryLoading, setIsHistoryLoading] = useState(true)
    const [sessionId, setSessionId] = useState<string | null>(null)
    const [selectedModel] = useState("gemini-2.5-pro")

    const AGENCY_PROJECT_SENTINEL = "00000000-0000-0000-0000-000000000001"

    // Load history on mount
    useEffect(() => {
        const loadHistory = async () => {
            try {
                const supabase = createBrowserClient()
                const { data: { user } } = await supabase.auth.getUser()
                
                if (!user) {
                    setIsHistoryLoading(false)
                    return
                }

                // 1. Find the most recent agency session
                const { data: sessionData, error: sessionErr } = await supabase
                    .from("chat_sessions")
                    .select("id")
                    .eq("project_id", AGENCY_PROJECT_SENTINEL)
                    .eq("user_id", user.id)
                    .order("created_at", { ascending: false })
                    .limit(1)
                    .maybeSingle() as { data: any, error: any }

                if (sessionErr || !sessionData) {
                    // No history, stick with welcome message
                    setMessages([
                        {
                            id: "welcome",
                            role: "assistant",
                            content: "Hello, Lamont! I'm your Inner G Complete Agency Agent. I can analyze data across all your client projects, reference our methodology and SOPs, and help you make strategic decisions. What would you like to explore?",
                            timestamp: new Date(),
                        }
                    ])
                    setIsHistoryLoading(false)
                    return
                }

                setSessionId(sessionData.id)

                // 2. Fetch messages for this session
                const { data: messageData, error: messageErr } = await supabase
                    .from("chat_messages")
                    .select("id, role, content, created_at")
                    .eq("session_id", sessionData.id)
                    .order("created_at", { ascending: true }) as { data: any[] | null, error: any }

                if (messageErr) throw messageErr

                if (messageData && messageData.length > 0) {
                    const mappedMessages: AgencyChatMessage[] = messageData.map(m => ({
                        id: m.id,
                        role: m.role as "user" | "assistant",
                        content: m.content,
                        timestamp: new Date(m.created_at)
                    }))
                    setMessages(mappedMessages)
                } else {
                    // Session exists but no messages? (shouldn't happen with current logic)
                    setMessages([
                        {
                            id: "welcome",
                            role: "assistant",
                            content: "Hello, Lamont! I'm your Inner G Complete Agency Agent. I can analyze data across all your client projects, reference our methodology and SOPs, and help you make strategic decisions. What would you like to explore?",
                            timestamp: new Date(),
                        }
                    ])
                }

            } catch (err) {
                console.error("[AgencyChat] Failed to load history:", err)
            } finally {
                setIsHistoryLoading(false)
            }
        }

        loadHistory()
    }, [])

    const sendMessage = useCallback(async (content: string) => {
        if (!content.trim() || isLoading) return

        const userMessage: AgencyChatMessage = {
            id: Date.now().toString(),
            role: "user",
            content,
            timestamp: new Date(),
        }

        setMessages(prev => [...prev, userMessage])
        setInput("")
        setIsLoading(true)

        try {
            const supabase = createBrowserClient()
            const { data: { session } } = await supabase.auth.getSession()

            if (!session) {
                setMessages(prev => [...prev, {
                    id: (Date.now() + 1).toString(),
                    role: "assistant",
                    content: "Please log in again to use the Agency Agent.",
                    timestamp: new Date()
                }])
                return
            }

            const { data, error } = await supabase.functions.invoke("send-agency-chat-message", {
                body: {
                    message: content,
                    model: selectedModel,
                    session_id: sessionId,
                },
                headers: {
                    Authorization: `Bearer ${session.access_token}`,
                    apikey: supabaseAnonKey
                }
            })

            if (error) throw error

            if (data?.data) {
                if (data.data.session_id) {
                    setSessionId(data.data.session_id)
                }

                setMessages(prev => [...prev, {
                    id: (Date.now() + 1).toString(),
                    role: "assistant",
                    content: data.data.reply,
                    timestamp: new Date(),
                    signalCreated: data.data.signal_created || null,
                    budgetExceeded: data.data.budget_exceeded || false,
                }])
            }
        } catch (err: any) {
            console.error("[AgencyChat] Error:", err)
            let helpMessage = "The Agency Agent encountered an issue. Please try again later."

            setMessages(prev => [...prev, {
                id: (Date.now() + 1).toString(),
                role: "assistant",
                content: helpMessage,
                timestamp: new Date()
            }])
        } finally {
            setIsLoading(false)
        }
    }, [isLoading, sessionId, selectedModel])

    useEffect(() => {
        const handleDiscussSignal = (event: any) => {
            const { signalTitle, signalBody } = event.detail
            sendMessage(`I'd like to discuss the agency signal: "${signalTitle}". Context: ${signalBody}`)
        }

        window.addEventListener('innerg-agency-discuss-signal', handleDiscussSignal)
        return () => window.removeEventListener('innerg-agency-discuss-signal', handleDiscussSignal)
    }, [sendMessage])

    return {
        messages,
        input,
        setInput,
        isLoading,
        isHistoryLoading,
        sendMessage,
        selectedModel
    }
}
