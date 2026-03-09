/**
 * sync-ghl-pipeline
 * Implementation (Phase G — Sales Pipeline Intelligence)
 *
 * Fetches the "Client Software Development Pipeline" from GoHighLevel
 * and synchronizes Pipelines, Stages, Opportunities, and Contacts into Supabase.
 *
 * Requirements:
 * - GHL_API_KEY (OAuth Access Token or API Key)
 * - GHL_LOCATION_ID
 *
 * Logic:
 * 1. Find the "Inner G Complete" project in Supabase.
 * 2. Fetch all pipelines from GHL → filter for "Client Software Development Pipeline".
 * 3. Upsert Pipeline & Stages into DB.
 * 4. Fetch all Opportunities for this pipeline.
 * 5. Fetch Contact details for each unique contact in the opportunities.
 * 6. Upsert Opportunities & Contacts into DB.
 * 7. (Automatic) DB triggers queue these for AI RAG embedding.
 */

import { serve } from "https://deno.land/std@0.177.0/http/server.ts"
import { createClient } from "https://esm.sh/@supabase/supabase-js@2"
import { corsHeaders } from "../_shared/cors.ts"

const GHL_API_BASE = "https://services.leadconnectorhq.com"
const TARGET_PIPELINE_NAME = "Client Software Development Pipeline"
const AGENCY_PROJECT_SLUG = "innergcomplete"

