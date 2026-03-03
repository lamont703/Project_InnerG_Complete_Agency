/**
 * resolve-signal
 * Inner G Complete Agency — Client Intelligence Portal
 *
 * Marks an AI signal card as resolved when a user clicks its action button.
 *
 * Flow:
 *  1. Authenticate user via JWT
 *  2. Verify user has access to the project the signal belongs to
 *  3. Update ai_signals.is_resolved = TRUE, set resolved_by and resolved_at
 *  4. Insert an activity_log entry
 *  5. Return updated signal
 */

import { serve } from "https://deno.land/std@0.177.0/http/server.ts"
import { createClient } from "https://esm.sh/@supabase/supabase-js@2"
import { corsHeaders } from "../_shared/cors.ts"

serve(async (req: Request) => {
    if (req.method === "OPTIONS") {
        return new Response(null, { headers: corsHeaders })
    }

    const authHeader = req.headers.get("Authorization")
    if (!authHeader) {
        return new Response(
            JSON.stringify({ data: null, error: { code: "UNAUTHORIZED", message: "Missing Authorization header." } }),
            { status: 401, headers: { ...corsHeaders, "Content-Type": "application/json" } }
        )
    }

    try {
        const body = await req.json()
        const { signal_id, project_id } = body

        if (!signal_id || !project_id) {
            return new Response(
                JSON.stringify({ data: null, error: { code: "VALIDATION_ERROR", message: "signal_id and project_id are required." } }),
                { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
            )
        }

        const supabase = createClient(
            Deno.env.get("SUPABASE_URL")!,
            Deno.env.get("SUPABASE_ANON_KEY")!,
            { global: { headers: { Authorization: authHeader } } }
        )

        const { data: { user }, error: authError } = await supabase.auth.getUser()
        if (authError || !user) throw new Error("Unauthorized")

        // Update the signal (RLS ensures user has project access)
        const { data: signal, error: updateError } = await supabase
            .from("ai_signals")
            .update({
                is_resolved: true,
                resolved_by: user.id,
                resolved_at: new Date().toISOString(),
            })
            .eq("id", signal_id)
            .eq("project_id", project_id)
            .select("title")
            .single()

        if (updateError) throw updateError

        // Log activity
        await supabase
            .from("activity_log")
            .insert({
                project_id,
                action: `Signal resolved: ${signal?.title ?? "Unknown"}`,
                category: "ai",
                triggered_by: user.id,
            })

        return new Response(
            JSON.stringify({ data: { signal_id, resolved: true }, error: null }),
            { status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" } }
        )
    } catch (err) {
        console.error("[resolve-signal] Error:", err)
        return new Response(
            JSON.stringify({ data: null, error: { code: "SERVER_ERROR", message: String(err) } }),
            { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
        )
    }
})
