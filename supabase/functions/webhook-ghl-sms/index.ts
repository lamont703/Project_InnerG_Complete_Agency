/**
 * webhook-ghl-sms/index.ts
 * Inner G Complete Agency — GHL Omnichannel AI Chat Integration
 * 
 * Auth:    Webhook endpoint (requireAuth: false)
 * Trigger: GHL Inbound Message (InboundMessage)
 * ─────────────────────────────────────────────────────────
 * Goal: Receives an SMS from GHL, triggers the AI Agent for the 
 * correct project, and sends the AI reply back via GHL SMS.
 */

import { createHandler, Logger, okResponse, GhlProvider, ChatService, AgencyChatService } from "../_shared/lib/index.ts"

export default createHandler(async ({ adminClient, body }) => {
    const logger = new Logger("webhook-ghl-sms")
    
    // 1. Resolve Payload (Support both GHL API v2 Webhooks & Workflow Automations)
    logger.info("Raw webhook body received", { body })
    
    const contactId = body.contactId || body.contact_id || body.contact?.id || (body.contact?.id_object)
    const locationId = body.locationId || body.location_id || body.location?.id
    
    // Automation payloads often send 'message' as a flat object or 'message_body'
    const userMessage = body.message?.body || body.message_body || body.body || body.message
    
    if (!contactId || !userMessage) {
        logger.warn("Incomplete GHL payload received", { contactId, hasUserMessage: !!userMessage, received: body })
        return okResponse({ status: "invalid_payload", received: { contactId, locationId } })
    }
    
    logger.info("Inbound messaging event detected", { contactId, locationId, body: typeof userMessage === 'string' ? userMessage.substring(0, 50) : "Complex Object" })

    const AGENCY_PROJECT_SENTINEL = "00000000-0000-0000-0000-000000000001"

    // 2. Resolve Project ID
    // Priority 1: Match specifically synced ghl_contacts
    const { data: contact } = await adminClient
        .from("ghl_contacts")
        .select("project_id")
        .eq("ghl_contact_id", contactId)
        .maybeSingle()
        
    let projectId = contact?.project_id
    
    // Priority 2: Fallback to the client's default project if locationId matches
    if (!projectId) {
        const { data: clientWithProject } = (await adminClient
            .from("clients")
            .select("id, projects(id)")
            .eq("ghl_location_id", locationId)
            .maybeSingle()) as any
            
        projectId = clientWithProject?.projects?.[0]?.id
    }

    // Priority 3: Agency Master Location Check
    // If we still don't have a project, check if this is the Agency's location
    if (!projectId) {
        const { data: agencyProfile } = await adminClient
            .from("agency_profile")
            .select("*")
            .single()
        
        // If the location matches the agency's master GHL location
        projectId = AGENCY_PROJECT_SENTINEL
    }
    
    if (!projectId) {
        logger.warn("Could not resolve project for GHL contact", { contactId, locationId })
        return okResponse({ status: "project_not_found" })
    }

    // 3. Resolve User ID (Attribution)
    // We attribute SMS chat activity to the project owner/primary user
    const { data: access } = await adminClient
        .from("project_user_access")
        .select("user_id")
        .eq("project_id", projectId)
        .limit(1)
        .maybeSingle()
        
    let userId = access?.user_id

    if (!userId) {
        // Fallback: search for first super_admin if no direct access found
        const { data: admin } = await adminClient
            .from("users")
            .select("id")
            .eq("role", "super_admin")
            .limit(1)
            .maybeSingle()
        
        userId = admin?.id
    }

    if (!userId) {
        logger.warn("No authorized users found to attribute messaging to", { projectId })
        return okResponse({ status: "no_attribution_user" })
    }

    // 4. Resolve/Resume Chat Session
    const { data: activeSession } = await adminClient
        .from("chat_sessions")
        .select("id")
        .eq("project_id", projectId)
        .contains("metadata", { source: "sms", contactId })
        .order("updated_at", { ascending: false })
        .limit(1)
        .maybeSingle()

    // 5. Initialize & Execute Appropriate Agent
    let aiReply = ""
    let sessionId: string | null = activeSession?.id || null

    if (projectId === AGENCY_PROJECT_SENTINEL) {
        logger.info("Triggering AGENCY intelligence agent")
        const service = new AgencyChatService(
            adminClient,
            logger,
            Deno.env.get("GEMINI_API_KEY")!
        )
        const result = await service.chat({
            message: userMessage,
            session_id: sessionId,
            userId: userId,
            metadata: { source: "sms", contactId, locationId }
        })
        aiReply = result.reply
        sessionId = result.session_id
    } else {
        logger.info("Triggering CLIENT growth assistant agent")
        const service = new ChatService(
            adminClient,
            logger,
            Deno.env.get("GEMINI_API_KEY")!
        )
        const result = await service.chat({
            project_id: projectId,
            message: userMessage,
            userId: userId,
            session_id: sessionId,
            metadata: { source: "sms", contactId, locationId }
        })
        aiReply = result.data.reply
        sessionId = result.data.session_id
    }
    
    // 6. Outbound: Reply via GHL SMS
    const ghl = new GhlProvider(Deno.env.get("GHL_API_KEY")!)
    await ghl.sendMessage({
        contactId,
        type: "SMS",
        message: aiReply
    })
    
    logger.info("SMS reply sent", { contactId, aiSessionId: sessionId })

    return okResponse({ 
        status: "success", 
        contactId,
        projectId,
        sessionId
    })
}, {
    requireAuth: false, // Called by GHL
    requiredEnv: ["SUPABASE_URL", "SUPABASE_SERVICE_ROLE_KEY", "GEMINI_API_KEY", "GHL_API_KEY"]
})
