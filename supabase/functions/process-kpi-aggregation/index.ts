/**
 * process-kpi-aggregation
 * Inner G Complete Agency — Client Intelligence Portal
 *
 * KPI Aggregation Engine: Connects to external client databases,
 * runs aggregation queries, and returns totals to be stored.
 *
 * This function is intended to be called by generate-daily-snapshot.
 * It uses the 'service_role' to access encrypted connection strings.
 */

import { serve } from "https://deno.land/std@0.177.0/http/server.ts"
import { createClient } from "https://esm.sh/@supabase/supabase-js@2"
import { corsHeaders } from "../_shared/cors.ts"
import postgres from "https://deno.land/x/postgresjs@v3.3.3/mod.js"

serve(async (req: Request) => {
    if (req.method === "OPTIONS") {
        return new Response(null, { headers: corsHeaders })
    }

    try {
        const { connection_id } = await req.json()

        if (!connection_id) {
            return new Response(
                JSON.stringify({ error: "connection_id is required" }),
                { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
            )
        }

        const supabase = createClient(
            Deno.env.get("SUPABASE_URL")!,
            Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!
        )

        // 1. Fetch connection details
        // Note: In a real production setup, we would use vault.decrypted_secrets or similar.
        // For this MVP, we assume connection_url_encrypted is readable by service role.
        const { data: conn, error: connError } = await supabase
            .from("client_db_connections")
            .select("*")
            .eq("id", connection_id)
            .single() as any

        if (connError || !conn) throw new Error("Connection not found or access denied")

        // 2. Identify DB Type and Execute Aggregation
        // For MVP, we implement the 'supabase' / 'postgres' handler.
        let result = { app_installs: 0, revenue: 0 }

        if (conn.db_type === "supabase" || conn.db_type === "postgres" || conn.db_type === "vercel_postgres") {
            const sql = postgres(conn.connection_url_encrypted)

            try {
                const config = conn.aggregation_config || {}
                const table = config.table || "users"
                const column = config.column || "id"

                // Example aggregation: Count rows in a table (e.g. total app users)
                // In production, config would contain the specific SQL snippet.
                const queryResult = await sql`
                    SELECT COUNT(${sql(column)})::int as total
                    FROM ${sql(table)}
                    WHERE created_at >= NOW() - INTERVAL '24 hours'
                `

                result.app_installs = queryResult[0]?.total || 0
                console.log(`[Aggregation] Success for ${conn.label}: ${result.app_installs} items found.`)

            } finally {
                await sql.end()
            }
        } else {
            // Placeholder for MySQL / Other
            console.warn(`[Aggregation] DB Type ${conn.db_type} not yet implemented.`)
        }

        // 3. Update connection metadata
        await supabase
            .from("client_db_connections")
            .update({ updated_at: new Date().toISOString() })
            .eq("id", connection_id)

        return new Response(
            JSON.stringify({ data: { result }, error: null }),
            { status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" } }
        )

    } catch (err) {
        console.error("[Aggregation] Engine Error:", err)
        return new Response(
            JSON.stringify({ data: null, error: { code: "AGGREGATION_FAILED", message: String(err) } }),
            { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
        )
    }
})
