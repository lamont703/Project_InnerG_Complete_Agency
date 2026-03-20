/**
 * complete-tiktok-auth/index.ts
 * Inner G Complete Agency — TikTok OAuth Exchange & Activation
 */

import { createHandler, z, okResponse, Logger, getEnv } from "../_shared/lib/index.ts"
import { TikTokProvider } from "../_shared/lib/providers/tiktok.ts"

const TikTokAuthSchema = z.object({
    code: z.string().min(1, "Code is required"),
    codeVerifier: z.string().min(1, "Code verifier is required"),
    state: z.string().optional(), // projectId__state
    redirectUri: z.string().optional()
})

export default createHandler(async ({ adminClient, body, user }) => {
    const logger = new Logger("complete-tiktok-auth")

    if (!user) throw new Error("Authentication required")

    // Parse project identifier from state (projectId__csrf)
    const stateParts = body.state?.split("__") || []
    const identifier = stateParts[0]

    if (!identifier) throw new Error("Missing project identifier in OAuth state.")

    try {
        const tiktok = new TikTokProvider()
        // Determine redirect URI: Prefer the one sent by UI, then default to a safe one
        const redirectUri = body.redirectUri || "https://agency.innergcomplete.com/tiktok/callback"
        
        logger.info(`Starting TikTok OAuth exchange for identifier: ${identifier}`, { redirectUri })

        // 1. Resolve Identifier to real UUID
        let realProjectId: string = ""
        const isUUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(identifier)
        
        if (isUUID) {
            realProjectId = identifier
        } else {
            const { data: pData, error: pErr } = await adminClient
                .from("projects")
                .select("id")
                .eq("slug", identifier)
                .single()
            
            if (pErr || !pData) throw new Error(`Could not find project with slug: ${identifier}`)
            realProjectId = pData.id
        }

        // 2. Exchange for Access & Refresh Tokens
        const tokenData = await tiktok.exchangeCodeForToken(body.code, redirectUri, body.codeVerifier)
        
        logger.info(`TikTok Tokens Acquired: ${tokenData.access_token.substring(0, 10)}...`)
        
        // 3. Fetch User Profile
        const profile = await tiktok.getUserInfo(tokenData.access_token)
        logger.info(`Authenticated as TikTok user: ${profile.display_name} (${profile.open_id})`)

        // 4. Save TikTok Connection
        const { error: tiktokErr } = await adminClient
            .from("client_db_connections")
            .upsert({
                project_id: realProjectId,
                label: `TikTok - ${profile.display_name}`,
                db_type: "tiktok",
                connection_url_encrypted: "TIKTOK_OAUTH_v2",
                sync_config: {
                    access_token: tokenData.access_token,
                    refresh_token: tokenData.refresh_token,
                    open_id: profile.open_id,
                    display_name: profile.display_name,
                    avatar_url: profile.avatar_url,
                    follower_count: profile.follower_count || 0,
                    following_count: profile.following_count || 0,
                    heart_count: profile.heart_count || 0,
                    video_count: profile.video_count || 0,
                    user_id: user.id, // Auth user who connected it
                    connected_at: new Date().toISOString()
                },
                is_active: true,
                sync_status: "success",
                last_synced_at: new Date().toISOString()
            })
        
        if (tiktokErr) {
            logger.error(`Failed to save TikTok connection: ${tiktokErr.message}`)
            throw tiktokErr
        }

        // --- Fetch initial metrics (Optional but recommended) ---
        // Implementation for tiktok-sync tool can be built separately

        return okResponse({
            success: true,
            display_name: profile.display_name,
            avatar_url: profile.avatar_url,
            message: "TikTok successfully connected."
        })

    } catch (err: any) {
        logger.error(`TikTok Auth Failed: ${err.message}`, err)
        return new Response(JSON.stringify({ 
            success: false, 
            error: err.message 
        }), { 
            status: 400, 
            headers: { "Content-Type": "application/json" }
        })
    }
}, {
    schema: TikTokAuthSchema,
    requireAuth: true,
    requiredEnv: [
        "TIKTOK_PRODUCTION_CLIENT_KEY", 
        "TIKTOK_PRODUCTION_CLIENT_SECRET", 
        "SUPABASE_URL", 
        "SUPABASE_SERVICE_ROLE_KEY"
    ]
})
