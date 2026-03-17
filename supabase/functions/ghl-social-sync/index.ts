import { createHandler, z, Logger, okResponse, Repo, GhlProvider } from "../_shared/lib/index.ts"
import { GhlTransformer } from "../connector-sync/providers/ghl/transformer.ts"

// 🛡️ Strict validation for the sync request
const SyncRequestSchema = z.object({
    connection_id: z.string().uuid()
})

/**
 * ghl-social-sync
 * Optimized for syncing social media data directly from GHL Planner API.
 */
export default createHandler(async ({ adminClient, body, user }) => {
    const logger = new Logger("ghl-social-sync")
    
    // 1. Data Isolation Check
    if (!user) {
        throw new Error("UNAUTHORIZED: Authentication required to trigger sync.")
    }

    const connectorRepo = new Repo.ConnectorRepo(adminClient)
    const connection = await connectorRepo.getConnection(body.connection_id)
    if (!connection) {
        throw new Error(`Connection not found: ${body.connection_id}`)
    }

    const projectId = connection.project_id

    if (user.role === 'client') {
        const { data: access, error: accessErr } = await adminClient
            .from('project_user_access')
            .select('project_id')
            .eq('project_id', projectId)
            .eq('user_id', user.id)
            .maybeSingle()

        if (accessErr || !access) {
            logger.warn("Unauthorized social sync attempt", { userId: user.id, connectionId: body.connection_id, projectId })
            throw new Error("UNAUTHORIZED: You do not have permission to sync this connection.")
        }
    } else if (user.role !== 'super_admin' && user.role !== 'developer') {
        throw new Error(`FORBIDDEN: Role ${user.role} is not permitted to trigger sync.`)
    }

    // 2. Orchestrate Sync
    logger.info("Received sync request", { connection_id: body.connection_id })

    const syncConfig = connection.sync_config || {}
    
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const apiKey = (syncConfig as any).api_key || (Deno.env.get("GHL_API_KEY") ?? "")
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const locationId = (syncConfig as any).location_id || (Deno.env.get("GHL_LOCATION_ID") ?? "")
    
    if (!apiKey || !locationId) {
        throw new Error("Missing GHL API credentials")
    }

    const ghl = new GhlProvider(apiKey)
    let total = 0
    const tables = []

    try {
        // Sync Social Accounts
        logger.info(`Fetching social accounts for location: ${locationId}`);
        const socialAccounts = await ghl.listSocialAccounts(locationId);
        logger.info(`Received social accounts data`, { count: socialAccounts.length, sample: socialAccounts.slice(0, 1) });

        if (socialAccounts.length > 0) {
            // eslint-disable-next-line @typescript-eslint/no-explicit-any
            const internalAccounts = socialAccounts.map((a: any) => GhlTransformer.toInternalSocialAccount(projectId, a));
            const { data: insertedAccounts, error: accError } = await adminClient
                .from("ghl_social_accounts")
                .upsert(internalAccounts, { onConflict: "project_id, ghl_account_id" })
                .select();
            
            if (accError) throw accError;
            
            total += socialAccounts.length;
            tables.push("social_accounts");

            // Sync Social Posts (for each active account)
            // eslint-disable-next-line @typescript-eslint/no-explicit-any
            const accountMap = new Map<string, string>(insertedAccounts?.map((a: any) => [a.ghl_account_id, a.id]));
            const postOptions = { 
                limit: 50, 
                status: 'published', // Maps to the `type` field in GHL
                accountIds: Array.from(accountMap.keys()) 
            };
            
            logger.info("Fetching social posts...");
            const posts = await ghl.listSocialPosts(locationId, postOptions);
            logger.info(`Received social posts`, { count: posts.length });
            
            if (posts.length > 0) {
                // eslint-disable-next-line @typescript-eslint/no-explicit-any
                const internalPosts = posts.map((p: any) => {
                    const internalAccountId = accountMap.get(p.accountId);
                    if (!internalAccountId) return null;
                    return GhlTransformer.toInternalSocialPost(projectId, internalAccountId, p);
                }).filter(Boolean);

                if (internalPosts.length > 0) {
                    const { error: postError } = await adminClient
                        .from("ghl_social_posts")
                        .upsert(internalPosts, { onConflict: "ghl_post_id" });
                    
                    if (postError) throw postError;
                    
                    total += internalPosts.length;
                    tables.push("social_posts");
                }
            }

            // Fetch Social Statistics (for all eligible accounts)
            // eslint-disable-next-line @typescript-eslint/no-explicit-any
            const profileIds = socialAccounts
                ?.filter((a: any) => a.hasStatisticsPermissions && a.platform !== 'community')
                .map((a: any) => a.profileId)
                .filter(Boolean) || [];
                
            if (profileIds.length > 0) {
                try {
                    logger.info(`Fetching social statistics for ${profileIds.length} profiles...`);
                    const statsReq = await ghl.getSocialStatistics(locationId, profileIds);
                    if (statsReq && statsReq.results) {
                        // Clear out the previous 7-Day performance insight to prevent duplicates
                        await adminClient.from("ghl_social_insights")
                            .delete()
                            .match({ project_id: projectId, title: '7-Day Social Media Performance' });

                        const insight = {
                            project_id: projectId,
                            type: 'trend_analysis',
                            title: '7-Day Social Media Performance',
                            content: `Performance analytics data retrieved across ${profileIds.length} connected profile(s).`,
                            metadata: statsReq.results,
                            updated_at: new Date().toISOString()
                        };
                        
                        const { error: insightError } = await adminClient
                            .from("ghl_social_insights")
                            .insert(insight);
                        
                        if (insightError) throw insightError;
                        
                        tables.push("social_insights");
                    }
                } catch (statsErr) {
                    logger.error("Error fetching social statistics", { error: String(statsErr) });
                    // Do not fail the whole sync just because stats failed
                }
            }
        }
        
        return okResponse({
            connection_id: body.connection_id,
            success: true,
            records_synced: total,
            tables_synced: tables
        })
    } catch (e: any) {
        logger.error("GHL Social sync encountered an error", { error: String(e), stack: e.stack });
        throw e;
    }

}, {
    schema: SyncRequestSchema,
    requireAuth: true,
    requiredEnv: ["SUPABASE_URL", "SUPABASE_SERVICE_ROLE_KEY", "GHL_API_KEY", "GHL_LOCATION_ID"]
})
