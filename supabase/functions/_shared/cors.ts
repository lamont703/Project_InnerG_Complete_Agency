/**
 * Shared CORS Headers for all Supabase Edge Functions
 * Inner G Complete Agency — Client Intelligence Portal
 *
 * Allows requests from:
 *  - localhost:3000 (local dev)
 *  - shearquery.com (production)
 *  - agency.innergcomplete.com (the previous domain)
 *  - staging.shearquery.com (preview, behind Deployment Protection)
 *
 * Deno, so this list cannot import lib/site.ts and does not follow SITE_HOST.
 * The old domain stays listed for as long as it resolves: it 301s to the new
 * one for page loads, but a redirect does not help a browser that has already
 * loaded a page from the old origin and is issuing an XHR — that request
 * carries the OLD Origin header and would fail CORS, in the browser, with
 * nothing in any server log. Remove it only once the old domain is retired.
 *
 * Import in every Edge Function:
 *   import { corsHeaders } from "../_shared/cors.ts"
 */

const ALLOWED_ORIGINS = [
    "http://localhost:3000",
    "https://shearquery.com",
    "https://agency.innergcomplete.com",
    "https://staging.shearquery.com",
]

export const corsHeaders = {
    "Access-Control-Allow-Origin": "*",
    "Access-Control-Allow-Methods": "GET, POST, PUT, DELETE, OPTIONS",
    "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type, x-supabase-auth, Authorization",
}

export function getCorsHeaders(origin: string | null): HeadersInit {
    const allowedOrigin =
        origin && ALLOWED_ORIGINS.includes(origin) ? origin : ALLOWED_ORIGINS[0]

    return {
        ...corsHeaders,
        "Access-Control-Allow-Origin": allowedOrigin,
    }
}