serve(async (req: Request) => {
    // 1. CORS
    if (req.method === "OPTIONS") {
        return new Response("ok", { headers: corsHeaders })
    }

    try {
        console.log(`[sync-ghl-pipeline] Starting sync for "${TARGET_PIPELINE_NAME}"...`)

        const supabase = createClient(
            Deno.env.get("SUPABASE_URL")!,
            Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!
        )

        const ghlApiKey = Deno.env.get("GHL_API_KEY")
        const locationId = Deno.env.get("GHL_LOCATION_ID")

        console.log(`[sync-ghl-pipeline] Env check: GHL_API_KEY=${!!ghlApiKey}, GHL_LOCATION_ID=${!!locationId}`)

        if (!ghlApiKey) throw new Error("GHL_API_KEY is not set in Supabase Secrets.")
        if (!locationId) throw new Error("GHL_LOCATION_ID is not set in Supabase Secrets.")

        // 2. Resolve the Agency Project ID
        let { data: project, error: projectError } = await supabase
            .from("projects")
            .select("id, name")
            .eq("slug", AGENCY_PROJECT_SLUG)
            .single()

        // Fallback: If innergcomplete slug doesn't exist, pick the first project
        if (projectError || !project) {
            console.warn(`[sync-ghl-pipeline] Could not find slug "${AGENCY_PROJECT_SLUG}", falling back to first project.`)
            const { data: fallbackProjects } = await supabase
                .from("projects")
                .select("id, name")
                .limit(1)

            if (fallbackProjects && fallbackProjects.length > 0) {
                project = fallbackProjects[0]
            } else {
                throw new Error("No projects found in the database. Please create a project first.")
            }
        }

        const projectId = project.id
        console.log(`[sync-ghl-pipeline] Syncing for project: ${project.name} (${projectId})`)

        // 3. Handshake with GHL: Pipelines
        console.log(`[sync-ghl-pipeline] Fetching pipelines from GHL...`)
        const pipeRes = await fetch(`${GHL_API_BASE}/opportunities/pipelines?locationId=${locationId}`, {
            headers: {
                "Authorization": `Bearer ${ghlApiKey}`,
                "Version": "2021-07-28",
                "Accept": "application/json"
            }
        })

        if (!pipeRes.ok) {
            const errBody = await pipeRes.text()
            console.error(`[sync-ghl-pipeline] GHL API Error: ${pipeRes.status}`, errBody)
            throw new Error(`GHL Pipelines API Error (${pipeRes.status}): ${errBody}`)
        }

        const { pipelines } = await pipeRes.json()
        const targetPipe = pipelines.find((p: any) => p.name === TARGET_PIPELINE_NAME)

        if (!targetPipe) {
            throw new Error(`Pipeline "${TARGET_PIPELINE_NAME}" not found in GHL account. Found: ${pipelines.map((p: any) => p.name).join(", ")}`)
        }

        // 4. Sync Pipeline & Stages to Supabase
        console.log(`[sync-ghl-pipeline] Syncing pipeline: ${targetPipe.name} (id: ${targetPipe.id})`)
        const { data: dbPipe, error: pipeErr } = await supabase
            .from("ghl_pipelines")
            .upsert({
                project_id: projectId,
                ghl_pipeline_id: targetPipe.id,
                name: targetPipe.name
            }, { onConflict: "ghl_pipeline_id" })
            .select("id")
            .single()

        if (pipeErr) throw pipeErr

        // Sync Stages
        const stagesToUpsert = targetPipe.stages.map((s: any, index: number) => ({
            pipeline_id: dbPipe.id,
            ghl_stage_id: s.id,
            name: s.name,
            position: index
        }))

        const { error: stageErr } = await supabase
            .from("ghl_pipeline_stages")
            .upsert(stagesToUpsert, { onConflict: "ghl_stage_id" })

        if (stageErr) throw stageErr

        // 5. Fetch Opportunities for this Pipeline
        const oppsUrl = `${GHL_API_BASE}/opportunities/search?location_id=${locationId}&pipeline_id=${targetPipe.id}`
        console.log(`[sync-ghl-pipeline] Fetching opportunities: ${oppsUrl}`)
        const oppsRes = await fetch(oppsUrl, {
            headers: {
                "Authorization": `Bearer ${ghlApiKey}`,
                "Version": "2021-07-28",
                "Accept": "application/json"
            }
        })

        if (!oppsRes.ok) {
            const errBody = await oppsRes.text()
            console.error(`[sync-ghl-pipeline] Search Error: ${oppsRes.status}`, errBody)
            throw new Error(`GHL Opportunities API Error (${oppsRes.status}): ${errBody}`)
        }

        const { opportunities } = await oppsRes.json()
        console.log(`[sync-ghl-pipeline] Found ${opportunities.length} opportunities.`)

        // 6. Contact Sync (The "Memory" layer)
        // Extract unique contact IDs to fetch their details
        const ghlContactIds = [...new Set(opportunities.map((o: any) => o.contactId).filter(Boolean))] as string[]
        console.log(`[sync-ghl-pipeline] Syncing ${ghlContactIds.length} unique contacts...`)

        const contactMap: Record<string, string> = {} // ghl_id -> supabase_uuid

        for (const ghlId of ghlContactIds) {
            try {
                const contactRes = await fetch(`${GHL_API_BASE}/contacts/${ghlId}`, {
                    headers: {
                        "Authorization": `Bearer ${ghlApiKey}`,
                        "Version": "2021-07-28",
                        "Accept": "application/json"
                    }
                })

                if (contactRes.ok) {
                    const { contact } = await contactRes.json()
                    const { data: dbContact, error: cErr } = await supabase
                        .from("ghl_contacts")
                        .upsert({
                            project_id: projectId,
                            ghl_contact_id: contact.id,
                            full_name: `${contact.firstName || ""} ${contact.lastName || ""}`.trim(),
                            email: contact.email,
                            phone: contact.phone
                        }, { onConflict: "ghl_contact_id" })
                        .select("id")
                        .single()

                    if (dbContact) contactMap[contact.id] = dbContact.id
                }
            } catch (cFetchErr) {
                console.warn(`[sync-ghl-pipeline] Failed to sync contact ${ghlId}:`, cFetchErr)
                // Continue with other contacts
            }
        }

        // 7. Upsert Opportunities
        // We need the mapping of ghl_stage_id -> stage_uuid from our DB
        const { data: dbStages } = await supabase
            .from("ghl_pipeline_stages")
            .select("id, ghl_stage_id")
            .eq("pipeline_id", dbPipe.id)

        const stageMap = Object.fromEntries(dbStages?.map(s => [s.ghl_stage_id, s.id]) || [])

        const oppsToUpsert = opportunities.map((o: any) => ({
            project_id: projectId,
            ghl_opportunity_id: o.id,
            pipeline_id: dbPipe.id,
            stage_id: stageMap[o.pipelineStageId] || null,
            contact_id: contactMap[o.contactId] || null,
            title: o.name,
            status: o.status === "open" ? "open" : (o.status === "won" ? "won" : "lost"),
            monetary_value: o.monetaryValue || 0,
            assigned_to: o.assignedTo,
            tags: o.tags || [],
            custom_fields: o.customFields || {},
            ghl_updated_at: o.updatedAt,
            synced_at: new Date().toISOString()
        }))

        const { error: oppsErr } = await supabase
            .from("ghl_opportunities")
            .upsert(oppsToUpsert, { onConflict: "ghl_opportunity_id" })

        if (oppsErr) throw oppsErr

        return new Response(
            JSON.stringify({
                data: {
                    pipeline: targetPipe.name,
                    stages_synced: stagesToUpsert.length,
                    opportunities_synced: oppsToUpsert.length,
                    contacts_synced: Object.keys(contactMap).length
                },
                error: null
            }),
            { status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" } }
        )

    } catch (err) {
        console.error("[sync-ghl-pipeline] Error:", err)
        return new Response(
            JSON.stringify({ data: null, error: { message: String(err) } }),
            { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
        )
    }
})
