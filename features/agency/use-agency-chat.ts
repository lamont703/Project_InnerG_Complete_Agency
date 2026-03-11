"use client"

import { useState, useEffect, useRef } from "react"
import { createBrowserClient, supabaseAnonKey } from "@/lib/supabase/browser"

import { AgencyChatMessage } from "./types"

export function useAgencyChat() {
    const [messages, setMessages] = useState<AgencyChatMessage[]>([
        {
            id: "welcome",
            role: "assistant",
            content: "Hello, Lamont! I'm your Inner G Complete Agency Agent. I can analyze data across all your client projects, reference our methodology and SOPs, and help you make strategic decisions. What would you like to explore?",
            timestamp: new Date(),
        }
    ])
    const [input, setInput] = useState("")
    const [isLoading, setIsLoading] = useState(false)
    const [sessionId, setSessionId] = useState<string | null>(null)
    const [selectedModel] = useState("gemini-2.5-pro")

    const sendMessage = async (content: string) => {
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
    }

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
        sendMessage,
        selectedModel
    }
}
