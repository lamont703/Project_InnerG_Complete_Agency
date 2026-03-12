/**
 * generate-session-summaries/service.ts
 * Inner G Complete Agency — Session Summarization Service
 *
 * ─────────────────────────────────────────────────────────
 * ⚠️  GUARDRAIL: This file ONLY contains business logic.
 * It must NOT handle CORS, authentication, or HTTP responses.
 * Prompt content lives HERE (not in index.ts).
 * All secrets are injected via the constructor from index.ts.
 * ─────────────────────────────────────────────────────────
 */

import { SupabaseClient } from "https://esm.sh/@supabase/supabase-js@2"
import { Repo, Logger, generateContent, GEMINI_MODELS } from "../_shared/lib/index.ts"

export class SummarizationService {
    private chatRepo: Repo.ChatRepo

    constructor(private adminClient: SupabaseClient, private logger: Logger, private geminiApiKey: string) {
        this.chatRepo = new Repo.ChatRepo(adminClient)
    }

    async processBatch(limit = 50): Promise<{ processed: number; errors: string[] }> {
        const minMessages = 4
        const eligibleSessions = await this.chatRepo.getEligibleForSummary(limit * 2, minMessages)

        this.logger.info(`Found ${eligibleSessions.length} potentially eligible sessions`)

        let count = 0
        const errors: string[] = []

        for (const session of eligibleSessions) {
            if (count >= limit) break

            try {
                // Check if already has summary (secondary check)
                const exists = await this.chatRepo.hasSummary(session.id)
                if (exists) continue

                // 1. Fetch messages
                const messages = await this.chatRepo.getMessages(session.id)
                if (messages.length < minMessages) continue

                // 2. Format conversation
                const conversationText = messages.map(m =>
                    `${m.role === 'user' ? 'User' : 'Assistant'}: ${m.content}`
                ).join("\n\n")

                const summaryPrompt = `You are a summarization assistant. Generate a concise narrative summary of the following conversation between a user and an AI Growth Assistant.

The summary should:
- Be 2-4 paragraphs
- Capture the main topics discussed
- Note any key insights, data points, or decisions made
- Mention any AI Signals created during the conversation
- Be written in third person past tense ("The user asked about...", "The agent recommended...")
- Include specific numbers and metrics if they were discussed

Conversation (${messages.length} messages):

${conversationText}`

                // 3. Generate Summary
                const response = await generateContent({
                    model: GEMINI_MODELS.FLASH_LITE,
                    userMessage: summaryPrompt,
                    temperature: 0.3
                }, this.geminiApiKey)

                if (!response.text) {
                    throw new Error("Empty summary returned from Gemini")
                }

                // 4. Store Summary
                await this.chatRepo.createSummary({
                    session_id: session.id,
                    project_id: session.project_id,
                    user_id: session.user_id,
                    summary: response.text,
                    message_count: messages.length
                })

                this.logger.info(`Generated summary for session ${session.id}`)
                count++

                // Rate limiting
                await new Promise(r => setTimeout(r, 200))

            } catch (err) {
                this.logger.error(`Failed to summarize session ${session.id}`, err)
                errors.push(`${session.id}: ${String(err)}`)
            }
        }

        return { processed: count, errors }
    }
}
