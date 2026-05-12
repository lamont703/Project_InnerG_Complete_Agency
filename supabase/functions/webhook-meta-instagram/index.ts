import { serve } from "https://deno.land/std@0.177.0/http/server.ts"
import { corsHeaders } from "../_shared/cors.ts"

/**
 * webhook-meta-instagram
 * Handles Meta/Instagram Webhook verification challenge and inbound events.
 */
serve(async (req: Request) => {
    // 1. CORS Preflight
    if (req.method === "OPTIONS") {
        return new Response("ok", { headers: corsHeaders })
    }

    const url = new URL(req.url);

    // 2. Meta Verification Handshake (GET)
    // Reference: https://developers.facebook.com/docs/graph-api/webhooks/getting-started
    if (req.method === "GET") {
        const mode = url.searchParams.get("hub.mode");
        const token = url.searchParams.get("hub.verify_token");
        const challenge = url.searchParams.get("hub.challenge");

        const VERIFY_TOKEN = "innerg_meta_secure_v1"; 

        if (mode && token) {
            if (mode === "subscribe" && token === VERIFY_TOKEN) {
                console.log("[Meta Webhook] Verification Successful.");
                return new Response(challenge, { status: 200 });
            } else {
                console.warn("[Meta Webhook] Verification Failed: Tokens do not match.");
                return new Response("Forbidden", { status: 403 });
            }
        }
        return new Response("Bad Request", { status: 400 });
    }

    // 3. Handle Inbound Meta Events (POST)
    try {
        const body = await req.json();
        console.log(`[Meta Webhook] Received event:`, JSON.stringify(body, null, 2));

        // Logic for processing IG Mentions, Messages, or Comments goes here
        // We'll wire this to our intelligence engine next

        return new Response(JSON.stringify({ success: true }), {
            status: 200,
            headers: { ...corsHeaders, "Content-Type": "application/json" }
        });

    } catch (err) {
        console.error("[Meta Webhook] Error processing event:", err);
        return new Response(JSON.stringify({ error: String(err) }), {
            status: 500,
            headers: { ...corsHeaders, "Content-Type": "application/json" }
        });
    }
});
