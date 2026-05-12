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
    state: z.string().optional(), // State should contain the project ID or slug
    redirectUri: z.string().optional(), // Allow frontend to pass the exact URI used
    isInstagram: z.boolean().optional() // Flag to use Instagram App ID/Secret
})

export default createHandler(async ({ adminClient, body, user }) => {
    const logger = new Logger("complete-meta-auth")

    if (!user) throw new Error("Authentication required")

    // Parse project identifier and optional visitorId from state 
    // Format: "projectId", "projectId__type", or "projectId__type__visitorId"
    const stateParts = (body.state || "").split("__")
    let identifier = stateParts[0] || ""
    const visitorId = stateParts[2] || null // Third part is our visitorId

    if (visitorId) {
        logger.info(`Identity Stitching: Detected visitorId ${visitorId} in OAuth state.`)
    }

    if (!identifier) throw new Error("Missing project identifier in OAuth state.")

    try {
        const meta = new MetaProvider()
        // Determine redirect URI: Prefer the one sent by UI, then env, then default
        let redirectUri = body.redirectUri || getEnv("META_REDIRECT_URI")
        
        // If we're on ngrok or agency, ensure redirect matches what the UI sent
        // Actually, Meta strictly checks this. Let's log it.
        logger.info(`Using redirect URI: ${redirectUri}`)

        logger.info(`Starting Meta/Facebook OAuth exchange (code prefix: ${body.code.substring(0, 10)}...) for identifier: ${identifier}`)

        // --- 0. Resolve Identifier to real UUID ---
        let realProjectId: string = ""
        // Check if it's already a UUID
        const isUUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(identifier)
        
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
        const isInstagram = body.isInstagram || body.code.startsWith("IGAA") // Instagram Basic tokens start with IGAA
        logger.info(`Using app credentials: ${isInstagram ? "INSTAGRAM (1341582051161091)" : "META/FB"} | isInstagram flag: ${body.isInstagram}, code prefix: ${body.code.substring(0, 6)}`)
        const shortToken = await meta.exchangeCodeForToken(body.code, redirectUri, isInstagram)
        logger.info(`Short-lived token obtained: ${shortToken.access_token.substring(0, 10)}...`)

        // 2. Upgrade to Long-Lived Token (60-day)
        const longToken = await meta.getLongLivedToken(shortToken.access_token, isInstagram)
        logger.info(`Upgraded to Long-Lived Token: ${longToken.access_token.substring(0, 10)}...`)

        // ─── INSTAGRAM-NATIVE FLOW ────────────────────────────────────────────────
        // The token from graph.instagram.com works against graph.instagram.com/me,
        // NOT graph.facebook.com/me/accounts. We handle it separately.
        if (isInstagram) {
            logger.info(`[Instagram Native] Fetching IG business account via graph.instagram.com/me`)

            // Get the Instagram user profile directly
            const igMeUrl = `https://graph.instagram.com/me?fields=id,username,name,profile_picture_url,followers_count,media_count&access_token=${longToken.access_token}`
            const igMeRes = await fetch(igMeUrl)
            const igMe = await igMeRes.json()
            logger.info(`[Instagram Native] IG Me: ${JSON.stringify(igMe)}`)

            if (igMe.error) {
                throw new Error(`Instagram profile fetch failed: ${igMe.error.message}`)
            }

            const igId = igMe.id
            const igUsername = igMe.username

            // Save Instagram account
            await adminClient.from("instagram_accounts").upsert({
                project_id: realProjectId,
                instagram_business_id: igId,
                username: igUsername,
                name: igMe.name,
                profile_picture_url: igMe.profile_picture_url,
                follower_count: igMe.followers_count,
                media_count: igMe.media_count,
                last_synced_at: new Date().toISOString()
            })

            // Identity Stitching: Connect this Instagram user to the website visitor
            if (visitorId) {
                const { error: stitchError } = await adminClient
                    .from("pixel_visitors")
                    .upsert({
                        visitor_id: visitorId,
                        project_id: realProjectId,
                        full_name: igMe.name,
                        last_seen: new Date().toISOString(),
                        identity_metadata: {
                            instagram_id: igId,
                            instagram_username: igUsername,
                            p_url: igMe.profile_picture_url,
                            source: "instagram_native_oauth"
                        }
                    }, { onConflict: "visitor_id, project_id" })
                
                if (stitchError) logger.error(`Identity Stitching failed: ${stitchError.message}`)
                else logger.info(`Stitched Instagram @${igUsername} to visitor ${visitorId}`)
            }

            // Save Instagram connection
            await adminClient.from("client_db_connections").upsert({
                project_id: realProjectId,
                label: `Instagram - ${igUsername}`,
                db_type: "instagram",
                connection_url_encrypted: "IG_NATIVE_OAUTH",
                sync_config: {
                    access_token: longToken.access_token,
                    instagram_business_account_id: igId,
                    token_type: "instagram_native"
                },
                is_active: true,
                sync_status: "success"
            })

            const { data: project } = await adminClient
                .from("projects")
                .select("slug")
                .eq("id", realProjectId)
                .single()

            logger.info(`[Instagram Native] Successfully connected Instagram @${igUsername} to project ${realProjectId}`)

            return okResponse({
                success: true,
                projectSlug: project?.slug,
                instagramUsername: igUsername,
                message: `Instagram @${igUsername} successfully connected.`
            })
        }

        // ─── FACEBOOK / META FLOW ─────────────────────────────────────────────────
        // 2.5 Check current permissions and identity
        const meData = await meta.getMe(longToken.access_token)
        logger.info(`Authenticated as Facebook user: ${JSON.stringify(meData)}`)
        
        const perms = await meta.getPermissions(longToken.access_token)
        logger.info(`Current Meta Permissions: ${JSON.stringify(perms)}`)

        // 3. Discover Facebook Pages — multi-fallback for all account types
        // Tier 1: Standard /me/accounts (works for personal accounts)
        let pages = await meta.getInstagramAccounts(longToken.access_token)
        logger.info(`[Tier 1] /me/accounts returned ${pages.length} pages`)

        // Tier 2: /me/businesses (works for Meta Business Suite accounts)
        if (pages.length === 0) {
            logger.info(`[Tier 2] Trying /me/businesses fallback...`)
            pages = await meta.getBusinessPages(longToken.access_token)
            logger.info(`[Tier 2] /me/businesses returned ${pages.length} pages`)
        }

        // Tier 3: Direct page fetch using the page ID from the user's Facebook account
        // (works for New Pages Experience / Professional Mode accounts)
        const KNOWN_PAGE_IDS = ["946747008533071"] // User's known page IDs
        if (pages.length === 0) {
            logger.info(`[Tier 3] Trying direct page fetch for known IDs: ${KNOWN_PAGE_IDS.join(",")}`)
            for (const pid of KNOWN_PAGE_IDS) {
                const page = await meta.getPageDirectly(pid, longToken.access_token)
                logger.info(`[Tier 3] Direct fetch for page ${pid}: ${JSON.stringify(page)}`)
                if (page) pages.push(page)
            }
        }

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
        const igPage = pages.find((p: any) => p.instagram_business_account?.id)
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
                    follower_count: igInfo.followers_count,
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
    requiredEnv: [
        "META_APP_ID", 
        "META_APP_SECRET", 
        "INSTAGRAM_APP_ID", 
        "INSTAGRAM_APP_SECRET", 
        "META_REDIRECT_URI", 
        "SUPABASE_URL", 
        "SUPABASE_SERVICE_ROLE_KEY"
    ]
})
