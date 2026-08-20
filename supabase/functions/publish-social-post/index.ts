/**
 * publish-social-post/index.ts
 * Inner G Complete Agency — Social Media Publishing Service
 *
 * Takes a drafted social post and publishes it to the target platform.
 * Enforces multi-tenant isolation: Users can only publish drafts
 * for projects they have access to.
 */

import { createHandler, z, Logger, okResponse } from "../_shared/lib/index.ts"
import { GhlProvider } from "../_shared/lib/providers/ghl.ts"

/**
 * Platforms this function no longer publishes to — see the branch below.
 * GHL stays, because nothing has replaced it.
 */
const RETIRED_PLATFORMS = new Set(["linkedin", "x", "twitter", "facebook", "instagram"])

const PublishSchema = z.object({
    draft_id: z.string().uuid(),
    platforms: z.array(z.string()).optional(),
    scheduled_at: z.string().optional()
})

export default createHandler(async ({ adminClient, body, user }) => {
    const logger = new Logger("publish-social-post")
    
    if (!user) throw new Error("Authentication required")

    // 1. Fetch the draft and check isolation
    const { data: draft, error: fetchError } = await adminClient
        .from("social_content_plan")
        .select("*")
        .eq("id", body.draft_id)
        .single()

    if (fetchError || !draft) throw new Error(`Draft not found.`)
    if (draft.status === "published" && !body.platforms) throw new Error("This draft has already been published.")

    // Perms Check
    if (user.role === 'client') {
        const { data: access } = await adminClient
            .from('project_user_access')
            .select('project_id')
            .eq('project_id', draft.project_id)
            .eq('user_id', user.id)
            .maybeSingle()

        if (!access) {
            logger.warn("Unauthorized publish attempt", { userId: user.id, draftId: body.draft_id, projectId: draft.project_id })
            throw new Error("UNAUTHORIZED: You do not have permission to publish this draft.")
        }
    } else if (user.role !== 'super_admin' && user.role !== 'developer') {
        throw new Error(`FORBIDDEN: Role ${user.role} is not permitted to publish.`)
    }

    // 2. Resolve targeted platforms
    const targetPlatforms: string[] = (body.platforms || [draft.platform]).map((p: string) => p.toLowerCase())
    logger.info(`Orchestrating ${body.scheduled_at ? 'schedule' : 'publish'} to ${targetPlatforms.join(', ')}`, { projectId: draft.project_id })

    // If scheduled_at is provided, just update the status and return
    if (body.scheduled_at) {
        const { error: scheduleError } = await adminClient
            .from("social_content_plan")
            .update({
                status: "scheduled",
                scheduled_at: body.scheduled_at,
                platform: targetPlatforms[0], // Primary platform
                dispatch_metadata: { 
                    ...draft.dispatch_metadata,
                    platforms: targetPlatforms 
                }
            })
            .eq("id", body.draft_id)

        if (scheduleError) throw scheduleError
        
        return okResponse({
            success: true,
            message: `Scheduled for ${body.scheduled_at} to ${targetPlatforms.join(', ')}`
        })
    }

    const results: Record<string, { success: boolean; error?: string; post_id?: string }> = {}
    let lastExternalPostId = ""

    // 3. For each platform, fetch connection and publish
    for (const platform of targetPlatforms) {
        try {
            const { data: connections, error: connError } = await adminClient
                .from("client_db_connections")
                .select("id, label, sync_config")
                .eq("project_id", draft.project_id)
                .eq("db_type", platform.toLowerCase())

            if (connError || !connections || connections.length === 0) {
                results[platform] = { success: false, error: "No active connection found" }
                continue
            }

            const connection = connections[0]

            logger.info(`Found ${connections.length} connections for ${platform}. Selected: ${connection.label} (${connection.id})`)

            const config = connection.sync_config as any
            const pLower = platform.toLowerCase()

            /*
             * RETIRED: linkedin, x/twitter, facebook and instagram.
             *
             * These four now publish from the content publisher line
             * (app/api/cron/publish-content) against publisher_connections,
             * not from here against client_db_connections. Two systems that can
             * both post to the same account is how the same video goes out
             * twice, and how a token refreshed by one is invalidated under the
             * other — X in particular rotates its refresh token on every use,
             * so two writers race and whichever loses leaves a dead connection.
             *
             * REFUSED, NOT SILENTLY DROPPED. Returning success for a platform
             * nothing was sent to is worse than an error: the draft would be
             * marked published and nobody would look again.
             *
             * The publishing code that used to live here is not lost — it was
             * ported to lib/linkedin-publish.ts and lib/x-publish.ts, both of
             * which target the current APIs rather than the deprecated ones
             * this used (LinkedIn's Assets/ugcPosts, X's v1.1 media upload).
             */
            if (RETIRED_PLATFORMS.has(pLower)) {
                results[platform] = {
                    success: false,
                    error: `${platform} is published from the content publisher now, not from here. Queue it at /admin/content-publisher.`,
                }
            }
            else if (pLower === "ghl") {
                const ghl = new GhlProvider(config.access_token || config.apiKey)
                const locationId = config.locationId || config.page_id
                if (!locationId) throw new Error("Missing GHL Location ID")
                
                // Destination ID might contain the specific social account ID in GHL
                const accountId = draft.destination_id && draft.destination_id !== 'ghl' ? draft.destination_id : null
                
                const postResult = await ghl.publishSocialPost(locationId, {
                    content: draft.content_text,
                    accountIds: accountId ? [accountId] : [],
                    userId: config.userId || config.ghl_user_id || "",
                    title: draft.metadata?.title,
                    mediaUrl: draft.media_url || undefined,
                })
                
                logger.info(`Successfully published to GHL`, { post_id: postResult.id || postResult.postId || "GHL_POST" })
                results[platform] = { success: true, post_id: postResult.id || postResult.postId || "GHL_POST" }
                lastExternalPostId = postResult.id || postResult.postId || "GHL_POST"
            }
            else {
                results[platform] = { success: false, error: "Platform not supported yet" }
            }
        } catch (error: any) {
            logger.error(`Failed to publish to ${platform}`, error)
            results[platform] = { success: false, error: error.message }
        }
    }

    // 4. Determine final status
    const allSucceeded = targetPlatforms.every((p: string) => results[p]?.success)
    const someSucceeded = targetPlatforms.length > 0 && targetPlatforms.some((p: string) => results[p]?.success)

    if (someSucceeded) {
        // Update draft status
        const { error: updateError } = await adminClient
            .from("social_content_plan")
            .update({
                status: allSucceeded ? "published" : "draft",
                published_at: new Date().toISOString(),
                external_post_id: lastExternalPostId,
                error_log: allSucceeded ? null : JSON.stringify(results)
            })
            .eq("id", draft.id)

        if (updateError) throw updateError
    }

    return okResponse({ 
        success: someSucceeded, 
        message: someSucceeded ? `Published to ${Object.keys(results).filter((p: string) => results[p].success).join(', ')}` : "Failed to publish to any platform",
        results
    })
}, {
    schema: PublishSchema,
    requireAuth: true,
    requiredEnv: ["SUPABASE_URL", "SUPABASE_SERVICE_ROLE_KEY"]
})

