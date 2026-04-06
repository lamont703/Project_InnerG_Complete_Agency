/**
 * broadcast-to-community/index.ts
 * Inner G Complete Agency — Community Intelligence Broadcast Neural Relay
 * 
 * Auth:     Requires any authenticated user (project permissions checked in logic)
 * Trigger:  HTTP POST from the Community Hub
 */

import { createHandler, Logger, okResponse } from "../_shared/lib/index.ts"
import { BroadcastService } from "./service.ts"

// ── Handler ───────────────────────────────────────────────
export default createHandler(async ({ adminClient, body }) => {
    const logger = new Logger("broadcast-to-community")
    const service = new BroadcastService(adminClient, logger)

    logger.info("Broadcast Relay Core Entered. Payload:", body)

    const type = body?.type || "MANUAL_BROADCAST"
    const project_id = body?.project_id
    const signal_id = body?.signal_id

    if (!project_id) {
        throw new Error("Missing project_id in broadcast payload")
    }

    let broadcastInput = { 
        ...body,
        type,
        project_id,
        use_ai: body.use_ai ?? true
    }

    // --- HANDLE TRADING SIGNAL TYPE ---
    if (type === "TRADING_SIGNAL" && signal_id) {
        logger.info("Resolving trading signal for broadcast", { signal_id })
        
        // 1. Get the Signal Data
        const { data: signal, error: signalErr } = await adminClient
            .from("crypto_signals")
            .select("*")
            .eq("id", signal_id)
            .single()

        if (signalErr || !signal) {
             logger.error("Signal lookup error:", signalErr)
             throw new Error(`Trading signal not found in database: ${signal_id}`)
        }

        // 2. Resolve Agent and Deployment for this project if not provided
        if (!body.agent_id || !body.deployment_id) {
            logger.info("Searching for project default community agent...", { project_id })
            
            // Step A: Find an active community agent for this project
            const { data: agentData } = await adminClient
                .from("community_agents")
                .select("id, name")
                .eq("project_id", project_id)
                .limit(1)
                .single() as any

            if (agentData) {
                logger.info("Agent found:", { name: agentData.name })
                
                const { data: deployData } = await adminClient
                    .from("community_agent_deployments")
                    .select("id")
                    .eq("agent_id", agentData.id)
                    .eq("is_active", true)
                    .limit(1)
                    .single() as any
                
                if (deployData) {
                    broadcastInput.agent_id = agentData.id
                    broadcastInput.deployment_id = deployData.id
                }
            }

            // Fallback: If no direct agent/deployment, search by project channels
            if (!broadcastInput.agent_id) {
                 logger.info("Falling back to community_channels search...")
                 const { data: channelData } = await adminClient
                    .from("community_channels")
                    .select("id")
                    .eq("project_id", project_id)
                    .eq("platform", "discord")
                    .limit(1)
                    .single() as any
                
                 if (channelData) {
                     const { data: deployData } = await adminClient
                        .from("community_agent_deployments")
                        .select("id, agent_id")
                        .eq("channel_id", channelData.id)
                        .limit(1)
                        .single() as any
                    
                     if (deployData) {
                         broadcastInput.agent_id = deployData.agent_id
                         broadcastInput.deployment_id = deployData.id
                     }
                 }
            }
        }

        if (!broadcastInput.agent_id || !broadcastInput.deployment_id) {
            throw new Error(`No active Community Agent deployment found for project ${project_id}. Make sure an agent is active in your Community Hub.`)
        }

        // 3. Construct the high-impact signal message
        const isLong = signal.bias === "LONG"
        broadcastInput.message = `⚡ **COMMUNITY ALERT: ${signal.symbol} ${isLong ? "BUY/LONG" : "SELL/SHORT"} SIGNAL** ⚡

**Technical Setup:** ${signal.smc_reasoning.structure} Confirmation inside Supply/Demand Zone. 🚀
**Confidence Score:** ${signal.confidence_score}%

📉 **Execution Parameters:**
• Entry Zone: ${signal.entry_price}
• Stop Loss: ${signal.stop_loss}
• Target: ${signal.take_profit_1} (R:R 1:${signal.risk_reward_ratio || '2.0'})

🧠 **Neural Reasoning:**
${signal.narrative_reasoning}

*Disclaimer: This is intelligence for educational purposes. Manage your risk.*`

        broadcastInput.use_ai = false 
    }

    logger.info("Initiating broadcast neural relay", { 
        agent_id: broadcastInput.agent_id, 
        deployment_id: broadcastInput.deployment_id
    })

    const result = await service.run(broadcastInput)

    if (!result.success) {
        throw new Error(result.error || "Broadcast delivery failed.")
    }

    return okResponse({ success: true, interaction_id: result.interaction_id })
}, {
    requireAuth: true,
    requiredEnv: ["SUPABASE_URL", "SUPABASE_SERVICE_ROLE_KEY"]
})
