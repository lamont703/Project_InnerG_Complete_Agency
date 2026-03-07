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
import { getCorsHeaders } from "../_shared/cors.ts"

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
    const cors = getCorsHeaders(req.headers.get("origin"))

    if (req.method === "OPTIONS") {
        return new Response("ok", { status: 200, headers: cors })
    }

    // DEBUG: Trace incoming headers (subset for security)
    console.log("[generate-invite-link] Request received:", {
        method: req.method,
        origin: req.headers.get("origin"),
        hasAuth: !!req.headers.get("authorization"),
        hasApiKey: !!req.headers.get("apikey"),
    })

    const authHeader = req.headers.get("Authorization") || req.headers.get("authorization") || req.headers.get("x-supabase-auth")
    const authJwt = authHeader?.replace(/^Bearer /i, "").trim()

    if (!authJwt) {
        console.warn("[generate-invite-link] Unauthorized: No JWT found in headers.")
        return new Response(
            JSON.stringify({ data: null, error: { code: "UNAUTHORIZED", message: "Missing JWT session." } }),
            { status: 401, headers: { ...cors, "Content-Type": "application/json" } }
        )
    }

    try {
        const body = await req.json()
        const { invited_email, intended_role, client_id } = body
        console.log("[generate-invite-link] Payload received:", { invited_email, intended_role, client_id })

        if (!invited_email || !intended_role) {
            return new Response(
                JSON.stringify({ data: null, error: { code: "VALIDATION_ERROR", message: "invited_email and intended_role are required." } }),
                { status: 400, headers: { ...cors, "Content-Type": "application/json" } }
            )
        }

        const supabaseAdmin = createClient(
            Deno.env.get("SUPABASE_URL")!,
            Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!,
            { auth: { persistSession: false } }
        )

        // Validate caller session using the token provided
        const { data: { user }, error: authError } = await supabaseAdmin.auth.getUser(authJwt)

        if (authError || !user) {
            console.error("[generate-invite-link] Session validation failed:", authError?.message)
            return new Response(
                JSON.stringify({
                    data: null,
                    error: {
                        code: "UNAUTHORIZED",
                        message: "Invalid session.",
                        debug: authError?.message || "User not found"
                    }
                }),
                { status: 401, headers: { ...cors, "Content-Type": "application/json" } }
            )
        }

        console.log("[generate-invite-link] Caller verified. ID:", user.id)

        // Get caller's internal role from the DB profile
        const { data: profile, error: profileErr } = await supabaseAdmin
            .from("users")
            .select("role")
            .eq("id", user.id)
            .single()

        if (profileErr || !profile) {
            console.error("[generate-invite-link] Could not fetch caller profile. User ID:", user.id)
            return new Response(
                JSON.stringify({ data: null, error: { code: "FORBIDDEN", message: "User profile not found in database." } }),
                { status: 403, headers: { ...cors, "Content-Type": "application/json" } }
            )
        }

        const callerRole = profile.role as string
        console.log("[generate-invite-link] Caller role identified:", callerRole)

        if (!["super_admin", "developer"].includes(callerRole)) {
            console.warn("[generate-invite-link] Forbidden: Role mismatch.", callerRole)
            return new Response(
                JSON.stringify({ data: null, error: { code: "FORBIDDEN", message: "Only super_admin or developer can generate invites." } }),
                { status: 403, headers: { ...cors, "Content-Type": "application/json" } }
            )
        }

        // Business rule B-19: developers can't invite super_admins or other developers
        if (callerRole === "developer" && ["super_admin", "developer"].includes(intended_role)) {
            return new Response(
                JSON.stringify({ data: null, error: { code: "FORBIDDEN", message: "Developers can only invite client users." } }),
                { status: 403, headers: { ...cors, "Content-Type": "application/json" } }
            )
        }

        // Generate token and insert invite link
        const token = await generateToken()
        const expiresAt = new Date(Date.now() + 7 * 24 * 60 * 60 * 1000).toISOString()

        const { error: insertError } = await supabaseAdmin
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
            { status: 200, headers: { ...cors, "Content-Type": "application/json" } }
        )
    } catch (err) {
        console.error("[generate-invite-link] Error:", err)
        return new Response(
            JSON.stringify({ data: null, error: { code: "SERVER_ERROR", message: String(err) } }),
            { status: 500, headers: { ...cors, "Content-Type": "application/json" } }
        )
    }
})
