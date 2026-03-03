/**
 * Shared CORS Headers for all Supabase Edge Functions
 * Inner G Complete Agency — Client Intelligence Portal
 *
 * Allows requests from:
 *  - localhost:3000 (local dev)
 *  - agency.innergcomplete.com (production)
 *
 * Import in every Edge Function:
 *   import { corsHeaders } from "../_shared/cors.ts"
 */

const ALLOWED_ORIGINS = [
    "http://localhost:3000",
    "https://agency.innergcomplete.com",
]

export function getCorsHeaders(origin: string | null): HeadersInit {
    const allowedOrigin =
        origin && ALLOWED_ORIGINS.includes(origin) ? origin : ALLOWED_ORIGINS[0]

    return {
        "Access-Control-Allow-Origin": allowedOrigin,
        "Access-Control-Allow-Methods": "GET, POST, OPTIONS",
        "Access-Control-Allow-Headers":
            "authorization, x-client-info, apikey, content-type",
        "Access-Control-Max-Age": "86400",
    }
}

/** Default CORS headers for non-browser contexts or when origin is unknown */
export const corsHeaders: HeadersInit = {
    "Access-Control-Allow-Origin": "*",
    "Access-Control-Allow-Methods": "GET, POST, OPTIONS",
    "Access-Control-Allow-Headers":
        "authorization, x-client-info, apikey, content-type",
}
