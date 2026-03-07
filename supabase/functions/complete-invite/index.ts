/**
 * complete-invite
 * Inner G Complete Agency — Client Intelligence Portal
 *
 * Finalizes account creation for an invited user.
 * Creates the user in Supabase Auth and links them to the invitation.
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
        const { token, password, full_name } = await req.json()

        if (!token || !password || !full_name) {
            return new Response(
                JSON.stringify({ data: null, error: { code: "VALIDATION_ERROR", message: "token, password, and full_name are required." } }),
                { status: 400, headers: { ...cors, "Content-Type": "application/json" } }
            )
        }

        const supabase = createClient(
            Deno.env.get("SUPABASE_URL")!,
            Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!
        )

        // 1. Validate invite
        const { data: invite, error: fetchError } = await supabase
            .from("invite_links")
            .select("invited_email, intended_role, used_at, expires_at, is_active, client_id, invited_by")
            .eq("token", token)
            .single()

        if (fetchError || !invite || invite.used_at || !invite.is_active || new Date(invite.expires_at) < new Date()) {
            return new Response(
                JSON.stringify({ data: null, error: { code: "INVALID_TOKEN", message: "Invite link is invalid or expired." } }),
                { status: 400, headers: { ...cors, "Content-Type": "application/json" } }
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
                    { status: 409, headers: { ...cors, "Content-Type": "application/json" } }
                )
            }
            throw authError
        }

        // 3. Update invite link as used
        await supabase
            .from("invite_links")
            .update({ used_at: new Date().toISOString(), is_active: false })
            .eq("token", token)

        // 4. Update the user profile in public.users if the trigger didn't catch it
        // The handle_new_user trigger in migration 002 handles the initial profile creation.

        // 5. Grant Access based on role
        if (invite.client_id) {
            if (invite.intended_role === "developer") {
                // Developers get access to the entire client dashboard portfolio
                await supabase
                    .from("developer_client_access")
                    .insert({
                        developer_id: authUser.user.id,
                        client_id: invite.client_id,
                        assigned_by: invite.invited_by
                    })
            } else {
                // Client users get access to all current projects for that client
                const { data: projects } = await supabase
                    .from("projects")
                    .select("id")
                    .eq("client_id", invite.client_id)

                if (projects && projects.length > 0) {
                    const accessEntries = projects.map(p => ({
                        project_id: p.id,
                        user_id: authUser.user.id,
                        granted_by: invite.invited_by
                    }))

                    await supabase
                        .from("project_user_access")
                        .insert(accessEntries)
                }
            }
        }

        return new Response(
            JSON.stringify({ data: { user_id: authUser.user.id }, error: null }),
            { status: 200, headers: { ...cors, "Content-Type": "application/json" } }
        )
    } catch (err) {
        console.error("[complete-invite] Error:", err)
        return new Response(
            JSON.stringify({ data: null, error: { code: "SERVER_ERROR", message: String(err) } }),
            { status: 500, headers: { ...cors, "Content-Type": "application/json" } }
        )
    }
})
