import { createHandler, z, Logger, okResponse } from "../_shared/lib/index.ts"
import { EmbeddingService } from "./service.ts"

const EmbeddingJobSchema = z.object({
    limit: z.number().int().min(1).max(50).optional().default(10),
    force: z.boolean().optional().default(false)
})

/**
 * process-embedding-jobs
 * Optimized background worker for vector indexing.
 */
export default createHandler(async ({ adminClient, body }) => {
    const logger = new Logger("process-embedding-jobs")
    const geminiApiKey = Deno.env.get("GEMINI_API_KEY")!

    const service = new EmbeddingService(adminClient, logger, geminiApiKey)

    logger.info("Invoking embedding worker", { limit: body.limit, force: body.force })

    const stats = await service.processBatch(body.limit, body.force)

    return okResponse(stats)
}, {
    schema: EmbeddingJobSchema,
    requiredEnv: ["GEMINI_API_KEY", "SUPABASE_URL", "SUPABASE_SERVICE_ROLE_KEY"]
})
