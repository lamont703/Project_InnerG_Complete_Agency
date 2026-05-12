/**
 * process-scheduled-posts/index.ts
 * Inner G Complete Agency — Scheduled Content Dispatcher
 *
 * This function is invoked periodically (e.g., via pg_cron).
 * It queries social_content_plan for all 'scheduled' drafts
 * whose publish time has arrived, and invokes publish-social-post
 * for each using the Service Role JWT.
 */

import { createHandler, z, Logger, okResponse } from "../_shared/lib/index.ts"

// Using an empty schema since this is internally triggered
const ProcessSchema = z.object({})

export default createHandler(async ({ adminClient }) => {
    const logger = new Logger("process-scheduled-posts")
    logger.info("Starting scheduled post dispatch run...")

    // 1. Fetch posts ready to deploy
    const nowIso = new Date().toISOString()
    const { data: posts, error } = await adminClient
        .from("social_content_plan")
        .select("id, project_id, dispatch_metadata, platform")
        .eq("status", "scheduled")
        .lte("scheduled_at", nowIso)
        .limit(20) // Process in small batches

    if (error) {
        logger.error("Failed to fetch scheduled posts", error)
        throw new Error(error.message)
    }

    if (!posts || posts.length === 0) {
        logger.info("No scheduled posts ready to publish.")
        return okResponse({ processed: 0 })
    }

    logger.info(`Found ${posts.length} posts ready for publishing.`)

    const supabaseUrl = Deno.env.get("SUPABASE_URL")
    const serviceRoleKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")
    const results: any[] = []

    // 2. Dispatch each post
    for (const post of posts) {
        logger.info(`Dispatching post: ${post.id}`)

        const targetPlatforms = post.dispatch_metadata?.platforms || [post.platform]

        try {
            // Internal fetch call to our own publish-social-post endpoint
            const res = await fetch(`${supabaseUrl}/functions/v1/publish-social-post`, {
                method: "POST",
                headers: {
                    "Content-Type": "application/json",
                    "Authorization": `Bearer ${serviceRoleKey}`
                },
                body: JSON.stringify({
                    draft_id: post.id,
                    platforms: targetPlatforms
                })
            })

            const text = await res.text()
            let parsedRes
            try {
                parsedRes = JSON.parse(text)
            } catch (e) {
                parsedRes = text
            }

            if (!res.ok) {
                 logger.error(`Publish endpoint failed for ${post.id}`, { status: res.status, response: parsedRes })
                 results.push({ id: post.id, success: false, error: parsedRes?.error?.message || "Publish endpoint error" })
            } else {
                 logger.info(`Successfully dispatched ${post.id}`, { response: parsedRes })
                 results.push({ id: post.id, success: true, details: parsedRes.data })
            }
        } catch (err: any) {
            logger.error(`Exception while calling publish endpoint for ${post.id}`, err)
            results.push({ id: post.id, success: false, error: String(err) })
            
            // Mark as failed in DB if the endpoint itself couldn't be reached
            await adminClient
                .from("social_content_plan")
                .update({
                    status: "failed",
                    error_log: JSON.stringify({ error: err.message, step: 'internal_dispatch' })
                })
                .eq("id", post.id)
        }
    }

    logger.info("Scheduled post dispatch run complete.")
    
    return okResponse({ 
        processed: posts.length,
        results
    })
}, {
    schema: ProcessSchema,
    requireAuth: false, // Called by cron, authenticated internally or via empty payload, but we'll accept requests freely since it requires NO parameters and only touches records that are naturally expired.
    requiredEnv: ["SUPABASE_URL", "SUPABASE_SERVICE_ROLE_KEY"]
})
