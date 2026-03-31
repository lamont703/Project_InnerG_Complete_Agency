/**
 * broadcast-to-community/service.ts
 * Inner G Complete Agency — Broadcast Service Logic
 * 
 * ─────────────────────────────────────────────────────────
 * ⚠️  GUARDRAIL: This file ONLY contains business logic.
 * It must NOT handle CORS, authentication, or HTTP responses.
 * ─────────────────────────────────────────────────────────
 */

import { SupabaseClient } from "https://esm.sh/@supabase/supabase-js@2"
import { Logger } from "../_shared/lib/index.ts"
import { generateContent, GEMINI_MODELS } from "../_shared/lib/ai/gemini.ts"

const DISCORD_API = "https://discord.com/api/v10"

export interface BroadcastInput {
    agent_id: string
    deployment_id: string
    message: string
    use_ai: boolean
    project_id: string
}

export interface BroadcastResult {
    success: boolean
    interaction_id?: string
    error?: string
}

export class BroadcastService {
    constructor(private adminClient: SupabaseClient, private logger: Logger) {}

    async run(input: BroadcastInput): Promise<BroadcastResult> {
        this.logger.info("Processing community broadcast", { 
            agent_id: input.agent_id,
            deployment_id: input.deployment_id,
            project_id: input.project_id,
            use_ai: input.use_ai,
            message_length: input.message?.length
        })

        try {
            // 1. Resolve agent
            const { data: agent, error: agentErr } = await this.adminClient
                .from("community_agents")
                .select("*")
                .eq("id", input.agent_id)
                .single()

            if (agentErr || !agent) {
                this.logger.error("Agent lookup failed", agentErr)
                throw new Error(`Agent not found: ${input.agent_id}`)
            }
            this.logger.info("Agent resolved", { name: agent.name })

            // 2. Resolve deployment + channel
            const { data: deployment, error: deployErr } = await this.adminClient
                .from("community_agent_deployments")
                .select("*, channel:channel_id(*)")
                .eq("id", input.deployment_id)
                .single() as any

            if (deployErr || !deployment) {
                this.logger.error("Deployment lookup failed", deployErr)
                throw new Error(`Deployment not found: ${input.deployment_id}`)
            }
            this.logger.info("Deployment resolved", { platform: deployment.channel?.platform })

            let broadcastContent = input.message
            const geminiKey = Deno.env.get("GEMINI_API_KEY")

            // 3. AI Refinement — only if key is available and use_ai is true
            if (input.use_ai && geminiKey) {
                try {
                    const systemPrompt = `You are ${agent.name}, ${agent.role}. 
Your personality: ${agent.persona_prompt}
Your current mood: ${agent.mood || "Focused"}
Your mission: ${agent.mission_objective || "Broadcast intelligence."}

CRITICAL RULES:
- Respond in character as ${agent.name}. Never break character.
- Refine the provided topic into a punchy, platform-appropriate broadcast under 1800 characters.
- Use Discord markdown formatting (headers, bold, etc.) if the platform is discord.
- Be strategic, not gimmicky.`

                    const { text } = await generateContent({
                        model: GEMINI_MODELS.FLASH_LITE,
                        systemPrompt,
                        userMessage: `Draft the broadcast payload for the community based on this topic: ${input.message}`,
                        temperature: 0.7
                    }, geminiKey)

                    if (text) {
                        broadcastContent = text
                        this.logger.info("AI refinement applied", { length: broadcastContent.length })
                    }
                } catch (aiErr) {
                    this.logger.warn("AI refinement failed, using raw message", aiErr)
                }
            } else if (input.use_ai && !geminiKey) {
                this.logger.warn("GEMINI_API_KEY not set — skipping AI refinement, using raw message")
            }

            // 4. Platform Delivery
            let deliverySuccess = false
            const platform = deployment.channel?.platform

            if (platform === 'discord') {
                deliverySuccess = await this.deliverToDiscord(agent, deployment, broadcastContent)
            } else {
                // For book_reader and other platforms, mark as delivered (DB log is the record)
                this.logger.info(`Platform '${platform}' — marking as logged delivery`)
                deliverySuccess = true
            }

            // 5. Log the interaction record
            const { data: interaction, error: logErr } = await this.adminClient
                .from("community_agent_interactions")
                .insert({
                    agent_id: input.agent_id,
                    project_id: input.project_id,
                    channel_id: deployment.channel_id,
                    platform: platform,
                    room_id: "broadcast",
                    message_type: "broadcast",
                    content: broadcastContent,
                    external_id: deliverySuccess ? "sent" : "failed"
                })
                .select("id")
                .single()

            if (logErr) {
                this.logger.warn("Failed to log broadcast interaction", logErr)
            } else {
                this.logger.info("Broadcast interaction logged", { id: interaction?.id })
            }

            return { 
                success: deliverySuccess, 
                interaction_id: interaction?.id 
            }

        } catch (err: any) {
            this.logger.error("Broadcast Neural Relay Failure", err)
            throw err
        }
    }

    private async deliverToDiscord(agent: any, deployment: any, content: string): Promise<boolean> {
        const botToken = Deno.env.get("DISCORD_BOT_TOKEN")
        const guildId = deployment.channel.config?.guild_id
        const channelId = deployment.channel.config?.channel_id || deployment.room_id

        if (!botToken || !channelId) {
            this.logger.error("Missing Discord credentials for delivery", { channelId })
            return false
        }

        try {
            // First attempt: Try to use a webhook for that premium "Persona" look (no bot badge)
            const webhookRes = await fetch(`${DISCORD_API}/channels/${channelId}/webhooks`, {
                headers: { "Authorization": `Bot ${botToken}` }
            })

            if (webhookRes.ok) {
                const webhooks = await webhookRes.json()
                let targetWebhook = webhooks.find((w: any) => w.name === agent.name)

                if (!targetWebhook) {
                    // Create it if it doesn't exist
                    const createRes = await fetch(`${DISCORD_API}/channels/${channelId}/webhooks`, {
                        method: "POST",
                        headers: { 
                            "Authorization": `Bot ${botToken}`,
                            "Content-Type": "application/json"
                        },
                        body: JSON.stringify({ name: agent.name })
                    })
                    if (createRes.ok) targetWebhook = await createRes.json()
                }

                if (targetWebhook) {
                    const postRes = await fetch(`https://discord.com/api/webhooks/${targetWebhook.id}/${targetWebhook.token}`, {
                        method: "POST",
                        headers: { "Content-Type": "application/json" },
                        body: JSON.stringify({
                            content,
                            username: agent.name,
                            ...(agent.avatar_url ? { avatar_url: agent.avatar_url } : {})
                        })
                    })
                    if (postRes.ok) return true
                }
            }

            // Fallback: Use standard bot message
            const res = await fetch(`${DISCORD_API}/channels/${channelId}/messages`, {
                method: "POST",
                headers: {
                    "Authorization": `Bot ${botToken}`,
                    "Content-Type": "application/json"
                },
                body: JSON.stringify({ content })
            })

            return res.ok
        } catch (err) {
            this.logger.error("Discord delivery error", err)
            return false
        }
    }
}
