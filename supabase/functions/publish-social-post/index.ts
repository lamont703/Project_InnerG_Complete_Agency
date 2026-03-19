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

const PublishSchema = z.object({
    draft_id: z.string().uuid(),
    platforms: z.array(z.string()).optional()
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
    logger.info(`Orchestrating publish to ${targetPlatforms.join(', ')}`, { projectId: draft.project_id })

    const results: Record<string, { success: boolean; error?: string; post_id?: string }> = {}
    let lastExternalPostId = ""

    // 3. For each platform, fetch connection and publish
    for (const platform of targetPlatforms) {
        try {
            const { data: connection, error: connError } = await adminClient
                .from("client_db_connections")
                .select("sync_config")
                .eq("project_id", draft.project_id)
                .eq("db_type", platform.toLowerCase())
                .single()

            if (connError || !connection) {
                results[platform] = { success: false, error: "No active connection found" }
                continue
            }

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
                    const imgRes = await fetch(draft.media_url)
                    if (imgRes.ok) {
                        const blob = await imgRes.blob()
                        const buffer = new Uint8Array(await blob.arrayBuffer())
                        mediaAsset = await client.uploadImage(authorUrn, buffer, blob.type)
                    }
                }
                
                const postResult = await client.createPost(authorUrn, draft.content_text, mediaAsset)
                results[platform] = { success: true, post_id: postResult.id }
                lastExternalPostId = postResult.id
            } 
            else if (pLower === "instagram") {
                if (!draft.media_url) {
                    throw new Error("Instagram requires an image for posting.")
                }
                
                const igUserId = config.instagram_business_account_id || config.page_id
                if (!igUserId) throw new Error("Missing IG Business Account ID")
                
                const metaClient = new MetaClient(config.access_token)
                const postResult = await metaClient.createInstagramPost(igUserId, draft.content_text, draft.media_url)
                
                results[platform] = { success: true, post_id: postResult.id }
                lastExternalPostId = postResult.id
            }
            else {
                results[platform] = { success: false, error: "Platform not supported yet" }
            }
        } catch (error: any) {
            logger.error(`Failed to publish to ${platform}`, { error: error.message })
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

