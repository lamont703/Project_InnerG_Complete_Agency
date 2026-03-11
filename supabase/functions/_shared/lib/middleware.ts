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
import { corsPreflightResponse, serverErrorResponse, unauthorizedResponse, forbiddenResponse } from "./response.ts"
import { getAuthenticatedUser, createAdminClient, AuthUser, verifyRole } from "./auth.ts"
import { validateEnv, EnvKey } from "./env.ts"

export interface FunctionContext {
    req: Request
    adminClient: SupabaseClient
    user: AuthUser | null
}

export interface HandlerConfig {
    /** Required environment variables to check before running */
    requiredEnv?: readonly EnvKey[]
    /** Roles allowed to call this function. If omitted, no auth check is performed. */
    allowedRoles?: string[]
    /** Whether to require a valid user session. Defaults to false. */
    requireAuth?: boolean
}

type FunctionHandler = (context: FunctionContext) => Promise<Response>

/**
 * The standard orchestrator for all Edge Functions.
 * Handles CORS, Auth, Env Validation, and Error Catching.
 */
export function createHandler(handler: FunctionHandler, config: HandlerConfig = {}) {
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
            const authHeader = req.headers.get("Authorization")

            let userResult = null
            if (authHeader || config.requireAuth) {
                userResult = await getAuthenticatedUser(authHeader, adminClient)

                if (config.requireAuth && userResult.error) {
                    return unauthorizedResponse(userResult.error)
                }
            }

            // 4. Role Check
            if (config.allowedRoles && userResult?.user) {
                if (!verifyRole(userResult.user.role, config.allowedRoles)) {
                    return forbiddenResponse(`Role ${userResult.user.role} is not permitted to call this function.`)
                }
            }

            // 5. Execute Core Logic
            return await handler({
                req,
                adminClient,
                user: userResult?.user || null
            })

        } catch (err) {
            console.error(`[Edge Function Error]:`, err)
            return serverErrorResponse(err)
        }
    })
}
