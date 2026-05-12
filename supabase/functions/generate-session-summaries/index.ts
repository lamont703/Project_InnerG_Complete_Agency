import { createHandler, z, Logger, okResponse } from "../_shared/lib/index.ts"
import { SessionSummaryService } from "./service.ts"

const SummarySchema = z.object({
    projectId: z.string().uuid().optional(),
    daysBack: z.number().int().min(1).max(365).optional().default(1)
})

/**
 * generate-session-summaries
 * Aggregates chat history into narrative summaries for RAG memory.
 */
export default createHandler(async ({ adminClient, body }) => {
    const logger = new Logger("generate-session-summaries")
    const geminiApiKey = Deno.env.get("GEMINI_API_KEY")!

    const service = new SessionSummaryService(adminClient, logger, geminiApiKey)
    
    logger.info("Starting nightly chat summarization", { 
        projectId: body.projectId || "ALL",
        daysBack: body.daysBack
    })

    const stats = await service.summarizeSessions(body.projectId, body.daysBack)

    return okResponse(stats)
}, {
    schema: SummarySchema,
    requiredEnv: ["GEMINI_API_KEY", "SUPABASE_URL", "SUPABASE_SERVICE_ROLE_KEY"]
})
