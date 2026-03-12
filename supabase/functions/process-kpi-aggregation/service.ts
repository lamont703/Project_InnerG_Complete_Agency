/**
 * process-kpi-aggregation/service.ts
 * Inner G Complete Agency — KPI Aggregation Service
 *
 * ─────────────────────────────────────────────────────────
 * ⚠️  GUARDRAIL: This file ONLY contains business logic.
 * It must NOT handle CORS, authentication, or HTTP responses.
 * ─────────────────────────────────────────────────────────
 */

import { SupabaseClient } from "https://esm.sh/@supabase/supabase-js@2"
import { Logger } from "../_shared/lib/index.ts"

export interface AggregationResult {
    app_installs: number
    revenue: number
}

export class KpiAggregationService {
    constructor(private adminClient: SupabaseClient, private logger: Logger) { }

    async aggregate(connectionId: string): Promise<AggregationResult> {
        // 1. Fetch connection details
        const { data: conn, error: connError } = await this.adminClient
            .from("client_db_connections")
            .select("*")
            .eq("id", connectionId)
            .single() as any

        if (connError || !conn) throw new Error("Connection not found or access denied")

        this.logger.info(`Aggregating for connection: ${conn.label} (${conn.db_type})`)

        const result: AggregationResult = { app_installs: 0, revenue: 0 }

        if (conn.db_type === "supabase" || conn.db_type === "postgres" || conn.db_type === "vercel_postgres") {
            // Dynamic import to avoid loading postgres driver for non-postgres connections
            const { default: postgres } = await import("https://deno.land/x/postgresjs@v3.3.3/mod.js")
            const sql = postgres(conn.connection_url_encrypted)

            try {
                const config = conn.aggregation_config ?? {}
                const table = config.table ?? "users"
                const column = config.column ?? "id"

                const queryResult = await sql`
                    SELECT COUNT(${sql(column)})::int as total
                    FROM ${sql(table)}
                    WHERE created_at >= NOW() - INTERVAL '24 hours'
                `

                result.app_installs = queryResult[0]?.total ?? 0
                this.logger.info(`Aggregation complete: ${result.app_installs} items`)
            } finally {
                await sql.end()
            }
        } else {
            this.logger.warn(`DB type "${conn.db_type}" not yet implemented — returning zero values`)
        }

        // Update connection last-accessed metadata
        await this.adminClient
            .from("client_db_connections")
            .update({ updated_at: new Date().toISOString() })
            .eq("id", connectionId)

        return result
    }
}
