/**
 * generate-daily-snapshot/service.ts
 * Inner G Complete Agency — Daily KPI Snapshot Service
 *
 * ─────────────────────────────────────────────────────────
 * ⚠️  GUARDRAIL: This file ONLY contains business logic.
 * It must NOT handle CORS, authentication, or HTTP responses.
 * Aggregation logic lives HERE. For KPI definitions or source
 * config, update THIS file — not index.ts.
 * ─────────────────────────────────────────────────────────
 */

import { SupabaseClient } from "https://esm.sh/@supabase/supabase-js@2"
import { Repo, Logger, GhlProvider } from "../_shared/lib/index.ts"

export class SnapshotService {
    private campaignRepo: Repo.CampaignRepo
    private activityRepo: Repo.ActivityRepo

    constructor(private adminClient: SupabaseClient, private logger: Logger) {
        this.campaignRepo = new Repo.CampaignRepo(adminClient)
        this.activityRepo = new Repo.ActivityRepo(adminClient)
    }

    async aggregateAll(): Promise<{ campaigns_processed: number }> {
        const campaigns = await this.campaignRepo.getActiveCampaigns()
        const today = new Date().toISOString().split("T")[0]

        this.logger.info(`Starting KPI aggregation for ${campaigns.length} campaigns`)

        for (const campaign of campaigns) {
            try {
                // 1. Fetch Real GHL Data for this project
                // Total signups across all pipelines for this project
                const { count: totalSignups } = await this.adminClient
                    .from("ghl_opportunities")
                    .select("*", { count: "exact", head: true })
                    .eq("project_id", campaign.project_id)

                // New signups today
                const { count: newToday } = await this.adminClient
                    .from("ghl_opportunities")
                    .select("*", { count: "exact", head: true })
                    .eq("project_id", campaign.project_id)
                    .gte("created_at", `${today}T00:00:00Z`)

                // Won opportunities for activation rate
                const { count: wonCount } = await this.adminClient
                    .from("ghl_opportunities")
                    .select("*", { count: "exact", head: true })
                    .eq("project_id", campaign.project_id)
                    .eq("status", "won")

                const activationRate = totalSignups && totalSignups > 0 
                    ? (wonCount ?? 0) / totalSignups 
                    : 0

                // 2. Build the snapshot
                const snapshot = {
                    campaign_id: campaign.id,
                    snapshot_date: today,
                    total_signups: totalSignups ?? 0,
                    new_signups_today: newToday ?? 0,
                    app_installs: Math.floor(Math.random() * 200), // App installs still mocked for now
                    activation_rate: activationRate,
                    social_reach: Math.floor(Math.random() * 10000), // Social reach still mocked
                    social_engagement: Math.floor(Math.random() * 500),
                    landing_page_visits: Math.floor(Math.random() * 2000)
                }

                await this.campaignRepo.upsertSnapshot(snapshot)

                // Log activity
                await this.activityRepo.log({
                    project_id: campaign.project_id,
                    category: "revenue",
                    action: `Generated live KPI snapshot for campaign ${campaign.id}`,
                    actor: "system"
                })

                this.logger.info(`Live snapshot generated for campaign ${campaign.id} (${totalSignups} total opps)`)

            } catch (err) {
                this.logger.error(`Failed to generate snapshot for campaign ${campaign.id}`, err)
            }
        }

        return { campaigns_processed: campaigns.length }
    }
}
