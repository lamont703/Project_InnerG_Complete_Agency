/**
 * validate-invite
 * Inner G Complete Agency — Client Intelligence Portal
 *
 * Validates a one-time invite token before allowing account creation.
 * Returns the email and role associated with the invite.
 */

import { serve } from "https://deno.land/std@0.177.0/http/server.ts"
import { createClient } from "https://esm.sh/@supabase/supabase-js@2"
import { getCorsHeaders } from "../_shared/cors.ts"

serve(async (req: Request) => {
    const cors = getCorsHeaders(req.headers.get("origin"))

    if (req.method === "OPTIONS") {
        return new Response("ok", { status: 200, headers: cors })
    }

    try {
        const { token } = await req.json()

        if (!token) {
            return new Response(
                JSON.stringify({ data: null, error: { code: "VALIDATION_ERROR", message: "token is required." } }),
                { status: 400, headers: { ...cors, "Content-Type": "application/json" } }
            )
        }

        const supabase = createClient(
            Deno.env.get("SUPABASE_URL")!,
            Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!
        )

        // Lookup valid invite
        const { data: invite, error: fetchError } = await supabase
            .from("invite_links")
            .select("invited_email, intended_role, used_at, expires_at, is_active")
            .eq("token", token)
            .single()

        if (fetchError || !invite) {
            return new Response(
                JSON.stringify({ data: null, error: { code: "NOT_FOUND", message: "Invalid invite link." } }),
                { status: 404, headers: { ...cors, "Content-Type": "application/json" } }
            )
        }

        // Check expiry
        if (new Date(invite.expires_at) < new Date()) {
            return new Response(
                JSON.stringify({ data: null, error: { code: "EXPIRED", message: "Invite link has expired." } }),
                { status: 410, headers: { ...cors, "Content-Type": "application/json" } }
            )
        }

        // Check if already used
        if (invite.used_at || !invite.is_active) {
            return new Response(
                JSON.stringify({ data: null, error: { code: "USED", message: "Invite link has already been used." } }),
                { status: 410, headers: { ...cors, "Content-Type": "application/json" } }
            )
        }

        return new Response(
            JSON.stringify({
                data: {
                    email: invite.invited_email,
                    role: invite.intended_role
                },
                error: null
            }),
            { status: 200, headers: { ...cors, "Content-Type": "application/json" } }
        )
    } catch (err) {
        console.error("[validate-invite] Error:", err)
        return new Response(
            JSON.stringify({ data: null, error: { code: "SERVER_ERROR", message: String(err) } }),
            { status: 500, headers: { ...cors, "Content-Type": "application/json" } }
        )
    }
})
