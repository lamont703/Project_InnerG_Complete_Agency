/**
 * _shared/lib/env.ts
 * Inner G Complete Agency — Environment Variable Guard
 *
 * ─────────────────────────────────────────────────────────
 * ⚠️  GUARDRAIL: All Edge Functions MUST use this to access
 * environment variables. Do NOT use Deno.env.get() directly
 * in feature logic. This prevents "undefined" crashes.
 * ─────────────────────────────────────────────────────────
 */

export const REQUIRED_SYSTEM_CONFIG = [
    "SUPABASE_URL",
    "SUPABASE_ANON_KEY",
    "SUPABASE_SERVICE_ROLE_KEY"
] as const;

export const REQUIRED_AI_CONFIG = [
    "GEMINI_API_KEY"
] as const;

export const REQUIRED_GHL_CONFIG = [
    "GHL_API_KEY",
    "GHL_LOCATION_ID"
] as const;

export type EnvKey = string;

/**
 * Validates that all provided keys exist in the environment.
 * Throws a detailed error if any keys are missing.
 */
export function validateEnv(keys: readonly EnvKey[]): void {
    const missing: string[] = [];

    for (const key of keys) {
        if (!Deno.env.get(key)) {
            missing.push(key);
        }
    }

    if (missing.length > 0) {
        throw new Error(`MISSING_ENV_VARS: The following required environment variables are not set: ${missing.join(", ")}`);
    }
}

/**
 * Safely gets an environment variable, throwing if it's missing.
 */
export function getEnv(key: EnvKey): string {
    const value = Deno.env.get(key);
    if (!value) {
        throw new Error(`MISSING_ENV_VAR: ${key} is not set.`);
    }
    return value;
}
