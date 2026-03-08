/**
 * connector-sync
 * Inner G Complete Agency — Client Intelligence Portal
 *
 * Generic connector sync handler. Reads the connector type and provider
 * from client_db_connections, then dispatches to the appropriate sync handler.
 *
 * Supported providers:
 *  - supabase: Connects to an external Supabase project via REST API
 *  - ghl:      Connects to GoHighLevel CRM via API
 *
 * Invocation: POST { connection_id: UUID }
 * Auth: Service role key (system job) or Super Admin user
 */

import { serve } from "https://deno.land/std@0.177.0/http/server.ts"
import { createClient } from "https://esm.sh/@supabase/supabase-js@2"
import { corsHeaders } from "../_shared/cors.ts"

serve(async (req: Request) => {
    if (req.method === "OPTIONS") {
        return new Response(null, { headers: corsHeaders })
    }

    const startTime = Date.now()

    try {
        const { connection_id } = await req.json()

        if (!connection_id) {
            return new Response(
                JSON.stringify({ data: null, error: { code: "VALIDATION_ERROR", message: "connection_id is required" } }),
                { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
            )
        }

        const supabase = createClient(
            Deno.env.get("SUPABASE_URL")!,
            Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!
        )

        // ── Step 1: Fetch connection details ──────────────────────
        const { data: connection, error: connError } = await supabase
            .from("client_db_connections")
            .select(`
                *,
                connector_types(id, name, provider, config_schema)
            `)
            .eq("id", connection_id)
            .single() as any

        if (connError || !connection) {
            throw new Error(`Connection not found: ${connError?.message || "Unknown"}`)
        }

        const provider = connection.connector_types?.provider || connection.db_type
        const syncConfig = connection.sync_config || {}
        const projectId = connection.project_id
        const clientId = connection.client_id

        console.log(`[connector-sync] Starting sync for connection ${connection_id} (${provider})`)

        // ── Step 2: Mark connection as syncing ────────────────────
        await supabase
            .from("client_db_connections")
            .update({ sync_status: "syncing" })
            .eq("id", connection_id)

        // ── Step 3: Create sync log entry ─────────────────────────
        const { data: syncLog } = await supabase
            .from("connector_sync_log")
            .insert({
                connection_id,
                project_id: projectId,
                connector_type: provider,
                status: "running",
            })
            .select("id")
            .single() as any

        const syncLogId = syncLog?.id

        // ── Step 4: Dispatch to provider handler ──────────────────
        let result: SyncResult

        switch (provider) {
            case "supabase":
                result = await syncSupabase(supabase, connection, syncConfig, projectId)
                break
            case "ghl":
                result = await syncGHL(supabase, connection, syncConfig, projectId)
                break
            default:
                result = { success: false, records_synced: 0, tables_synced: [], error: `Provider "${provider}" not implemented` }
        }

        const durationMs = Date.now() - startTime

        // ── Step 5: Update sync log + connection status ───────────
        if (syncLogId) {
            await supabase
                .from("connector_sync_log")
                .update({
                    status: result.success ? "success" : "error",
                    records_synced: result.records_synced,
                    tables_synced: result.tables_synced,
                    duration_ms: durationMs,
                    error_message: result.error || null,
                    completed_at: new Date().toISOString(),
                })
                .eq("id", syncLogId)
        }

        await supabase
            .from("client_db_connections")
            .update({
                sync_status: result.success ? "success" : "error",
                last_synced_at: new Date().toISOString(),
            })
            .eq("id", connection_id)

        // Log to integration_sync_log as well
        if (projectId) {
            await supabase.from("integration_sync_log").insert({
                project_id: projectId,
                integration: provider === "ghl" ? "ghl" : "supabase",
                status: result.success ? "success" : "error",
                records_synced: result.records_synced,
                error_message: result.error || null,
            })
        }

        console.log(`[connector-sync] Complete: ${result.records_synced} records in ${durationMs}ms`)

        return new Response(
            JSON.stringify({
                data: {
                    connection_id,
                    provider,
                    records_synced: result.records_synced,
                    tables_synced: result.tables_synced,
                    duration_ms: durationMs,
                    status: result.success ? "success" : "error",
                    error: result.error,
                },
                error: null,
            }),
            { status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" } }
        )
    } catch (err) {
        console.error("[connector-sync] Fatal error:", err)
        return new Response(
            JSON.stringify({ data: null, error: { code: "SYNC_ERROR", message: String(err) } }),
            { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
        )
    }
})

// ─────────────────────────────────────────────
// TYPES
// ─────────────────────────────────────────────

interface SyncResult {
    success: boolean
    records_synced: number
    tables_synced: string[]
    error?: string
}

// ─────────────────────────────────────────────
// PROVIDER: Supabase
// Connects to an external Supabase project and syncs data
// ─────────────────────────────────────────────

async function syncSupabase(
    adminSupabase: any,
    connection: any,
    syncConfig: any,
    projectId: string
): Promise<SyncResult> {
    const supabaseUrl = syncConfig.supabase_url
    const serviceRoleKey = syncConfig.supabase_service_role_key
    const tablesToSync = syncConfig.tables_to_sync || ["users", "orders", "products"]

    if (!supabaseUrl || !serviceRoleKey) {
        return { success: false, records_synced: 0, tables_synced: [], error: "Missing supabase_url or supabase_service_role_key in sync_config" }
    }

    const externalClient = createClient(supabaseUrl, serviceRoleKey)
    let totalRecords = 0
    const syncedTables: string[] = []

    for (const table of tablesToSync) {
        try {
            // Fetch recent data from external Supabase
            const { data: rows, error: fetchError } = await externalClient
                .from(table)
                .select("*")
                .order("created_at", { ascending: false })
                .limit(500) as any

            if (fetchError) {
                console.error(`[connector-sync:supabase] Error fetching ${table}:`, fetchError)
                continue
            }

            if (!rows || rows.length === 0) {
                console.log(`[connector-sync:supabase] No data in ${table}`)
                continue
            }

            // Store synced data as campaign_metrics entries for the AI agent
            // Each row becomes a structured data point the agent can reference
            const metricsEntries = rows.slice(0, 100).map((row: any) => ({
                project_id: projectId,
                action: `[Sync:${table}] ${JSON.stringify(row).slice(0, 500)}`,
                category: "integration",
                triggered_by: null,
            }))

            const { error: insertError } = await adminSupabase
                .from("activity_log")
                .insert(metricsEntries)

            if (insertError) {
                console.error(`[connector-sync:supabase] Insert error for ${table}:`, insertError)
            } else {
                totalRecords += rows.length
                syncedTables.push(table)
                console.log(`[connector-sync:supabase] Synced ${rows.length} rows from ${table}`)
            }
        } catch (tableErr) {
            console.error(`[connector-sync:supabase] Error processing ${table}:`, tableErr)
        }
    }

    return { success: true, records_synced: totalRecords, tables_synced: syncedTables }
}

// ─────────────────────────────────────────────
// PROVIDER: GoHighLevel
// Connects to GHL CRM and syncs contacts + opportunities
// ─────────────────────────────────────────────

const GHL_API_BASE = "https://services.leadconnectorhq.com"

async function syncGHL(
    adminSupabase: any,
    connection: any,
    syncConfig: any,
    projectId: string
): Promise<SyncResult> {
    const apiKey = syncConfig.api_key || Deno.env.get("GHL_API_KEY")
    const locationId = syncConfig.location_id || Deno.env.get("GHL_LOCATION_ID")
    const syncContacts = syncConfig.sync_contacts !== false
    const syncOpportunities = syncConfig.sync_opportunities !== false

    if (!apiKey || !locationId) {
        return { success: false, records_synced: 0, tables_synced: [], error: "Missing api_key or location_id in sync_config" }
    }

    let totalRecords = 0
    const syncedTables: string[] = []

    // ── Sync Contacts ─────────────────────────────────────────
    if (syncContacts) {
        try {
            const contactsRes = await fetch(`${GHL_API_BASE}/contacts/?locationId=${locationId}&limit=100`, {
                headers: {
                    Authorization: `Bearer ${apiKey}`,
                    "Content-Type": "application/json",
                    Version: "2021-07-28",
                },
            })

            if (!contactsRes.ok) {
                const errText = await contactsRes.text()
                console.error(`[connector-sync:ghl] Contacts API error ${contactsRes.status}:`, errText)
            } else {
                const contactsData = await contactsRes.json()
                const contacts = contactsData.contacts || []

                if (contacts.length > 0) {
                    // Upsert into ghl_contacts
                    const contactRows = contacts.map((c: any) => ({
                        project_id: projectId,
                        ghl_contact_id: c.id,
                        email: c.email || null,
                        phone: c.phone || null,
                        full_name: [c.firstName, c.lastName].filter(Boolean).join(" ") || null,
                        synced_at: new Date().toISOString(),
                    }))

                    for (const row of contactRows) {
                        const { error: upsertError } = await adminSupabase
                            .from("ghl_contacts")
                            .upsert(row, { onConflict: "ghl_contact_id" })

                        if (upsertError) {
                            console.error(`[connector-sync:ghl] Contact upsert error:`, upsertError)
                        }
                    }

                    totalRecords += contacts.length
                    syncedTables.push("contacts")
                    console.log(`[connector-sync:ghl] Synced ${contacts.length} contacts`)
                }
            }
        } catch (contactErr) {
            console.error("[connector-sync:ghl] Contact sync error:", contactErr)
        }
    }

    // ── Sync Opportunities ────────────────────────────────────
    if (syncOpportunities) {
        try {
            // First get pipelines
            const pipelinesRes = await fetch(`${GHL_API_BASE}/opportunities/pipelines?locationId=${locationId}`, {
                headers: {
                    Authorization: `Bearer ${apiKey}`,
                    "Content-Type": "application/json",
                    Version: "2021-07-28",
                },
            })

            if (pipelinesRes.ok) {
                const pipelinesData = await pipelinesRes.json()
                const pipelines = pipelinesData.pipelines || []

                for (const pipeline of pipelines) {
                    const oppsRes = await fetch(
                        `${GHL_API_BASE}/opportunities/search?locationId=${locationId}&pipelineId=${pipeline.id}&limit=50`,
                        {
                            method: "POST",
                            headers: {
                                Authorization: `Bearer ${apiKey}`,
                                "Content-Type": "application/json",
                                Version: "2021-07-28",
                            },
                            body: JSON.stringify({ locationId, pipelineId: pipeline.id }),
                        }
                    )

                    if (oppsRes.ok) {
                        const oppsData = await oppsRes.json()
                        const opportunities = oppsData.opportunities || []

                        if (opportunities.length > 0) {
                            // Store as activity log entries for the AI agent to reference
                            const activityEntries = opportunities.map((opp: any) => ({
                                project_id: projectId,
                                action: `[GHL:Opportunity] "${opp.name || 'Unnamed'}" — Stage: ${opp.pipelineStageId || 'unknown'}, Value: $${opp.monetaryValue || 0}, Status: ${opp.status || 'open'}`,
                                category: "integration",
                                triggered_by: null,
                            }))

                            await adminSupabase.from("activity_log").insert(activityEntries)
                            totalRecords += opportunities.length
                            console.log(`[connector-sync:ghl] Synced ${opportunities.length} opportunities from pipeline "${pipeline.name}"`)
                        }
                    }
                }
                syncedTables.push("opportunities")
            }
        } catch (oppErr) {
            console.error("[connector-sync:ghl] Opportunity sync error:", oppErr)
        }
    }

    return { success: true, records_synced: totalRecords, tables_synced: syncedTables }
}
