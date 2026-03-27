/**
 * publish-social-post/index.ts
 * Inner G Complete Agency — Social Media Publishing Service
 *
 * Takes a drafted social post and publishes it to the target platform.
 * Enforces multi-tenant isolation: Users can only publish drafts
 * for projects they have access to.
 */

import { createHandler, z, Logger, okResponse } from "../_shared/lib/index.ts"
import { LinkedInClient } from "../connector-sync/providers/linkedin/client.ts"
import { MetaClient } from "../connector-sync/providers/meta/client.ts"
import { TwitterProvider } from "../_shared/lib/providers/twitter.ts"
import { GhlProvider } from "../_shared/lib/providers/ghl.ts"

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

            // If multiple connections, intelligently select. 
            // For LinkedIn, prefer organization/page over individual if available.
            let connection = connections[0]
            if (platform.toLowerCase() === "linkedin" && connections.length > 1) {
                const pageConn = connections.find((c: any) => (c.sync_config as any).page_id || c.label.toLowerCase().includes("page") || c.label.toLowerCase().includes("agency"))
                if (pageConn) connection = pageConn
            }

            logger.info(`Found ${connections.length} connections for ${platform}. Selected: ${connection.label} (${connection.id})`)

            const config = connection.sync_config as any
            const pLower = platform.toLowerCase()

            if (pLower === "linkedin") {
                const client = new LinkedInClient(config.access_token)
                let authorUrn = ""
                
                if (config.page_id) {
                    authorUrn = config.page_id.startsWith('urn:li:') ? config.page_id : `urn:li:organization:${config.page_id}`
                } else if (config.person_id) {
                    authorUrn = config.person_id.startsWith('urn:li:') ? config.person_id : `urn:li:person:${config.person_id}`
                }
                
                if (!authorUrn) throw new Error("LinkedIn connection is missing author ID")

                let mediaAsset = undefined
                if (draft.media_url) {
                    const isVideo = draft.media_url.includes(".mp4") || draft.media_url.includes(".mov")
                    const mediaRes = await fetch(draft.media_url)
                    if (mediaRes.ok) {
                        const blob = await mediaRes.blob()
                        if (isVideo) {
                            mediaAsset = await client.uploadVideo(authorUrn, blob, blob.type || "video/mp4")
                        } else {
                            mediaAsset = await client.uploadImage(authorUrn, blob, blob.type || "image/png")
                        }
                    }
                }
                
                const postResult = await client.createPost(authorUrn, draft.content_text, mediaAsset)
                logger.info(`Successfully published to LinkedIn`, { post_id: postResult.id })
                results[platform] = { success: true, post_id: postResult.id }
                lastExternalPostId = postResult.id
            } 
            else if (pLower === "instagram") {
                if (!draft.media_url) {
                    throw new Error("Instagram requires an image or video for posting.")
                }
                
                const igUserId = config.instagram_business_account_id || config.page_id
                if (!igUserId) throw new Error("Missing IG Business Account ID")
                
                const metaClient = new MetaClient(config.access_token)
                const isVideo = draft.media_url.includes(".mp4") || draft.media_url.includes(".mov")

                let postResult
                if (isVideo) {
                    postResult = await metaClient.createInstagramVideoPost(igUserId, draft.content_text, draft.media_url)
                } else {
                    postResult = await metaClient.createInstagramPost(igUserId, draft.content_text, draft.media_url)
                }
                
                logger.info(`Successfully published to Instagram`, { post_id: postResult.id })
                results[platform] = { success: true, post_id: postResult.id }
                lastExternalPostId = postResult.id
            }
            else if (pLower === "twitter" || pLower === "x") {
                const client = new TwitterProvider()
                let token = config.access_token
                let postResult
                
                try {
                    postResult = await client.createTweet(token, draft.content_text)
                } catch (err: any) {
                    if ((err.message.includes("Unauthorized") || err.message.includes("401")) && config.refresh_token) {
                        logger.info(`Twitter token expired. Attempting refresh...`)
                        const refreshData = await client.refreshToken(config.refresh_token)
                        if (refreshData.access_token) {
                            token = refreshData.access_token
                            // Update the connection config
                            const { error: updateErr } = await adminClient
                                .from("client_db_connections")
                                .update({ 
                                    sync_config: { 
                                        ...config, 
                                        access_token: token,
                                        refresh_token: refreshData.refresh_token || config.refresh_token
                                    } 
                                })
                                .eq("id", connection.id)
                            
                            if (!updateErr) {
                                logger.info(`Token refreshed. Retrying publish...`)
                                postResult = await client.createTweet(token, draft.content_text)
                            } else {
                                throw new Error(`Refresh succeeded but failed to update DB: ${updateErr.message}`)
                            }
                        } else {
                            throw err
                        }
                    } else {
                        throw err
                    }
                }

                logger.info(`Successfully published to X (Twitter)`, { post_id: postResult.id })
                results[platform] = { success: true, post_id: postResult.id }
                lastExternalPostId = postResult.id
            }
            else if (pLower === "facebook") {
                const metaClient = new MetaClient(config.access_token)
                const pageId = config.page_id || config.instagram_business_account_id
                if (!pageId) throw new Error("Missing Facebook Page ID")
                
                const postResult = await metaClient.createFacebookPost(pageId, draft.content_text)
                logger.info(`Successfully published to Facebook`, { post_id: postResult.id })
                results[platform] = { success: true, post_id: postResult.id }
                lastExternalPostId = postResult.id
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
                    title: draft.metadata?.title
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

