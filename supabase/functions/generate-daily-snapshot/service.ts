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
                // Mocking data for now as per original implementation
                // In production, this would call GHL or internal DBs
                const snapshot = {
                    campaign_id: campaign.id,
                    snapshot_date: today,
                    total_signups: Math.floor(Math.random() * 1000),
                    new_signups_today: Math.floor(Math.random() * 50),
                    app_installs: Math.floor(Math.random() * 200),
                    activation_rate: Math.random() * 0.5 + 0.2, // 20-70%
                    social_reach: Math.floor(Math.random() * 10000),
                    social_engagement: Math.floor(Math.random() * 500),
                    landing_page_visits: Math.floor(Math.random() * 2000)
                }

                await this.campaignRepo.upsertSnapshot(snapshot)

                // Log activity
                await this.activityRepo.log({
                    project_id: campaign.project_id,
                    category: "revenue",
                    action: `Generated daily KPI snapshot for campaign ${campaign.id}`,
                    actor: "system"
                })

                this.logger.info(`Snapshot generated for campaign ${campaign.id}`)

            } catch (err) {
                this.logger.error(`Failed to generate snapshot for campaign ${campaign.id}`, err)
            }
        }

        return { campaigns_processed: campaigns.length }
    }
}
