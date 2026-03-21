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
    try {
        // 2. Extract Element Identification (Pluck from metadata)
        const elementName = body.metadata?.ig_click || body.metadata?.id || body.metadata?.text
        const elementType = body.metadata?.tag

        // 3. Insert Raw Event
        const { error: eventError } = await adminClient
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

        if (eventError) {
            logger.error(`Failed to insert pixel event: ${eventError.message}`)
            return okResponse({ success: false, code: "STORAGE_ERROR", message: eventError.message })
        }

        // 3. Upsert Visitor
        // This ensures the visitor exists and updates their profile information if provided
        const { error: visitorError } = await adminClient
            .from("pixel_visitors")
            .upsert({
                visitor_id: body.visitorId,
                project_id: body.projectId,
                email: body.metadata?.email,
                full_name: body.metadata?.fullName || body.metadata?.name,
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
