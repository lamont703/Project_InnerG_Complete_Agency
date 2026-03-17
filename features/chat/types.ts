export type MessageRole = "user" | "assistant"

export interface MessageSignal {
    id: string
    title: string
    severity: string
    signal_type: string
    project_id?: string
}

export interface Message {
    id: string
    role: MessageRole
    content: string
    timestamp: Date
    signalCreated?: MessageSignal | null
    budgetExceeded?: boolean
}

export interface ChatSessionResponse {
    id: string
    project_id: string
    user_id: string
    updated_at: string
}

export interface ChatMessageRecord {
    id: string
    session_id: string
    role: string
    content: string
    created_at: string
}

export interface SendMessageParams {
    projectId: string
    message: string
    sessionId: string | null
    model: string
    accessToken: string
}

export interface ChatFunctionReply {
    reply: string
    session_id: string
    signal_created?: MessageSignal | null
    budget_exceeded?: boolean
}
