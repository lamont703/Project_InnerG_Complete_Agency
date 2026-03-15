/**
 * discover-external-tables/service.ts
 * Inner G Complete Agency — Discovery Service
 *
 * ─────────────────────────────────────────────────────────
 * ⚠️  GUARDRAIL: This file ONLY contains business logic.
 * It must NOT handle CORS, authentication, or HTTP responses.
 * ─────────────────────────────────────────────────────────
 */

import { SupabaseClient } from "https://esm.sh/@supabase/supabase-js@2"
import { Logger } from "../_shared/lib/index.ts"

export interface DiscoveryResult {
    success: boolean
    tables: string[]
    error?: string
}

export class DiscoverService {
    constructor(private adminClient: SupabaseClient, private logger: Logger) {}

    async discover(provider: string, config: Record<string, any>): Promise<DiscoveryResult> {
        this.logger.info("Discovering tables for provider", { provider })

        try {
            switch (provider) {
                case "supabase":
                    return await this.discoverSupabase(config)
                default:
                    return { success: false, tables: [], error: `Provider "${provider}" not implemented for discovery` }
            }
        } catch (err) {
            this.logger.error("Discovery failed", err)
            return { success: false, tables: [], error: String(err) }
        }
    }

    private async discoverSupabase(config: Record<string, any>): Promise<DiscoveryResult> {
        const { supabase_url, supabase_service_role_key } = config

        if (!supabase_url || !supabase_service_role_key) {
            return { success: false, tables: [], error: "Missing Supabase URL or Service Role Key" }
        }

        try {
            // PostgREST root returns OpenAPI spec including tables
            const restUrl = `${supabase_url.replace(/\/$/, "")}/rest/v1/`
            const response = await fetch(restUrl, {
                headers: {
                    "apikey": supabase_service_role_key,
                    "Authorization": `Bearer ${supabase_service_role_key}`
                }
            })

            if (!response.ok) {
                const text = await response.text()
                this.logger.error("Supabase REST call failed", { status: response.status, text })
                return { success: false, tables: [], error: `Failed to connect to Supabase: ${response.statusText}` }
            }

            const spec = await response.json()
            
            // In Swagger 2.0 (standard for PostgREST root), definitions contains the tables/views
            const tables = spec.definitions ? Object.keys(spec.definitions) : []
            
            // Filter out system tables if any show up, although PostgREST usually only shows public schema
            const publicTables = tables.filter(t => !t.startsWith("_"))

            return {
                success: true,
                tables: publicTables.sort()
            }
        } catch (err: any) {
            this.logger.error("Supabase discovery error", err)
            throw new Error(`Connection failed: ${err.message}`)
        }
    }
}
