import { SupabaseClient } from "@supabase/supabase-js"
import { supabaseAnonKey } from "@/lib/supabase/browser"
import {
    Message,
    SendMessageParams,
    ChatFunctionReply,
    ChatMessageRecord
} from "./types"

export class ChatService {
    constructor(private supabase: SupabaseClient) { }

    async getProjectId(projectSlug: string): Promise<string | undefined> {
        const { data, error } = await this.supabase
            .from("projects")
            .select("id")
            .eq("slug", projectSlug)
            .maybeSingle()

        if (error) return undefined
        return data?.id
    }

    async getLatestSession(projectId: string, userId: string): Promise<string | undefined> {
        const { data, error } = await this.supabase
            .from("chat_sessions")
            .select("id")
            .eq("project_id", projectId)
            .eq("user_id", userId)
            .order("updated_at", { ascending: false })
            .limit(1)
            .maybeSingle()

        if (error) throw error
        return data?.id
    }

    async getMessageHistory(sessionId: string): Promise<Message[]> {
        const { data, error } = await this.supabase
            .from("chat_messages")
            .select("*")
            .eq("session_id", sessionId)
            .order("created_at", { ascending: true })

        if (error) throw error

        const records = data as ChatMessageRecord[]

        return records.map(m => ({
            id: m.id,
            role: m.role as Message["role"],
            content: m.content,
            timestamp: new Date(m.created_at)
        }))
    }

    async sendMessage(params: SendMessageParams): Promise<ChatFunctionReply | undefined> {
        const { data, error } = await this.supabase.functions.invoke("send-chat-message", {
            body: {
                project_id: params.projectId,
                message: params.message,
                session_id: params.sessionId,
                model: params.model
            },
            headers: {
                Authorization: `Bearer ${params.accessToken}`,
                apikey: supabaseAnonKey
            }
        })

        if (error) throw error
        return data?.data as ChatFunctionReply | undefined
    }
}
