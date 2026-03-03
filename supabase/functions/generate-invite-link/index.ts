/**
 * generate-invite-link
 * Inner G Complete Agency — Client Intelligence Portal
 *
 * Generates a one-time, time-limited invite link for new user onboarding.
 *
 * Flow:
 *  1. Authenticate caller (must be super_admin or developer)
 *  2. Validate payload (invited_email, intended_role, optional client_id)
 *  3. Enforce business rules (B-19: developers can't invite super_admins)
 *  4. Generate secure random token (crypto.randomUUID → sha256)
 *  5. Insert record into invite_links table (7-day expiry)
 *  6. Return invite URL for the caller to share
 *
 * Auth: Requires valid JWT — super_admin or developer roles only
 * Share URL format: https://agency.innergcomplete.com/accept-invite?token=<token>
 */

import { serve } from "https://deno.land/std@0.177.0/http/server.ts"
import { createClient } from "https://esm.sh/@supabase/supabase-js@2"
import { corsHeaders } from "../_shared/cors.ts"

const SITE_URL = Deno.env.get("NEXT_PUBLIC_SITE_URL") ?? "https://agency.innergcomplete.com"

async function generateToken(): Promise<string> {
    const uuid = crypto.randomUUID()
    const encoder = new TextEncoder()
    const data = encoder.encode(uuid)
    const hashBuffer = await crypto.subtle.digest("SHA-256", data)
    const hashArray = Array.from(new Uint8Array(hashBuffer))
    return hashArray.map(b => b.toString(16).padStart(2, "0")).join("")
}

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
        const { invited_email, intended_role, client_id } = body

        if (!invited_email || !intended_role) {
            return new Response(
                JSON.stringify({ data: null, error: { code: "VALIDATION_ERROR", message: "invited_email and intended_role are required." } }),
                { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
            )
        }

        const supabase = createClient(
            Deno.env.get("SUPABASE_URL")!,
            Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!
        )

        // Get caller's user record and role
        const userClient = createClient(
            Deno.env.get("SUPABASE_URL")!,
            Deno.env.get("SUPABASE_ANON_KEY")!,
            { global: { headers: { Authorization: authHeader } } }
        )
        const { data: { user } } = await userClient.auth.getUser()
        if (!user) throw new Error("Unauthorized")

        const { data: callerProfile } = await supabase
            .from("users")
            .select("role")
            .eq("id", user.id)
            .single()

        const callerRole = callerProfile?.role
        if (!["super_admin", "developer"].includes(callerRole)) {
            return new Response(
                JSON.stringify({ data: null, error: { code: "FORBIDDEN", message: "Only super_admin or developer can generate invite links." } }),
                { status: 403, headers: { ...corsHeaders, "Content-Type": "application/json" } }
            )
        }

        // Business rule B-19: developers can't invite super_admins or other developers
        if (callerRole === "developer" && ["super_admin", "developer"].includes(intended_role)) {
            return new Response(
                JSON.stringify({ data: null, error: { code: "FORBIDDEN", message: "Developers can only invite client users." } }),
                { status: 403, headers: { ...corsHeaders, "Content-Type": "application/json" } }
            )
        }

        // Generate token and insert invite link
        const token = await generateToken()
        const expiresAt = new Date(Date.now() + 7 * 24 * 60 * 60 * 1000).toISOString()

        const { error: insertError } = await supabase
            .from("invite_links")
            .insert({
                token,
                invited_email,
                intended_role,
                invited_by: user.id,
                client_id: client_id ?? null,
                expires_at: expiresAt,
                is_active: true,
            })

        if (insertError) throw insertError

        const inviteUrl = `${SITE_URL}/accept-invite?token=${token}`

        return new Response(
            JSON.stringify({ data: { invite_url: inviteUrl, expires_at: expiresAt }, error: null }),
            { status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" } }
        )
    } catch (err) {
        console.error("[generate-invite-link] Error:", err)
        return new Response(
            JSON.stringify({ data: null, error: { code: "SERVER_ERROR", message: String(err) } }),
            { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
        )
    }
})
