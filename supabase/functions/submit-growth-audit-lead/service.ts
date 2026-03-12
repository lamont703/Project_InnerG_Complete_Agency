/**
 * submit-growth-audit-lead/service.ts
 * Inner G Complete Agency — Growth Audit Lead Submission Service
 *
 * ─────────────────────────────────────────────────────────
 * ⚠️  GUARDRAIL: This file ONLY contains business logic.
 * It must NOT handle CORS, authentication, or HTTP responses.
 * ─────────────────────────────────────────────────────────
 */

import { SupabaseClient } from "https://esm.sh/@supabase/supabase-js@2"
import { GhlProvider, Logger } from "../_shared/lib/index.ts"

export interface LeadInput {
    full_name: string
    email: string
    phone: string
    company_name: string
    challenge?: string
}

export interface LeadResult {
    lead_id: string
    ghl_synced: boolean
    ghl_contact_id: string | null
}

export class GrowthAuditService {
    constructor(
        private adminClient: SupabaseClient,
        private logger: Logger,
        private ghlApiKey: string | undefined,
        private ghlLocationId: string | undefined
    ) { }

    async submit(input: LeadInput): Promise<LeadResult> {
        const { full_name, email, phone, company_name, challenge } = input

        // 1. Save lead locally first (always succeeds regardless of GHL)
        const { data: lead, error: insertError } = await this.adminClient
            .from("growth_audit_leads")
            .insert({
                full_name,
                email,
                phone,
                company_name,
                challenge: challenge ?? null,
                status: "new",
                source: "website_cta"
            })
            .select("id")
            .single()

        if (insertError) throw insertError
        this.logger.info("Lead saved locally", { lead_id: lead.id })

        // 2. Push to GHL (best-effort — never blocks the submission)
        let ghlContactId: string | null = null

        if (this.ghlApiKey && this.ghlLocationId) {
            try {
                const ghl = new GhlProvider(this.ghlApiKey)
                const names = full_name.trim().split(" ")
                const firstName = names[0]
                const lastName = names.slice(1).join(" ") || "Lead"

                // Upsert contact in GHL (handles duplicates)
                const contact = await ghl.upsertContact({
                    firstName,
                    lastName,
                    email,
                    phone,
                    companyName: company_name,
                    locationId: this.ghlLocationId,
                    tags: ["website_lead", "growth_audit_requested"]
                })

                if (contact?.id) {
                    ghlContactId = contact.id

                    // Ensure tags are applied even on duplicate contacts
                    await ghl.addTags(contact.id, ["website_lead", "growth_audit_requested"])

                    // Update local record with GHL reference
                    await this.adminClient
                        .from("growth_audit_leads")
                        .update({ ghl_contact_id: ghlContactId })
                        .eq("id", lead.id)

                    this.logger.info("Lead synced to GHL", { ghl_contact_id: ghlContactId })
                }
            } catch (ghlErr) {
                // Non-fatal: log and continue — lead is already saved locally
                this.logger.error("GHL sync failed (non-fatal)", ghlErr)
            }
        } else {
            this.logger.warn("GHL credentials not configured — skipping sync")
        }

        return {
            lead_id: lead.id,
            ghl_synced: !!ghlContactId,
            ghl_contact_id: ghlContactId
        }
    }
}
