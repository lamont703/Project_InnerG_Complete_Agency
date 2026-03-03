/**
 * complete-invite
 * Inner G Complete Agency — Client Intelligence Portal
 *
 * Finalizes account creation for an invited user.
 * Creates the user in Supabase Auth and links them to the invitation.
 */

import { serve } from "https://deno.land/std@0.177.0/http/server.ts"
import { createClient } from "https://esm.sh/@supabase/supabase-js@2"
import { corsHeaders } from "../_shared/cors.ts"

serve(async (req: Request) => {
    if (req.method === "OPTIONS") {
        return new Response(null, { headers: corsHeaders })
    }

    try {
        const { token, password, full_name } = await req.json()

        if (!token || !password || !full_name) {
            return new Response(
                JSON.stringify({ data: null, error: { code: "VALIDATION_ERROR", message: "token, password, and full_name are required." } }),
                { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
            )
        }

        const supabase = createClient(
            Deno.env.get("SUPABASE_URL")!,
            Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!
        )

        // 1. Validate invite
        const { data: invite, error: fetchError } = await supabase
            .from("invite_links")
            .select("invited_email, intended_role, used_at, expires_at, is_active, client_id")
            .eq("token", token)
            .single()

        if (fetchError || !invite || invite.used_at || !invite.is_active || new Date(invite.expires_at) < new Date()) {
            return new Response(
                JSON.stringify({ data: null, error: { code: "INVALID_TOKEN", message: "Invite link is invalid or expired." } }),
                { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
            )
        }

        // 2. Create the user in Auth
        const { data: authUser, error: authError } = await supabase.auth.admin.createUser({
            email: invite.invited_email,
            password: password,
            email_confirm: true,
            user_metadata: {
                role: invite.intended_role,
                full_name: full_name
            }
        })

        if (authError) {
            // Check if user already exists
            if (authError.message.includes("already has been registered")) {
                return new Response(
                    JSON.stringify({ data: null, error: { code: "ALREADY_REGISTERED", message: "This email is already registered. Please log in." } }),
                    { status: 409, headers: { ...corsHeaders, "Content-Type": "application/json" } }
                )
            }
            throw authError
        }

        // 3. Update invite link as used
        await supabase
            .from("invite_links")
            .update({ used_at: new Date().toISOString(), is_active: false })
            .eq("token", token)

        // 4. Update the user profile in public.users if the trigger didn't catch it (triggers usually do, but let's be safe)
        // The handle_new_user trigger in migration 002 should handle this automatically.

        // 5. If this was a client invite, we might need to grant project access here 
        // depending on how the business logic for project_user_access is shaped.
        // For now, the user exists and can log in.

        return new Response(
            JSON.stringify({ data: { user_id: authUser.user.id }, error: null }),
            { status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" } }
        )
    } catch (err) {
        console.error("[complete-invite] Error:", err)
        return new Response(
            JSON.stringify({ data: null, error: { code: "SERVER_ERROR", message: String(err) } }),
            { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
        )
    }
})
