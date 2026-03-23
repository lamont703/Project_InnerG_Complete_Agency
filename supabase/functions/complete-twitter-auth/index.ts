/**
 * complete-twitter-auth/index.ts
 * Inner G Complete Agency — X (Twitter) OAuth 2.0 Exchange & Activation
 */

import { createHandler, z, okResponse, Logger, getEnv } from "../_shared/lib/index.ts"
import { TwitterProvider } from "../_shared/lib/providers/twitter.ts"

const TwitterAuthSchema = z.object({
    code: z.string().min(1, "Code is required"),
    codeVerifier: z.string().min(1, "Code verifier is required"),
    state: z.string().optional(), // projectId__state__visitorId
    redirectUri: z.string().optional()
})

export default createHandler(async ({ adminClient, body, user }) => {
    const logger = new Logger("complete-twitter-auth")
    
    // For debugging we allow no user for now. 
    // In production we should use the state's project_id to verify.

    // Parse project identifier and optional visitorId from state 
    // Format from TwitterLoginButton: `projectId:${projectId}__state:${csrfState}${visitorId ? `__visitor:${visitorId}` : ""}`
    const stateParts = (body.state || "").split("__")
    const projectIdPart = stateParts[0]?.replace("projectId:", "")
    const visitorIdPart = stateParts[2]?.replace("visitor:", "")

    if (!projectIdPart) throw new Error("Missing project identifier in OAuth state.")

    try {
        const twitter = new TwitterProvider()
        const redirectUri = body.redirectUri || "https://innergcomplete.com/x/callback"
        
        logger.info(`Starting X (Twitter) OAuth exchange for projectId: ${projectIdPart}`, { redirectUri })

        // 0. Ensure user is authenticated (redundant with requireAuth: true, but safe)
        if (!user) {
            logger.error("No authenticated user found in context.")
            throw new Error("Authentication required to connect X.")
        }

        // 1. Resolve Project UUID (Handle slugs/UUIDs)
        let realProjectId: string = ""
        const isUUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(projectIdPart)
        
        if (isUUID) {
            realProjectId = projectIdPart
        } else {
            const { data: pData, error: pErr } = await adminClient
                .from("projects")
                .select("id")
                .eq("slug", projectIdPart)
                .single()
            
            if (pErr || !pData) throw new Error(`Could not find project with slug: ${projectIdPart}`)
            realProjectId = pData.id
        }

        // 2. Exchange for Access & Refresh Tokens
        const tokenData = await twitter.exchangeCodeForToken(body.code, redirectUri, body.codeVerifier)
        logger.info(`X Tokens Acquired for user ${user.id}`)
        
        // 3. Fetch User Profile
        const profile = await twitter.getUserMe(tokenData.access_token)
        logger.info(`Authenticated as X user: @${profile.username} (${profile.id})`)

        // 4. Identity Stitching: Connect this X user to the website visitor
        if (visitorIdPart) {
            const { error: stitchErr } = await adminClient
                .from("pixel_visitors")
                .upsert({
                    visitor_id: visitorIdPart,
                    project_id: realProjectId,
                    full_name: profile.name,
                    last_seen: new Date().toISOString(),
                    identity_metadata: {
                        twitter_user_id: profile.id,
                        twitter_username: profile.username,
                        p_url: profile.profile_image_url,
                        source: "twitter_oauth_v2"
                    }
                }, { onConflict: "visitor_id, project_id" })
            
            if (stitchErr) logger.error(`X Identity Stitching failed: ${stitchErr.message}`)
            else logger.info(`Stitched X @${profile.username} to visitor ${visitorIdPart}`)
        }

        // 5. Save X Connection
        const { error: twitterErr } = await adminClient
            .from("client_db_connections")
            .upsert({
                project_id: realProjectId,
                label: `X (Twitter) - ${profile.username}`,
                db_type: "twitter",
                connection_url_encrypted: "TWITTER_OAUTH_v2",
                sync_config: {
                    access_token: tokenData.access_token,
                    refresh_token: tokenData.refresh_token,
                    twitter_user_id: profile.id,
                    username: profile.username,
                    display_name: profile.name,
                    profile_image_url: profile.profile_image_url,
                    follower_count: profile.public_metrics?.followers_count || 0,
                    user_id: user.id,
                    connected_at: new Date().toISOString()
                },
                is_active: true,
                sync_status: "success",
                last_synced_at: new Date().toISOString()
            })
        
        if (twitterErr) {
            logger.error(`Failed to save X connection: ${twitterErr.message}`)
            throw twitterErr
        }

        return okResponse({
            success: true,
            username: profile.username,
            name: profile.name,
            profile_image_url: profile.profile_image_url,
            message: "X (Twitter) successfully connected."
        })

    } catch (err: any) {
        logger.error(`X Auth Failed: ${err.message}`, err)
        return new Response(JSON.stringify({ 
            data: null, 
            error: { code: "X_AUTH_FAILED", message: err.message }
        }), { 
            status: 400, 
            headers: { "Content-Type": "application/json" }
        })
    }
}, {
    schema: TwitterAuthSchema,
    requireAuth: true,
    requiredEnv: [
        "TWITTER_CLIENT_ID", 
        "TWITTER_CLIENT_SECRET"
    ]
})

