import { createHandler, z, Logger, okResponse, YouTubeProvider } from "../_shared/lib/index.ts"

// 🛡️ Auth callback schema
const YouTubeAuthSchema = z.object({
    code: z.string(),
    state: z.string(), // Expected format: projectId:UUID__visitor:UUID
    redirectUri: z.string().optional()
})

/**
 * complete-youtube-auth
 * Handles Google OAuth callback for YouTube integration.
 */
export default createHandler(async ({ adminClient, body, user }) => {
    const logger = new Logger("complete-youtube-auth")
    
    // 1. Parse State
    const stateParts = (body.state as string).split('__')
    const projectIdPart = stateParts.find((p: string) => p.startsWith('projectId:'))?.split(':')[1]
    const visitorIdPart = stateParts.find((p: string) => p.startsWith('visitor:'))?.split(':')[1]
    
    if (!projectIdPart) throw new Error("Missing projectId in state")
    const realProjectId = projectIdPart
    
    logger.info(`Starting YouTube OAuth exchange for projectId: ${realProjectId}`)

    // 1.5 Verify Project Exists (Optional but recommended to prevent FK errors)
    const { data: project, error: projErr } = await adminClient
        .from("projects")
        .select("id")
        .eq("id", realProjectId)
        .single()
    
    if (projErr || !project) {
        logger.error(`Project not found or invalid: ${realProjectId}`)
        return okResponse({
            success: false,
            message: `Invalid project context (ID: ${realProjectId}). Please return to the dashboard and ensure a project is selected before connecting.`
        })
    }

    const GOOGLE_CLIENT_ID = Deno.env.get("GOOGLE_CLIENT_ID")
    const GOOGLE_CLIENT_SECRET = Deno.env.get("GOOGLE_CLIENT_SECRET")
    
    // Determine Redirect URI based on environment
    const origin = "https://agency.innergcomplete.com" 
    const isLocal = body.state.includes("localhost") || !origin
    const defaultRedirectUri = isLocal ? "http://localhost:3000/youtube/callback" : `${origin}/youtube/callback`
    const redirectUri = body.redirectUri || defaultRedirectUri

    logger.info("Using Redirect URI", { redirectUri })

    // 2. Exchange Code for Tokens
    const tokenRes = await fetch("https://oauth2.googleapis.com/token", {
        method: "POST",
        headers: { "Content-Type": "application/x-www-form-urlencoded" },
        body: new URLSearchParams({
            client_id: GOOGLE_CLIENT_ID!,
            client_secret: GOOGLE_CLIENT_SECRET!,
            code: body.code,
            grant_type: "authorization_code",
            redirect_uri: redirectUri
        })
    })

    if (!tokenRes.ok) {
        const error = await tokenRes.json()
        logger.error("Google Token Exchange Failed", error)
        throw new Error(`Google OAuth Error: ${error.error_description || error.error || "Failed to exchange code"}`)
    }

    const tokenData = await tokenRes.json()
    logger.info(`YouTube Token Acquired for user ${user?.id || 'anonymous'}`)

    // 3. Get User Profile & YouTube Channels
    const youtube = new YouTubeProvider(tokenData.access_token)
    const profile = await youtube.getUserMe()
    const channels = await youtube.getMyChannels()

    logger.info(`Authenticated as Google user: ${profile.name} (${profile.email})`)
    logger.info(`Found ${channels?.length || 0} YouTube channels`)

    // 4. Save Connections (One per channel)
    const connectionsToSave: any[] = []
    
    if (!channels || channels.length === 0) {
        logger.warn(`No YouTube channels found for account: ${profile.email}`)
        return okResponse({
            success: false, // Changed to false because we couldn't connect any channels
            name: profile.name,
            email: profile.email,
            channels_connected: 0,
            message: "No YouTube channels were found for this Google account. Please ensure you have a channel created or select the correct Brand account."
        })
    }

    for (const channel of channels) {
        const connectionData = {
            project_id: realProjectId,
            label: `YouTube - ${channel.snippet.title}`,
            db_type: "youtube",
            connection_url_encrypted: "GOOGLE_OAUTH_v2",
            sync_config: {
                access_token: tokenData.access_token,
                refresh_token: tokenData.refresh_token, // IMPORTANT: Google only returns this on FIRST consent or prompt=consent
                channel_id: channel.id,
                display_name: channel.snippet.title,
                profile_image_url: channel.snippet.thumbnails?.default?.url,
                email: profile.email,
                user_id: user?.id,
                connected_at: new Date().toISOString()
            },
            is_active: true,
            sync_status: "success",
            last_synced_at: new Date().toISOString()
        }
        
        connectionsToSave.push(connectionData)

        // Also upsert into youtube_channels table for analytics
        const { error: ytErr } = await adminClient
            .from("youtube_channels")
            .upsert({
                project_id: realProjectId,
                channel_id: channel.id,
                title: channel.snippet.title,
                description: channel.snippet.description,
                thumbnail_url: channel.snippet.thumbnails?.high?.url || channel.snippet.thumbnails?.default?.url,
                subscriber_count: channel.statistics?.subscriberCount || 0,
                view_count: channel.statistics?.viewCount || 0,
                video_count: channel.statistics?.videoCount || 0,
                last_synced_at: new Date().toISOString()
            }, { onConflict: "project_id, channel_id" })
        
        if (ytErr) logger.error(`Failed to upsert channel ${channel.id} for project ${realProjectId}: ${ytErr.message}`)
    }

    // 5. Deduplicate and Save Connections
    const { data: existingConns } = await adminClient
        .from("client_db_connections")
        .select("id, label, db_type")
        .eq("project_id", realProjectId)
        .eq("db_type", "youtube")

    if (existingConns) {
        for (const conn of connectionsToSave) {
            const match = (existingConns as any[]).find(e => e.label === conn.label && e.db_type === conn.db_type)
            if (match) conn.id = match.id
        }
    }

    logger.info(`Saving ${connectionsToSave.length} YouTube connections to database...`)
    const { error: connErr } = await adminClient
        .from("client_db_connections")
        .upsert(connectionsToSave)
    
    if (connErr) {
        logger.error(`Failed to save YouTube connections for project ${realProjectId}: ${connErr.message}`)
        throw new Error(`Database Error: ${connErr.message}`)
    }

    return okResponse({
        success: true,
        name: profile.name,
        email: profile.email,
        channels_connected: channels.length,
        message: `Successfully connected ${channels.length} YouTube channel(s).`
    })
}, {
    schema: YouTubeAuthSchema,
    requireAuth: false,
    requiredEnv: ["GOOGLE_CLIENT_ID", "GOOGLE_CLIENT_SECRET"]
})
