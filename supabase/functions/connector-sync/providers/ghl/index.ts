/**
 * ghl/index.ts
 * GHL Sync Provider
 */

import { SupabaseClient } from "https://esm.sh/@supabase/supabase-js@2";
import { GhlProvider, Logger } from "../../../_shared/lib/index.ts";
import { GhlTransformer } from "./transformer.ts";
import { SyncResult } from "../../service.ts";

const TARGET_PIPELINE_NAMES = [
    "Client Software Development Pipeline",
    "School of Freelancer Freedom Pipeline"
];

export async function syncGHL(
    adminClient: SupabaseClient,
    logger: Logger,
    projectId: string,
    config: {
        api_key?: string;
        location_id?: string;
    },
    defaultApiKey: string,
    defaultLocationId: string
): Promise<SyncResult> {
    const apiKey = config.api_key || defaultApiKey;
    const locationId = config.location_id || defaultLocationId;

    if (!apiKey || !locationId) {
        return { success: false, records_synced: 0, tables_synced: [], error: "Missing API credentials" };
    }

    const ghl = new GhlProvider(apiKey);
    let total = 0;
    const tables = [];

    try {
        // 1. Sync All Available Pipelines for this Location
        const allPipelines = await ghl.listPipelines(locationId);
        logger.info(`Found ${allPipelines.length} total pipelines in GHL for location ${locationId}`);

        const targetPipelines = allPipelines; // Sync everything in the location

        if (targetPipelines.length > 0) {
            tables.push("pipelines", "opportunities", "contacts");
        }

        // 2. Sync Contacts (General Location Contacts)
        const allContacts = await ghl.listContacts(locationId, 100);
        logger.info(`Fetched ${allContacts.length} contacts from GHL for location ${locationId}`);
        
        const contactMap: Record<string, string> = {};
        for (const contactData of allContacts) {
            try {
                const internal = GhlTransformer.toInternalContact(projectId, contactData);
                const { data: dbContact } = await adminClient
                    .from("ghl_contacts")
                    .upsert(internal, { onConflict: "ghl_contact_id" })
                    .select("id")
                    .single();
                
                if (dbContact) {
                    contactMap[contactData.id] = dbContact.id;
                    total++;
                }
            } catch (contactErr) {
                logger.warn(`Failed to sync contact ${contactData.id}, skipping.`, { error: String(contactErr) });
            }
        }

        // 3. Sync Pipelines & Opportunities
        for (const pipe of targetPipelines) {
            // 3a. Upsert Pipeline
            const { data: dbPipe, error: pipeErr } = await adminClient
                .from("ghl_pipelines")
                .upsert(GhlTransformer.toInternalPipeline(projectId, pipe), { onConflict: "ghl_pipeline_id" })
                .select("id")
                .single();
            
            if (pipeErr) throw pipeErr;

            // 3b. Upsert Stages
            const stagesToUpsert = (pipe.stages || []).map((s: any, index: number) => ({
                pipeline_id: dbPipe.id,
                ghl_stage_id: s.id,
                name: s.name,
                position: index
            }));

            if (stagesToUpsert.length > 0) {
                await adminClient.from("ghl_pipeline_stages").upsert(stagesToUpsert, { onConflict: "ghl_stage_id" });
            }

            // 3c. Fetch Opportunities for this pipeline
            const opportunities = await ghl.searchOpportunities(locationId, pipe.id, 100);

            // 3d. Map stages for this pipeline
            const { data: dbStages } = await adminClient
                .from("ghl_pipeline_stages")
                .select("id, ghl_stage_id")
                .eq("pipeline_id", dbPipe.id);
            const stageMap = Object.fromEntries((dbStages || []).map((s: any) => [s.ghl_stage_id, s.id]));

            const oppsToUpsert = opportunities.map((o: any) => 
                GhlTransformer.toInternalOpportunity(projectId, dbPipe.id, stageMap[o.pipelineStageId] || null, contactMap[o.contactId] || null, o)
            );

            if (oppsToUpsert.length > 0) {
                await adminClient.from("ghl_opportunities").upsert(oppsToUpsert, { onConflict: "ghl_opportunity_id" });
                total += oppsToUpsert.length;
            }
        }
        
        if (targetPipelines.length > 0) {
            tables.push("pipelines", "opportunities");
        }

        return { success: true, records_synced: total, tables_synced: tables };
    } catch (e: any) {
        logger.error("GHL sync encountered an error", { error: String(e), stack: e.stack });
        return { success: false, records_synced: total, tables_synced: tables, error: e.message };
    }
}
