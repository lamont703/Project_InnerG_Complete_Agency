/**
 * submit-growth-audit-lead/index.ts
 * Inner G Complete Agency — Growth Audit Lead Submission Handler
 *
 * Auth:    Public (no JWT — this is called from the marketing website)
 * Trigger: HTTP POST from free-ebook or growth audit CTA forms
 */

import { createHandler, z, Logger, okResponse } from "../_shared/lib/index.ts"
import { GrowthAuditService } from "./service.ts"

const LeadSchema = z.object({
    full_name: z.string().min(2, "Name is too short"),
    email: z.string().email("Invalid email address"),
    phone: z.string().min(10, "Phone number must be at least 10 digits"),
    company_name: z.string().min(1, "Company name is required"),
    challenge: z.string().optional()
})

export default createHandler(async ({ adminClient, body }) => {
    const logger = new Logger("submit-growth-audit-lead")

    const service = new GrowthAuditService(
        adminClient,
        logger,
        Deno.env.get("GHL_API_KEY"),
        Deno.env.get("GHL_LOCATION_ID")
    )

    logger.info("Received lead submission", { email: body.email })

    const result = await service.submit(body)

    return okResponse(result)
}, {
    schema: LeadSchema,
    requiredEnv: ["SUPABASE_URL", "SUPABASE_SERVICE_ROLE_KEY"]
})
