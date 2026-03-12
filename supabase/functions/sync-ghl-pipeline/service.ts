/**
 * sync-ghl-pipeline/service.ts
 * Inner G Complete Agency — GHL Pipeline Sync Service
 *
 * ─────────────────────────────────────────────────────────
 * ⚠️  GUARDRAIL: This file ONLY contains business logic.
 * It must NOT handle CORS, authentication, or HTTP responses.
 * ─────────────────────────────────────────────────────────
 */

import { SupabaseClient } from "https://esm.sh/@supabase/supabase-js@2"
import { GhlProvider, Logger } from "../_shared/lib/index.ts"

const TARGET_PIPELINE_NAME = "Client Software Development Pipeline"
const AGENCY_PROJECT_SLUG = "innergcomplete"

export interface GhlPipelineSyncResult {
    pipeline: string
    stages_synced: number
    opportunities_synced: number
    contacts_synced: number
    [key: string]: unknown
}

export class GhlPipelineSyncService {
    constructor(
        private adminClient: SupabaseClient,
        private logger: Logger,
        private ghlApiKey: string,
        private locationId: string
    ) { }

    async sync(): Promise<GhlPipelineSyncResult> {
        // 1. Resolve the Agency Project ID
        const projectId = await this.resolveProjectId()
        this.logger.info(`Syncing for project: ${projectId}`)

        // 2. Try to load credentials from DB first, fallback to env
        let activeApiKey = this.ghlApiKey
        let activeLocationId = this.locationId

        try {
            const { data: connection } = await this.adminClient
                .from("client_db_connections")
                .select(`
                    id, 
                    sync_config,
                    connector_types!inner(provider)
                `)
                .eq("project_id", projectId)
                .eq("connector_types.provider", "ghl")
                .maybeSingle()

            if (connection?.sync_config?.api_key && connection?.sync_config?.location_id) {
                this.logger.info("Using GHL credentials from database connector")
                activeApiKey = connection.sync_config.api_key
                activeLocationId = connection.sync_config.location_id
            } else {
                this.logger.info("No valid GHL connector found in DB, using environment fallbacks")
            }
        } catch (err) {
            this.logger.warn("Failed to check DB for GHL connector (falling back to env)", { error: String(err) })
        }

        const ghl = new GhlProvider(activeApiKey)

        // 3. Fetch Pipelines from GHL
        const pipelines = await ghl.listPipelines(activeLocationId)
        const targetPipe = pipelines.find((p: any) => p.name === TARGET_PIPELINE_NAME)

        if (!targetPipe) {
            const names = pipelines.map((p: any) => p.name).join(", ")
            throw new Error(`Pipeline "${TARGET_PIPELINE_NAME}" not found. Available: ${names}`)
        }

        this.logger.info(`Found target pipeline: ${targetPipe.name}`)

        // 3. Upsert Pipeline to DB
        const { data: dbPipe, error: pipeErr } = await this.adminClient
            .from("ghl_pipelines")
            .upsert({
                project_id: projectId,
                ghl_pipeline_id: targetPipe.id,
                name: targetPipe.name
            }, { onConflict: "ghl_pipeline_id" })
            .select("id")
            .single()

        if (pipeErr) throw pipeErr

        // 4. Upsert Stages
        const stagesToUpsert = (targetPipe.stages || []).map((s: any, index: number) => ({
            pipeline_id: dbPipe.id,
            ghl_stage_id: s.id,
            name: s.name,
            position: index
        }))

        const { error: stageErr } = await this.adminClient
            .from("ghl_pipeline_stages")
            .upsert(stagesToUpsert, { onConflict: "ghl_stage_id" })

        if (stageErr) throw stageErr
        this.logger.info(`Synced ${stagesToUpsert.length} pipeline stages`)

        // 5. Fetch Opportunities
        const opportunities = await ghl.searchOpportunities(this.locationId, targetPipe.id, 100)
        this.logger.info(`Found ${opportunities.length} opportunities`)

        // 6. Sync Contacts (unique contact IDs only)
        const contactIds = [...new Set(opportunities.map((o: any) => o.contactId).filter(Boolean))] as string[]
        const contactMap = await this.syncContacts(ghl, contactIds, projectId)

        // 7. Upsert Opportunities with stage + contact mappings
        const { data: dbStages } = await this.adminClient
            .from("ghl_pipeline_stages")
            .select("id, ghl_stage_id")
            .eq("pipeline_id", dbPipe.id)

        const stageMap = Object.fromEntries((dbStages ?? []).map((s: { id: string; ghl_stage_id: string }) => [s.ghl_stage_id, s.id]))

        const oppsToUpsert = opportunities.map((o: any) => ({
            project_id: projectId,
            ghl_opportunity_id: o.id,
            pipeline_id: dbPipe.id,
            stage_id: stageMap[o.pipelineStageId] ?? null,
            contact_id: contactMap[o.contactId] ?? null,
            title: o.name,
            status: o.status === "won" ? "won" : o.status === "lost" ? "lost" : "open",
            monetary_value: o.monetaryValue ?? 0,
            assigned_to: o.assignedTo ?? null,
            tags: o.tags ?? [],
            custom_fields: o.customFields ?? {},
            ghl_updated_at: o.updatedAt,
            synced_at: new Date().toISOString()
        }))

        const { error: oppsErr } = await this.adminClient
            .from("ghl_opportunities")
            .upsert(oppsToUpsert, { onConflict: "ghl_opportunity_id" })

        if (oppsErr) throw oppsErr

        return {
            pipeline: targetPipe.name,
            stages_synced: stagesToUpsert.length,
            opportunities_synced: oppsToUpsert.length,
            contacts_synced: Object.keys(contactMap).length
        }
    }

    private async resolveProjectId(): Promise<string> {
        const { data: project } = await this.adminClient
            .from("projects")
            .select("id, name")
            .eq("slug", AGENCY_PROJECT_SLUG)
            .single()

        if (project) return project.id

        // Fallback to first project
        this.logger.warn(`Slug "${AGENCY_PROJECT_SLUG}" not found — using first project`)
        const { data: fallbackProjects } = await this.adminClient
            .from("projects")
            .select("id, name")
            .limit(1)

        if (fallbackProjects && fallbackProjects.length > 0) {
            return fallbackProjects[0].id
        }

        throw new Error("No projects found. Please create a project first.")
    }

    private async syncContacts(ghl: GhlProvider, contactIds: string[], projectId: string): Promise<Record<string, string>> {
        const contactMap: Record<string, string> = {}

        for (const ghlId of contactIds) {
            try {
                const contactData = await ghl.getContactById(ghlId)
                if (!contactData) continue

                const { data: dbContact } = await this.adminClient
                    .from("ghl_contacts")
                    .upsert({
                        project_id: projectId,
                        ghl_contact_id: contactData.id,
                        full_name: `${contactData.firstName ?? ""} ${contactData.lastName ?? ""}`.trim(),
                        email: contactData.email ?? null,
                        phone: contactData.phone ?? null,
                        synced_at: new Date().toISOString()
                    }, { onConflict: "ghl_contact_id" })
                    .select("id")
                    .single()

                if (dbContact) contactMap[contactData.id] = dbContact.id
            } catch (err) {
                this.logger.warn(`Failed to sync contact ${ghlId}`, { error: String(err) })
            }
        }

        this.logger.info(`Synced ${Object.keys(contactMap).length} contacts`)
        return contactMap
    }
}
