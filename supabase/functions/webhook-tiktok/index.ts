import { serve } from "https://deno.land/std@0.177.0/http/server.ts"
import { createClient } from "https://esm.sh/@supabase/supabase-js@2"
import { corsHeaders } from "../_shared/cors.ts"

/**
 * webhook-tiktok
 * Handles TikTok Webhook verification challenge and inbound events.
 */
serve(async (req: Request) => {
    // 1. CORS Preflight
    if (req.method === "OPTIONS") {
        return new Response("ok", { headers: corsHeaders })
    }

    const url = new URL(req.url);

    // 2. TikTok Verification Challenge (GET)
    // Reference: https://developers.tiktok.com/doc/webhook-v2-overview/
    if (req.method === "GET") {
        const verificationToken = url.searchParams.get("verification_token");
        if (verificationToken) {
            console.log("[TikTok Webhook] Verification Challenge Received:", verificationToken);
            return new Response(verificationToken, {
                status: 200,
                headers: { "Content-Type": "text/plain" }
            });
        }
        return new Response("Missing verification_token", { status: 400 });
    }

    // 3. Handle Webhook Events (POST)
    try {
        const body = await req.json();
        const event = body.event;
        const openId = body.user_openid;

        console.log(`[TikTok Webhook] Received event: ${event} for user: ${openId}`);

        if (event === "tiktok.ping") {
            return new Response(JSON.stringify({ message: "pong" }), {
                status: 200,
                headers: { ...corsHeaders, "Content-Type": "application/json" }
            });
        }

        // Initialize Supabase Admin
        const supabase = createClient(
            Deno.env.get("SUPABASE_URL")!,
            Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!
        );

        // Map events to sync triggers
        const syncEvents = ["video.publish.success", "video.list.update", "user.info.update"];
        
        if (syncEvents.includes(event)) {
            // 1. Find the project and connection for this TikTok User
            const { data: account, error: accError } = await supabase
                .from("tiktok_accounts")
                .select("project_id")
                .eq("tiktok_user_id", openId)
                .single();

            if (accError || !account) {
                console.warn(`[TikTok Webhook] No matching project found for OpenID: ${openId}`);
            } else {
                // 2. Find the TikTok connection for this project
                const { data: connection, error: connError } = await supabase
                    .from("client_db_connections")
                    .select("id")
                    .eq("project_id", account.project_id)
                    .eq("db_type", "tiktok")
                    .single();

                if (!connError && connection) {
                    console.log(`[TikTok Webhook] Triggering sync for connection: ${connection.id}`);
                    
                    // 3. Invoke connector-sync in the background
                    // We don't await this to keep the response to TikTok fast
                    fetch(`${Deno.env.get("SUPABASE_URL")}/functions/v1/connector-sync`, {
                        method: "POST",
                        headers: {
                            "Content-Type": "application/json",
                            "Authorization": `Bearer ${Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")}`
                        },
                        body: JSON.stringify({ connection_id: connection.id })
                    }).catch(err => console.error("[TikTok Webhook] Sync trigger failed:", err));
                }
            }
        }

        return new Response(JSON.stringify({ received: true }), {
            status: 200,
            headers: { ...corsHeaders, "Content-Type": "application/json" }
        });

    } catch (err) {
        console.error("[TikTok Webhook] Error:", err);
        return new Response(JSON.stringify({ error: String(err) }), {
            status: 500,
            headers: { ...corsHeaders, "Content-Type": "application/json" }
        });
    }
});
