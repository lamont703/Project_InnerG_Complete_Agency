/**
 * _shared/lib/middleware.ts
 * Inner G Complete Agency — Edge Function Middleware
 *
 * ─────────────────────────────────────────────────────────
 * ⚠️  GUARDRAIL: This is the ONLY file that should handle
 * top-level try/catch, CORS headers, and Auth initialization.
 * index.ts should ONLY describe the "Configuration" for
 * the function and provide the core logic.
 * ─────────────────────────────────────────────────────────
 */

import { serve } from "https://deno.land/std@0.177.0/http/server.ts"
import { SupabaseClient } from "https://esm.sh/@supabase/supabase-js@2"
import { z } from "https://deno.land/x/zod@v3.21.4/mod.ts"
import { corsPreflightResponse, serverErrorResponse, unauthorizedResponse, forbiddenResponse, validationErrorResponse } from "./response.ts"
import { getAuthenticatedUser, createAdminClient, AuthUser, verifyRole } from "./auth.ts"
import { validateEnv, EnvKey } from "./env.ts"

export interface FunctionContext<T = any> {
    req: Request
    adminClient: SupabaseClient
    user: AuthUser | null
    body: T
}

export interface HandlerConfig<T extends z.ZodTypeAny = any> {
    /** Required environment variables to check before running */
    requiredEnv?: readonly EnvKey[]
    /** Roles allowed to call this function. If omitted, no auth check is performed. */
    allowedRoles?: string[]
    /** Whether to require a valid user session. Defaults to false. */
    requireAuth?: boolean
    /** Optional Zod schema to validate the request body */
    schema?: T
}

/**
 * The standard orchestrator for all Edge Functions.
 * Handles CORS, Auth, Env Validation, and Error Catching.
 */
export function createHandler<T extends z.ZodTypeAny = any>(
    handler: (context: FunctionContext<z.infer<T>>) => Promise<Response>,
    config: HandlerConfig<T> = {}
) {
    return serve(async (req: Request) => {
        // 1. Standard CORS Preflight
        if (req.method === "OPTIONS") {
            return corsPreflightResponse()
        }

        try {
            // 2. Validate Environment
            if (config.requiredEnv) {
                validateEnv(config.requiredEnv)
            }

            // 3. Initialize Shared Infrastructure
            const adminClient = createAdminClient()
            
            // Log ALL headers to see what's really happening
            console.log(`[Middleware] Full Headers: ${JSON.stringify(Object.fromEntries(req.headers.entries()))}`)
            
            const authHeader = req.headers.get("Authorization") || req.headers.get("authorization")
            console.log(`[Middleware] Auth Header: ${authHeader ? 'FOUND' : 'MISSING'} (requireAuth: ${config.requireAuth})`)

            let userResult = null
            if (authHeader || config.requireAuth) {
                userResult = await getAuthenticatedUser(authHeader, adminClient)

                if (config.requireAuth && userResult.error) {
                    console.error(`[Middleware] REJECTING request due to auth error: ${userResult.error}`)
                    return unauthorizedResponse(`InnerG_Auth_Error: ${userResult.error}`)
                }
            }

            // 4. Role Check
            if (config.allowedRoles && userResult?.user) {
                if (!verifyRole(userResult.user.role, config.allowedRoles)) {
                    return forbiddenResponse(`Role ${userResult.user.role} is not permitted to call this function.`)
                }
            }

            // 5. Body Parsing & Validation
            let body: any = {}
            if (req.method !== "GET" && req.method !== "HEAD") {
                try {
                    body = await req.json()
                } catch {
                    // Fallback to empty object if no body or malformed JSON
                }

                if (config.schema) {
                    const validation = config.schema.safeParse(body)
                    if (!validation.success) {
                        return validationErrorResponse("Invalid request body.", validation.error.format())
                    }
                    body = validation.data
                }
            }

            // 6. Execute Core Logic
            return await handler({
                req,
                adminClient,
                user: userResult?.user || null,
                body
            })

        } catch (err) {
            console.error(`[Edge Function Error]:`, err)
            return serverErrorResponse(err)
        }
    })
}
