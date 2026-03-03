/**
 * submit-growth-audit-lead
 * Inner G Complete Agency — Client Intelligence Portal
 *
 * Handles contact form submissions from the marketing landing page.
 *
 * Flow:
 *  1. Validate request body against Zod schema
 *  2. Insert lead into growth_audit_leads table
 *  3. Push contact to GHL via REST API
 *  4. Log activity entry
 *  5. Return success
 *
 * Invoked via: supabase.functions.invoke("submit-growth-audit-lead", { body: payload })
 * Auth: Public (no JWT required — marketing form is unauthenticated)
 *
 * TODO: Wire frontend cta-section.tsx to invoke this function (T-06)
 */

import { serve } from "https://deno.land/std@0.177.0/http/server.ts"
import { createClient } from "https://esm.sh/@supabase/supabase-js@2"
import { corsHeaders } from "../_shared/cors.ts"

const GHL_API_URL = "https://rest.gohighlevel.com/v1"

serve(async (req: Request) => {
    // Handle CORS preflight
    if (req.method === "OPTIONS") {
        return new Response(null, { headers: corsHeaders })
    }

    try {
        const body = await req.json()

        // TODO: Add Zod validation
        const { full_name, email, company_name, challenge } = body

        if (!full_name || !email || !company_name) {
            return new Response(
                JSON.stringify({ data: null, error: { code: "VALIDATION_ERROR", message: "full_name, email, and company_name are required." } }),
                { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
            )
        }

        // Initialize admin Supabase client (bypasses RLS for lead insert)
        const supabase = createClient(
            Deno.env.get("SUPABASE_URL")!,
            Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!
        )

        // 1. Insert lead into DB
        const { data: lead, error: insertError } = await supabase
            .from("growth_audit_leads")
            .insert({ full_name, email, company_name, challenge, status: "new" })
            .select("id")
            .single()

        if (insertError) throw insertError

        // 2. Push to GHL
        // TODO: Implement GHL contact create/upsert
        // const ghlRes = await fetch(`${GHL_API_URL}/contacts`, { ... })

        return new Response(
            JSON.stringify({ data: { lead_id: lead.id }, error: null }),
            { status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" } }
        )
    } catch (err) {
        console.error("[submit-growth-audit-lead] Error:", err)
        return new Response(
            JSON.stringify({ data: null, error: { code: "SERVER_ERROR", message: "Internal server error." } }),
            { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
        )
    }
})
