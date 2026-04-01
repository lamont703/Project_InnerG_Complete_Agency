/**
 * broadcast-to-community/index.ts
 * Inner G Complete Agency — Community Intelligence Broadcast Neural Relay
 * 
 * Auth:     Requires any authenticated user (project permissions checked in logic)
 * Trigger:  HTTP POST from the Community Hub
 */

import { createHandler, z, Logger, okResponse, validationErrorResponse } from "../_shared/lib/index.ts"
import { BroadcastService } from "./service.ts"

// ── Request Schema ────────────────────────────────────────
const BroadcastSchema = z.object({
    agent_id: z.string().uuid().optional(),
    deployment_id: z.string().uuid().optional(),
    message: z.string().min(1).optional(),
    use_ai: z.boolean().default(true),
    project_id: z.string().uuid(),
    type: z.enum(["MANUAL_BROADCAST", "TRADING_SIGNAL"]).default("MANUAL_BROADCAST"),
    signal_id: z.string().uuid().optional()
})

// ── Handler ───────────────────────────────────────────────
export default createHandler(async ({ adminClient, user, body }) => {
    const logger = new Logger("broadcast-to-community")
    const service = new BroadcastService(adminClient, logger)

    let broadcastInput = { ...body }

    // --- HANDLE TRADING SIGNAL TYPE ---
    if (body.type === "TRADING_SIGNAL" && body.signal_id) {
        logger.info("Resolving trading signal for broadcast", { signal_id: body.signal_id })
        
        const { data: signal, error: signalErr } = await adminClient
            .from("crypto_signals")
            .select("*, config:project_id(id, community_agent_deployments(*))")
            .eq("id", body.signal_id)
            .single() as any

        if (signalErr || !signal) throw new Error("Trading signal not found for broadcast relay")

        // 1. Auto-resolve the agent and deployment if not provided
        // We look for the most relevant community deployment for this project
        if (!body.agent_id || !body.deployment_id) {
            const { data: deployData } = await adminClient
                .from("community_agent_deployments")
                .select("id, agent_id")
                .eq("project_id", body.project_id)
                .limit(1)
                .single()

            if (deployData) {
                broadcastInput.agent_id = deployData.agent_id
                broadcastInput.deployment_id = deployData.id
            }
        }

        // 2. Construct the high-impact signal message
        const isLong = signal.bias === "LONG"
        broadcastInput.message = `⚡ **COMMUNITY ALERT: ${signal.symbol} ${isLong ? "BUY/LONG" : "SELL/SHORT"} SIGNAL** ⚡

**Technical Setup:** ${signal.smc_reasoning.structure} Confirmation inside Supply/Demand Zone. 🚀
**Confidence Score:** ${signal.confidence_score}%

📉 **Execution Parameters:**
• Entry Zone: ${signal.entry_price}
• Stop Loss: ${signal.stop_loss}
• Target: ${signal.take_profit_1} (R:R 1:${signal.risk_reward_ratio})

🧠 **Neural Reasoning:**
${signal.narrative_reasoning}

*Disclaimer: This is intelligence for educational purposes. Manage your risk.*`

        // We want the AI to preserve this specific signal formatting
        broadcastInput.use_ai = false 
    }

    logger.info("Initiating broadcast neural relay", { 
        agent_id: broadcastInput.agent_id, 
        deployment_id: broadcastInput.deployment_id,
        project_id: broadcastInput.project_id
    })

    const result = await service.run(broadcastInput)

    return okResponse(result)
}, {
    schema: BroadcastSchema,
    requireAuth: true,
    // Only require the mandatory infra vars — AI/Discord keys are handled gracefully
    // inside the service so missing secrets degrade feature-by-feature, not with a 400.
    requiredEnv: [
        "SUPABASE_URL",
        "SUPABASE_SERVICE_ROLE_KEY",
    ]
})
