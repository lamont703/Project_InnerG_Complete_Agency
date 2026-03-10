"use client"

import { ChatInterface as ModularChatInterface } from "@/features/chat/ChatInterface"

interface ChatInterfaceProps {
    projectSlug: string
}

/**
 * @deprecated Use @/features/chat/ChatInterface instead.
 * This is a wrapper to maintain backward compatibility during the modular refactor.
 */
export function ChatInterface({ projectSlug }: ChatInterfaceProps) {
    return <ModularChatInterface projectSlug={projectSlug} />
}
