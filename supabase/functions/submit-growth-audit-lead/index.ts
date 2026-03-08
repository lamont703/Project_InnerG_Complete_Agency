/**
 * submit-growth-audit-lead
 * Inner G Complete Agency — Client Intelligence Portal
 * 
 * UPGRADED TO GHL V2 (LeadConnector) with Duplicate Handling
 */

import { serve } from "https://deno.land/std@0.177.0/http/server.ts"
import { createClient } from "https://esm.sh/@supabase/supabase-js@2"
import { z } from "https://deno.land/x/zod@v3.22.4/mod.ts"
import { corsHeaders } from "../_shared/cors.ts"

// GHL V2 (LeadConnector) API URL
const GHL_API_V2_URL = "https://services.leadconnectorhq.com/contacts/"

const leadSchema = z.object({
    full_name: z.string().min(2, "Name is too short"),
    email: z.string().email("Invalid email address"),
    phone: z.string().min(10, "Phone number must be at least 10 digits"),
    company_name: z.string().min(1, "Company name is required"),
    challenge: z.string().optional(),
})

serve(async (req: Request) => {
    if (req.method === "OPTIONS") {
        return new Response(null, { headers: corsHeaders })
    }

    try {
        const body = await req.json()
        const result = leadSchema.safeParse(body)

        if (!result.success) {
            return new Response(
                JSON.stringify({
                    data: null,
                    error: {
                        code: "VALIDATION_ERROR",
                        message: "Invalid submission data",
                        details: result.error.flatten()
                    }
                }),
                { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
            )
        }

        const { full_name, email, phone, company_name, challenge } = result.data

        const supabase = createClient(
            Deno.env.get("SUPABASE_URL")!,
            Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!
        )

        // 1. Save locally
        const { data: lead, error: insertError } = await supabase
            .from("growth_audit_leads")
            .insert({
                full_name,
                email,
                phone,
                company_name,
                challenge,
                status: "new",
                source: "website_cta"
            })
            .select("id")
            .single()

        if (insertError) throw insertError

        // 2. Push to GHL V2
        const ghlToken = Deno.env.get("GHL_API_KEY")
        const locationId = Deno.env.get("GHL_LOCATION_ID")
        let ghl_contact_id = null
        let ghl_debug: any = {
            v2: true,
            locationIdConfigured: !!locationId
        }

        if (ghlToken && locationId) {
            try {
                const names = full_name.split(" ")
                const firstName = names[0]
                const lastName = names.slice(1).join(" ") || "Lead"

                // Step 1: Attempt to create contact
                const ghlRes = await fetch(GHL_API_V2_URL, {
                    method: "POST",
                    headers: {
                        "Authorization": `Bearer ${ghlToken}`,
                        "Content-Type": "application/json",
                        "Version": "2021-07-28"
                    },
                    body: JSON.stringify({
                        firstName,
                        lastName,
                        email,
                        phone,
                        companyName: company_name,
                        locationId,
                        tags: ["website_lead", "growth_audit_requested"]
                    })
                })

                let ghlData = await ghlRes.json()
                ghl_debug.createStatus = ghlRes.status
                ghl_debug.createResponse = ghlData

                let contactId = ghlData?.contact?.id

                // Handle Duplicates: Extract ID from conflict error
                if (ghlRes.status === 400 && ghlData?.message?.includes("duplicated")) {
                    contactId = ghlData?.meta?.contactId
                    ghl_debug.isDuplicate = true
                }

                if (contactId) {
                    ghl_contact_id = contactId

                    // Step 2: Ensure tags are applied (even for existing contacts)
                    const tagRes = await fetch(`${GHL_API_V2_URL}${contactId}/tags`, {
                        method: "POST",
                        headers: {
                            "Authorization": `Bearer ${ghlToken}`,
                            "Content-Type": "application/json",
                            "Version": "2021-07-28"
                        },
                        body: JSON.stringify({
                            tags: ["website_lead", "growth_audit_requested"]
                        })
                    })
                    ghl_debug.tagStatus = tagRes.status

                    // Update local lead
                    await supabase
                        .from("growth_audit_leads")
                        .update({ ghl_contact_id: contactId })
                        .eq("id", lead.id)
                }
            } catch (ghlErr) {
                ghl_debug.error = String(ghlErr)
            }
        }

        return new Response(
            JSON.stringify({
                data: {
                    lead_id: lead.id,
                    ghl_synced: !!ghl_contact_id,
                    debug: ghl_debug
                },
                error: null
            }),
            { status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" } }
        )

    } catch (err) {
        return new Response(
            JSON.stringify({
                data: null,
                error: {
                    code: "SERVER_ERROR",
                    message: String(err)
                }
            }),
            { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
        )
    }
})
