/**
 * _shared/lib/db/chat.ts
 * Inner G Complete Agency — Chat & Memory Repository
 */

import { SupabaseClient } from "https://esm.sh/@supabase/supabase-js@2"

export interface ChatSessionRow {
    id: string
    project_id: string
    user_id: string
    title?: string | null
    created_at: string
    updated_at: string
}

export interface ChatMessageRow {
    id: string
    session_id: string
    role: "user" | "assistant" | "system"
    content: string
    created_at: string
}

export interface SessionSummaryRow {
    id: string
    session_id: string
    project_id: string
    user_id: string
    summary: string
    message_count: number
    generated_at: string
}

export class ChatRepo {
    constructor(private client: SupabaseClient) { }

    /**
     * Gets a session by ID.
     */
    async getSession(id: string): Promise<ChatSessionRow | null> {
        const { data, error } = await this.client
            .from("chat_sessions")
            .select("*")
            .eq("id", id)
            .maybeSingle()

        if (error) throw error
        return data as ChatSessionRow | null
    }

    /**
     * Gets messages for a session.
     */
    async getMessages(sessionId: string): Promise<ChatMessageRow[]> {
        const { data, error } = await this.client
            .from("chat_messages")
            .select("*")
            .eq("session_id", sessionId)
            .order("created_at", { ascending: true })

        if (error) throw error
        return (data || []) as ChatMessageRow[]
    }

    /**
     * Finds sessions eligible for summarization.
     */
    async getEligibleForSummary(limit = 50, minMessages = 4): Promise<any[]> {
        const oneHourAgo = new Date(Date.now() - 60 * 60 * 1000).toISOString()

        // Complex query to find sessions without summaries and enough messages
        const { data, error } = await this.client
            .from("chat_sessions")
            .select(`
                id, project_id, user_id, updated_at,
                chat_messages(count)
            `)
            .lt("updated_at", oneHourAgo)
            .order("updated_at", { ascending: true })
            .limit(limit)

        if (error) throw error
        return (data || [])
    }

    /**
     * Checks if a session already has a summary.
     */
    async hasSummary(sessionId: string): Promise<boolean> {
        const { count, error } = await this.client
            .from("session_summaries")
            .select("*", { count: "exact", head: true })
            .eq("session_id", sessionId)

        if (error) throw error
        return (count || 0) > 0
    }

    /**
     * Inserts a session summary.
     */
    async createSummary(payload: Omit<SessionSummaryRow, "id" | "generated_at">): Promise<void> {
        const { error } = await this.client
            .from("session_summaries")
            .insert(payload)

        if (error) throw error
    }
}
