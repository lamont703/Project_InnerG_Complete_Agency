import { createHandler, z, Logger, okResponse } from "../_shared/lib/index.ts"
import { SummarizationService } from "./service.ts"

const BatchSummarySchema = z.object({
    limit: z.number().int().min(1).max(100).optional().default(50)
})

/**
 * generate-session-summaries
 * Production-hardened nightly batch job.
 */
export default createHandler(async ({ adminClient, body }) => {
    const logger = new Logger("generate-session-summaries")
    const geminiApiKey = Deno.env.get("GEMINI_API_KEY")!

    const service = new SummarizationService(adminClient, logger, geminiApiKey)

    logger.info("Starting session summarization batch", { limit: body.limit })

    const result = await service.processBatch(body.limit)

    return okResponse({
        summaries_generated: result.processed,
        errors: result.errors.length > 0 ? result.errors : undefined
    })
}, {
    schema: BatchSummarySchema,
    requiredEnv: ["GEMINI_API_KEY", "SUPABASE_URL", "SUPABASE_SERVICE_ROLE_KEY"]
})
