/**
 * complete-linkedin-auth/index.ts
 * Inner G Complete Agency — LinkedIn OAuth 2.0 Exchange & Activation
 */

import { createHandler, z, okResponse, Logger, LinkedInProvider } from "../_shared/lib/index.ts"

const LinkedInAuthSchema = z.object({
    code: z.string().min(1, "Code is required"),
    state: z.string().optional(), // projectId__state__visitorId
    redirectUri: z.string().optional()
})

export default createHandler(async ({ adminClient, body, user }) => {
    const logger = new Logger("complete-linkedin-auth")
    
    // Parse project identifier and optional visitorId from state 
    // Format from LinkedInLoginButton: `projectId:${projectId}__state:${csrfState}${visitorId ? `__visitor:${visitorId}` : ""}`
    const stateParts = (body.state || "").split("__")
    const projectIdPart = stateParts[0]?.replace("projectId:", "")
    const visitorIdPart = stateParts[2]?.replace("visitor:", "")

    if (!projectIdPart) throw new Error("Missing project identifier in OAuth state.")

    const linkedin = new LinkedInProvider()
    const redirectUri = body.redirectUri || "http://localhost:3000/linkedin/callback"
    
    logger.info(`Starting LinkedIn OAuth exchange for projectId: ${projectIdPart}`, { redirectUri })

    // 0. Ensure user is authenticated
    if (!user) {
        logger.error("No authenticated user found in context.")
        throw new Error("Authentication required to connect LinkedIn.")
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

    // 2. Exchange for Access Token
    const tokenData = await linkedin.exchangeCodeForToken(body.code, redirectUri)
    logger.info(`LinkedIn Token Acquired for user ${user.id}`)
    
    // 3. Fetch User Profile
    const profile = await linkedin.getUserMe(tokenData.access_token)
    logger.info(`Authenticated as LinkedIn user: ${profile.name} (${profile.id})`)

    // 4. Identity Stitching: Connect this LinkedIn user to the website visitor
    if (visitorIdPart) {
        const { error: stitchErr } = await adminClient
            .from("pixel_visitors")
            .upsert({
                visitor_id: visitorIdPart,
                project_id: realProjectId,
                full_name: profile.name,
                last_seen: new Date().toISOString(),
                identity_metadata: {
                    linkedin_user_id: profile.id,
                    linkedin_profile_url: profile.profile_image_url,
                    source: "linkedin_oauth_v2"
                }
            }, { onConflict: "visitor_id, project_id" })
        
        if (stitchErr) logger.error(`LinkedIn Identity Stitching failed: ${stitchErr.message}`)
        else logger.info(`Stitched LinkedIn ${profile.name} to visitor ${visitorIdPart}`)
    }

    // 5. Save LinkedIn Connections (Personal + Organizations)
    const connectionsToSave: any[] = []

    // 5a. Personal Profile Connection
    connectionsToSave.push({
        project_id: realProjectId,
        label: `LinkedIn - ${profile.name} (Member)`,
        db_type: "linkedin",
        connection_url_encrypted: "LINKEDIN_OAUTH_v2",
        sync_config: {
            access_token: tokenData.access_token,
            linkedin_user_id: profile.id,
            display_name: profile.name,
            profile_image_url: profile.profile_image_url,
            email: profile.email,
            user_id: user.id,
            connected_at: new Date().toISOString(),
            is_personal: true
        },
        is_active: true,
        sync_status: "success",
        last_synced_at: new Date().toISOString()
    })

    // 5b. Organization/Page Connections
    try {
        const pages = await linkedin.getAdminPages(tokenData.access_token)
        logger.info(`Found ${pages.length} LinkedIn Pages for user ${profile.name}`)
        
        for (const page of pages) {
            // Add to client_db_connections (for syncing logic)
            connectionsToSave.push({
                project_id: realProjectId,
                label: `LinkedIn - ${page.localizedName}`,
                db_type: "linkedin",
                connection_url_encrypted: "LINKEDIN_OAUTH_v2",
                sync_config: {
                    access_token: tokenData.access_token,
                    linkedin_user_id: profile.id, // Authenticated user
                    page_id: page.id, // The Organization URN (urn:li:organization:123)
                    display_name: page.localizedName,
                    profile_image_url: page.profile_image_url,
                    user_id: user.id,
                    connected_at: new Date().toISOString(),
                    is_organization: true
                },
                is_active: true,
                sync_status: "success",
                last_synced_at: new Date().toISOString()
            })

            // Add to linkedin_pages (for analytics/RAG logic)
            const { error: pageTableErr } = await adminClient
                .from("linkedin_pages")
                .upsert({
                    project_id: realProjectId,
                    linkedin_page_id: page.id,
                    name: page.localizedName,
                    vanity_name: page.vanityName,
                    logo_url: page.profile_image_url,
                    last_synced_at: new Date().toISOString()
                }, { onConflict: "project_id, linkedin_page_id" })
            
            if (pageTableErr) {
                logger.error(`Failed to record LinkedIn Page ${page.id} in analytics table: ${pageTableErr.message}`)
            }
        }
    } catch (pageErr: any) {
        logger.error(`Failed to fetch LinkedIn Pages: ${pageErr.message}`)
        // Continue anyway so personal profile is still connected
    }

    // 5c. Match existing connections to avoid duplicates (database missing unique constraint for upsert)
    const { data: existingConns } = await adminClient
        .from("client_db_connections")
        .select("id, label, db_type")
        .eq("project_id", realProjectId)
        .eq("db_type", "linkedin")

    if (existingConns) {
        for (const conn of connectionsToSave) {
            const match = (existingConns as any[]).find(e => e.label === conn.label && e.db_type === conn.db_type)
            if (match) {
                conn.id = match.id
            }
        }
    }

    const { error: connErr } = await adminClient
        .from("client_db_connections")
        .upsert(connectionsToSave)
    
    if (connErr) {
        logger.error(`Failed to save LinkedIn connections: ${connErr.message}`)
        throw connErr
    }

    return okResponse({
        success: true,
        username: profile.username,
        name: profile.name,
        profile_image_url: profile.profile_image_url,
        connected_pages: connectionsToSave.length - 1,
        message: `Connected LinkedIn account and ${connectionsToSave.length - 1} pages.`
    })
}, {
    schema: LinkedInAuthSchema,
    requireAuth: true,
    requiredEnv: [
        "LINKEDIN_CLIENT_ID", 
        "LINKEDIN_CLIENT_SECRET"
    ]
})
