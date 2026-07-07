/**
 * pixel-ingest/index.ts
 * Inner G Complete Agency — Proprietary Pixel Ingestion Engine
 * 
 * ─────────────────────────────────────────────────────────
 * ⚠️ PUBLIC ENDPOINT: Does not require user authentication.
 * Relies on Project ID for attribution.
 * ─────────────────────────────────────────────────────────
 */

import { createHandler, z, okResponse, Logger } from "../_shared/lib/index.ts"

const PixelEventSchema = z.object({
    projectId: z.string().min(1, "Project ID is required"),
    visitorId: z.string().min(1, "Visitor ID is required"),
    event: z.string().default("page_view"),
    url: z.string().optional(),
    title: z.string().optional(),
    referrer: z.string().optional(),
    metadata: z.record(z.any()).optional()
})

export default createHandler(async ({ adminClient, body, req }) => {
    const logger = new Logger("pixel-ingest")

    // 1. Extract Metadata from Headers
    const headers = Object.fromEntries(req.headers.entries())
    const userAgent = headers["user-agent"]
    
    // Extract IP: x-forwarded-for can be a list, we only want the first one
    let ipAddress = headers["x-real-ip"] || headers["x-forwarded-for"]
    if (ipAddress && ipAddress.includes(",")) {
        ipAddress = ipAddress.split(",")[0].trim()
    }

    const country = headers["cf-ipcountry"]
    const city = headers["cf-ipcity"]

    logger.info(`Received pixel event: ${body.event} for project: ${body.projectId} | Visitor: ${body.visitorId}`)

    // -- BOT BLOCKLIST LOGIC --
    // Original patterns matched the one-time pixel_events cleanup DELETE,
    // but real traffic showed real gaps: "GoogleOther" (Google's secondary
    // crawler, confirmed via its 66.249.x.x IP range) and
    // "facebookexternalhit" (Facebook's link-preview fetcher) both slipped
    // through — neither contains "bot," "crawl," "spider," "headless," or
    // "lighthouse." Added those plus a few other common non-"bot"-named
    // crawlers/preview-fetchers as defensive coverage even though they
    // haven't shown up yet.
    const BOT_USER_AGENT_PATTERN = /bot|crawl|spider|headless|lighthouse|GoogleOther|Google-InspectionTool|Google-Safety|APIs-Google|bingpreview|facebookexternalhit|WhatsApp|Slack-ImgProxy|TelegramBot|Discordbot|Shap-User/i

    if (userAgent && BOT_USER_AGENT_PATTERN.test(userAgent)) {
        logger.info(`Blocked pixel ingestion for bot user agent: ${userAgent}`)
        return okResponse({ success: true, received: true, note: "Bot blocked" })
    }

    // -- DOMAIN BLOCKLIST LOGIC --
    const BLOCKED_DOMAINS = [
        "onlycrypto.io"
    ]

    try {
        const pageUrlStr = body.url || headers["referer"] || headers["origin"] || "";
        if (pageUrlStr) {
            const urlObj = new URL(pageUrlStr.startsWith('http') ? pageUrlStr : `https://${pageUrlStr}`);
            const hostname = urlObj.hostname.toLowerCase().replace(/^www\./, '');
            
            if (BLOCKED_DOMAINS.includes(hostname)) {
                logger.info(`Blocked pixel ingestion for blacklisted domain: ${hostname}`);
                return okResponse({ success: true, received: true, note: "Domain blocked" });
            }
        }
    } catch (e) {
        // Ignore URL parsing errors, proceed with ingestion
    }

    try {
        // 2. Extract Element Identification (Pluck from metadata)
        const elementName = body.metadata?.ig_click || body.metadata?.id || body.metadata?.text
        const elementType = body.metadata?.tag

        // 3. Insert Raw Event
        const { data: insertedEvent, error: eventError } = await adminClient
            .from("pixel_events")
            .insert({
                project_id: body.projectId,
                visitor_id: body.visitorId,
                event_name: body.event,
                page_url: body.url,
                page_title: body.title,
                referrer: body.referrer,
                user_agent: userAgent,
                ip_address: ipAddress,
                country: country,
                city: city,
                metadata: body.metadata || {},
                element_name: elementName,
                element_type: elementType
            })
            .select("id, created_at")
            .single()

        if (eventError) {
            logger.error(`Failed to insert pixel event: ${eventError.message}`)
            return okResponse({ success: false, code: "STORAGE_ERROR", message: eventError.message })
        }

        // 3b. Recompute page_leave's duration_seconds from server-recorded
        // timestamps instead of trusting the client's self-reported value.
        // The pixel script computes it as Date.now() minus its own
        // page-load timestamp, entirely client-side — but that origin
        // point can drift from when the matching page_view event actually
        // reached this server (network latency, keepalive queueing, etc.),
        // so a fast page_leave's duration_seconds could read meaningfully
        // higher than the real gap between the two rows' created_at values.
        // engagedUsers' 60-second threshold is the only thing that reads
        // this field, so making it match the server clock can only make
        // that check more reliable, never break it.
        if (body.event === "page_leave" && body.metadata?.session_id) {
            const { data: matchingPageView } = await adminClient
                .from("pixel_events")
                .select("created_at")
                .eq("visitor_id", body.visitorId)
                .eq("project_id", body.projectId)
                .eq("event_name", "page_view")
                .eq("page_url", body.url)
                .filter("metadata->>session_id", "eq", body.metadata.session_id)
                .lt("created_at", insertedEvent.created_at)
                .order("created_at", { ascending: false })
                .limit(1)
                .maybeSingle()

            if (matchingPageView) {
                const serverDurationSeconds = Math.round(
                    (new Date(insertedEvent.created_at).getTime() - new Date(matchingPageView.created_at).getTime()) / 1000
                )
                await adminClient
                    .from("pixel_events")
                    .update({ metadata: { ...(body.metadata || {}), duration_seconds: serverDurationSeconds } })
                    .eq("id", insertedEvent.id)
            }
            // No matching page_view found (rare — e.g. it failed to send) —
            // leave the client-reported duration_seconds as the fallback.
        }

        // 3. Upsert Visitor
        // This ensures the visitor exists and updates their profile information if provided.
        // Some inbound links carry an unresolved GoHighLevel merge field
        // (e.g. a campaign template's {{contact.id}} that never got
        // substituted before the link was sent or crawled) — treating that
        // literal placeholder text as real identity data pollutes this
        // table with garbage records (confirmed: 215 existing rows, ~4% of
        // the table, all with the exact literal email "ghl_{{contact.id}}").
        // Reject any identity field that still contains an unresolved
        // {{...}} template rather than storing it verbatim.
        const hasUnresolvedMergeField = (value: unknown) => typeof value === "string" && /\{\{.*\}\}/.test(value)
        const rawEmail = body.metadata?.email
        const rawFullName = body.metadata?.fullName || body.metadata?.name
        const cleanEmail = hasUnresolvedMergeField(rawEmail) ? undefined : rawEmail
        const cleanFullName = hasUnresolvedMergeField(rawFullName) ? undefined : rawFullName

        const { error: visitorError } = await adminClient
            .from("pixel_visitors")
            .upsert({
                visitor_id: body.visitorId,
                project_id: body.projectId,
                email: cleanEmail,
                full_name: cleanFullName,
                last_seen: new Date().toISOString()
            }, { 
                onConflict: "visitor_id, project_id" 
            })

        if (visitorError) {
            logger.error(`Failed to upsert visitor: ${visitorError.message}`)
        }

        return okResponse({ 
            success: true, 
            received: true 
        })

    } catch (err: any) {
        logger.error(`Pixel ingestion failed: ${err.message}`)
        return okResponse({ success: false, error: "Ingestion failed" })
    }
}, {
    schema: PixelEventSchema,
    requireAuth: false, // Public endpoint
    requiredEnv: ["SUPABASE_URL", "SUPABASE_SERVICE_ROLE_KEY"]
})
