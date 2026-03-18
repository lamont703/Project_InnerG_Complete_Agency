/**
 * complete-meta-auth/index.ts
 * Inner G Complete Agency — Meta & Instagram OAuth Exchange & Activation
 * 
 * Flow:
 * 1. UI redirects back to /instagram/callback?code=CODE&state=PROJECT_ID
 * 2. Page invokes this function with body: { code, state }
 * 3. We exchange code for Long-Lived Token (LLT) via Graph API
 * 4. We discover available Facebook Pages and Instagram Business accounts
 * 5. We store the tokens and profile in relevant tables
 */

import { createHandler, z, okResponse, Logger, getEnv } from "../_shared/lib/index.ts"
import { MetaProvider } from "../_shared/lib/providers/meta.ts"

const MetaAuthSchema = z.object({
    code: z.string().min(1, "Code is required"),
    state: z.string().optional() // State should contain the project ID or slug
})

export default createHandler(async ({ adminClient, body, user }) => {
    const logger = new Logger("complete-meta-auth")

    if (!user) throw new Error("Authentication required")

    // Parse project identifier from state (e.g. "projectId=UUID" or just the UUID/Slug)
    let identifier = body.state?.startsWith("projectId=") 
        ? body.state.split("=")[1] 
        : body.state

    if (!identifier) throw new Error("Missing project identifier in OAuth state.")

    try {
        const meta = new MetaProvider()
        // Determine redirect URI: Prefer the one in env, but use origin if it looks like a public tunnel
        let redirectUri = getEnv("META_REDIRECT_URI")
        
        // If we're on ngrok or agency, ensure redirect matches what the UI sent
        // Actually, Meta strictly checks this. Let's log it.
        logger.info(`Using redirect URI: ${redirectUri}`)

        logger.info(`Starting Meta/Facebook OAuth exchange for identifier: ${identifier}`)

        // --- 0. Resolve Identifier to real UUID ---
        let realProjectId: string = ""
        // Check if it's already a UUID
        const isUUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(identifier)
        
        if (isUUID) {
            realProjectId = identifier
        } else {
            logger.info(`Resolving slug '${identifier}' to project ID...`)
            const { data: pData, error: pErr } = await adminClient
                .from("projects")
                .select("id")
                .eq("slug", identifier)
                .single()
            
            if (pErr || !pData) throw new Error(`Could not find project with slug: ${identifier}`)
            realProjectId = pData.id
        }

        logger.info(`Resolved project UUID: ${realProjectId}`)

        // 1. Exchange for User Access Token (short-lived)
        const shortToken = await meta.exchangeCodeForToken(body.code, redirectUri)

        // 2. Upgrade to Long-Lived Token (60-day)
        const longToken = await meta.getLongLivedToken(shortToken.access_token)
        
        // 3. Discover Facebook Pages and Instagram Business Accounts
        const pages = await meta.getInstagramAccounts(longToken.access_token)
        
        if (pages.length === 0) {
            throw new Error("No Facebook Pages found. Ensure you are an admin of at least one Facebook Page.")
        }

        // --- Handle Facebook Page Connection ---
        const primaryPage = pages[0] // We'll use the first page as primary for the connection for now
        
        logger.info(`Handling Facebook connection for page: ${primaryPage.name} (${primaryPage.id})`)
        const { error: fbErr } = await adminClient
            .from("client_db_connections")
            .upsert({
                project_id: realProjectId,
                label: `Facebook Meta - ${primaryPage.name}`,
                db_type: "facebook",
                connection_url_encrypted: "META_OAUTH",
                sync_config: {
                    access_token: longToken.access_token,
                    user_id: user.id,
                    page_id: primaryPage.id,
                    page_access_token: primaryPage.access_token,
                    page_name: primaryPage.name
                },
                is_active: true,
                sync_status: "success"
            })
        
        if (fbErr) logger.error(`Failed to save Facebook connection: ${fbErr.message}`)

        // --- Handle Instagram Business Account (Optional) ---
        const igPage = pages.find(p => p.instagram_business_account?.id)
        let igUsername = null

        if (igPage && igPage.instagram_business_account) {
            const igId = igPage.instagram_business_account.id
            logger.info(`Found Instagram Business Account: ${igId} via Page: ${igPage.name}`)
            
            const igInfo = await meta.getInstagramBusinessInfo(igId, longToken.access_token)
            igUsername = igInfo.username

            // Save IG account details
            await adminClient
                .from("instagram_accounts")
                .upsert({
                    project_id: realProjectId,
                    instagram_business_id: igId,
                    username: igInfo.username,
                    name: igInfo.name,
                    profile_picture_url: igInfo.profile_picture_url,
                    follower_count: igInfo.follower_count,
                    media_count: igInfo.media_count,
                    last_synced_at: new Date().toISOString()
                })

            // Save IG connection
            await adminClient
                .from("client_db_connections")
                .upsert({
                    project_id: realProjectId,
                    label: `Instagram - ${igInfo.username}`,
                    db_type: "instagram",
                    connection_url_encrypted: "IG_BUS_OAUTH",
                    sync_config: {
                        access_token: longToken.access_token,
                        instagram_business_account_id: igId,
                        facebook_page_id: igPage.id,
                        page_access_token: igPage.access_token
                    },
                    is_active: true,
                    sync_status: "success"
                })
        }

        // Get project slug for redirect
        const { data: project } = await adminClient
            .from("projects")
            .select("slug")
            .eq("id", realProjectId)
            .single()

        logger.info(`Successfully connected Meta to project ${realProjectId}`)

        return okResponse({
            success: true,
            projectSlug: project?.slug,
            facebookPageName: primaryPage.name,
            instagramUsername: igUsername,
            message: igUsername ? "Facebook & Instagram successfully connected." : "Facebook successfully connected."
        })

    } catch (err: any) {
        logger.error(`Meta Auth Failed: ${err.message}`, err)
        return new Response(JSON.stringify({ 
            success: false, 
            error: err.message,
            stack: err.stack
        }), { 
            status: 400, 
            headers: { "Content-Type": "application/json" }
        })
    }
}, {
    schema: MetaAuthSchema,
    requireAuth: true,
    requiredEnv: ["META_APP_ID", "META_APP_SECRET", "META_REDIRECT_URI", "SUPABASE_URL", "SUPABASE_SERVICE_ROLE_KEY"]
})
