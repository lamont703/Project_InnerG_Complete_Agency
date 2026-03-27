import { SupabaseClient } from "https://esm.sh/@supabase/supabase-js@2"
import { Logger, generateContent, GEMINI_MODELS } from "../_shared/lib/index.ts"

/**
 * SessionSummaryService
 * Handles the logic of aggregating chat messages and creating narrative summaries.
 */
export class SessionSummaryService {
    constructor(
        private adminClient: SupabaseClient, 
        private logger: Logger, 
        private geminiApiKey: string
    ) { }

    async summarizeSessions(projectId?: string, daysBack = 1): Promise<{ processed: number; failed: number }> {
        const dateLimit = new Date();
        dateLimit.setDate(dateLimit.getDate() - daysBack);
        
        // 1. Fetch sessions modified in the last N days
        let query = this.adminClient
            .from('chat_sessions')
            .select('id, project_id, user_id, title')
            .gte('updated_at', dateLimit.toISOString())
        
        if (projectId) query = query.eq('project_id', projectId)
        
        const { data: sessions, error } = await query
        
        if (error) {
            this.logger.error("Failed to fetch sessions for summary", error)
            return { processed: 0, failed: 0 }
        }

        let processed = 0
        let failed = 0

        this.logger.info(`Processing summaries for ${sessions.length} sessions`)

        for (const session of sessions) {
            try {
                // 2. Fetch the session history
                const { data: messages, error: mError } = await this.adminClient
                    .from('chat_messages')
                    .select('role, content, created_at')
                    .eq('session_id', session.id)
                    .order('created_at', { ascending: true })

                if (mError || (messages?.length || 0) < 2) {
                    this.logger.info(`Skipping trivial session ${session.id}`)
                    continue
                }

                // 3. Format history for the summarizer
                const chatHistory = messages
                    .map((m: any) => `[${m.role.toUpperCase()}]: ${m.content}`)
                    .join("\n\n")

                // 4. Call Gemini to summarize
                const summary = await this.generatePromptSummary(chatHistory)
                
                if (!summary) throw new Error("Could not generate summary")

                // 5. Upsert to the session_summaries table
                // (This table has a trigger that will automatically re-embed this into memory)
                const { error: sError } = await this.adminClient
                    .from('session_summaries')
                    .upsert({
                        session_id: session.id,
                        project_id: session.project_id,
                        user_id: session.user_id,
                        summary: summary,
                        message_count: messages.length,
                        generated_at: new Date().toISOString()
                    }, { onConflict: 'session_id' })

                if (sError) throw sError
                
                processed++
                
            } catch (err: any) {
                this.logger.error(`Summary failed for session ${session.id}`, err)
                failed++
            }
        }

        return { processed, failed }
    }

    private async generatePromptSummary(history: string): Promise<string | null> {
        const prompt = `
You are a high-level agency intelligence assistant. Summarize the following chat conversation between a human and an AI assistant.
Focus on:
1. Key goals or problems identified.
2. Decisions made or agreed upon.
3. Important metrics or project data mentioned.
4. Next steps required.

Keep the summary concise but informative (max 300 words). 
Format it as a professional narrative summary in the third person.

Chat History:
${history}
`
        try {
            const { text } = await generateContent({
                model: GEMINI_MODELS.FLASH_LITE,
                userMessage: prompt,
                temperature: 0.2,
                maxOutputTokens: 1000
            }, this.geminiApiKey)

            return text
        } catch (err) {
            this.logger.error("Gemini API call failed with exception", err)
            return null
        }
    }
}
