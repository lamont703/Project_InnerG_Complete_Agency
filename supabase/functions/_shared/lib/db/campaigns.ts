/**
 * _shared/lib/db/campaigns.ts
 * Inner G Complete Agency — Campaigns & Metrics Repository
 */

import { SupabaseClient } from "https://esm.sh/@supabase/supabase-js@2"

export interface CampaignRow {
    id: string
    project_id: string
    ghl_campaign_id?: string | null
    status: string
}

export interface MetricSnapshotPayload {
    campaign_id: string
    snapshot_date: string
    total_signups: number
    new_signups_today: number
    app_installs: number
    activation_rate: number
    social_reach?: number
    social_engagement?: number
    landing_page_visits?: number
}

export class CampaignRepo {
    constructor(private client: SupabaseClient) { }

    /**
     * Gets all active campaigns.
     */
    async getActiveCampaigns(): Promise<CampaignRow[]> {
        const { data, error } = await this.client
            .from("campaigns")
            .select("id, project_id, ghl_campaign_id, status")
            .eq("status", "active")

        if (error) throw error
        return (data || []) as CampaignRow[]
    }

    /**
     * Upserts a KPI snapshot.
     */
    async upsertSnapshot(payload: MetricSnapshotPayload): Promise<void> {
        const { error } = await this.client
            .from("campaign_metrics")
            .upsert(payload, { onConflict: "campaign_id,snapshot_date" })

        if (error) throw error
    }
}
