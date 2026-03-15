/**
 * publish-social-post/index.ts
 * Inner G Complete Agency — Social Media Publishing Service
 *
 * Takes a drafted social post and publishes it to the target platform.
 * Enforces multi-tenant isolation: Users can only publish drafts
 * for projects they have access to.
 */

import { createHandler, z, Logger, okResponse, Repo } from "../_shared/lib/index.ts"
import { LinkedInClient } from "../connector-sync/providers/linkedin/client.ts"

const PublishSchema = z.object({
    draft_id: z.string().uuid()
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
    if (draft.status === "published") throw new Error("This draft has already been published.")

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

    // 2. Resolve credentials for the target platform
    const { data: connection, error: connError } = await adminClient
        .from("client_db_connections")
        .select("sync_config")
        .eq("project_id", draft.project_id)
        .eq("db_type", draft.platform)
        .single()

    if (connError || !connection) throw new Error(`No active ${draft.platform} connection found for this project.`)

    const config = connection.sync_config as any
    let externalPostId = ""

    // 3. Dispatch to platform
    logger.info(`Orchestrating publish to ${draft.platform}`, { projectId: draft.project_id })
    
    if (draft.platform === "linkedin") {
        const client = new LinkedInClient(config.access_token)
        let authorUrn = ""
        
        if (config.page_id) {
            authorUrn = config.page_id.startsWith('urn:li:') ? config.page_id : `urn:li:organization:${config.page_id}`
        } else if (config.person_id) {
            authorUrn = config.person_id.startsWith('urn:li:') ? config.person_id : `urn:li:person:${config.person_id}`
        }
        
        if (!authorUrn) throw new Error("LinkedIn connection is missing author ID (page_id or person_id)")
        
        const result = await client.createPost(authorUrn, draft.content_text)
        externalPostId = result.id
    } else if (draft.platform === "tiktok") {
        throw new Error("TikTok text-based posting not yet implemented in client.")
    } else {
        throw new Error(`Platform ${draft.platform} not supported for automated publishing yet.`)
    }

    // 4. Update draft status
    const { error: updateError } = await adminClient
        .from("social_content_plan")
        .update({
            status: "published",
            published_at: new Date().toISOString(),
            external_post_id: externalPostId
        })
        .eq("id", draft.id)

    if (updateError) throw updateError

    return okResponse({ 
        success: true, 
        message: `Successfully published to ${draft.platform}`,
        post_id: externalPostId 
    })
}, {
    schema: PublishSchema,
    requireAuth: true,
    requiredEnv: ["SUPABASE_URL", "SUPABASE_SERVICE_ROLE_KEY"]
})
