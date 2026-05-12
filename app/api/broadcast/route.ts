import { NextResponse } from "next/server"
import { createClient } from "@supabase/supabase-js"

// Service-role client — bypasses RLS entirely (safe because this is server-side only)
function createAdminClient() {
    return createClient(
        process.env.NEXT_PUBLIC_SUPABASE_URL!,
        process.env.SUPABASE_SERVICE_ROLE_KEY!
    )
}

export async function POST(req: Request) {
    try {
        const { agent_id, deployment_id, message, use_ai, project_id } = await req.json()

        if (!agent_id || !deployment_id || !message || !project_id) {
            return NextResponse.json({ error: "Missing required fields" }, { status: 400 })
        }

        const supabase = createAdminClient()

        // 1. Resolve agent
        const { data: agent, error: agentErr } = await supabase
            .from("community_agents")
            .select("*")
            .eq("id", agent_id)
            .single()

        if (agentErr || !agent) {
            return NextResponse.json({ error: `Agent not found: ${agentErr?.message}` }, { status: 404 })
        }

        // 2. Resolve deployment + channel
        const { data: deployment, error: depErr } = await supabase
            .from("community_agent_deployments")
            .select("*, channel:channel_id(*)")
            .eq("id", deployment_id)
            .single() as any

        if (depErr || !deployment) {
            return NextResponse.json({ error: `Deployment not found: ${depErr?.message}` }, { status: 404 })
        }

        let broadcastContent = message

        // 3. AI Refinement (if enabled and key exists)
        if (use_ai && process.env.GEMINI_API_KEY) {
            try {
                const aiRes = await fetch(
                    `https://generativelanguage.googleapis.com/v1beta/models/gemini-1.5-flash-latest:generateContent?key=${process.env.GEMINI_API_KEY}`,
                    {
                        method: "POST",
                        headers: { "Content-Type": "application/json" },
                        body: JSON.stringify({
                            system_instruction: {
                                parts: [{
                                    text: `You are ${agent.name}, ${agent.role}. 
Personality: ${agent.persona_prompt}
Mood: ${agent.mood || "Focused"}
Mission: ${agent.mission_objective || "Broadcast intelligence."}
RULES: Stay in character. Refine the user's topic into a polished, platform-appropriate broadcast under 1800 characters. ${deployment.channel?.platform === 'discord' ? 'Use Discord markdown.' : ''} Be strategic, not gimmicky.`
                                }]
                            },
                            contents: [{
                                parts: [{ text: `Draft a broadcast for this topic: ${message}` }]
                            }]
                        })
                    }
                )

                if (aiRes.ok) {
                    const aiData = await aiRes.json()
                    const refined = aiData?.candidates?.[0]?.content?.parts?.[0]?.text
                    if (refined) broadcastContent = refined
                }
            } catch (aiErr) {
                console.warn("[Broadcast API] AI refinement failed, using raw message:", aiErr)
            }
        }

        // 4. Discord delivery (if applicable)
        let deliveryStatus = "logged"
        const platform = deployment.channel?.platform
        const channelConfig = deployment.channel?.config ?? {}

        console.log("[Broadcast API] Platform:", platform)
        console.log("[Broadcast API] Channel config keys:", Object.keys(channelConfig))

        if (platform === "discord") {
            // Path A: Webhook URL (simplest — no bot token needed)
            const webhookUrl = channelConfig.webhookUrl as string | undefined
            // Path B: Bot token + Discord channel ID from OAuth callback
            const discordChannelId = channelConfig.channel_id as string | undefined
            const discordToken = process.env.DISCORD_BOT_TOKEN

            if (webhookUrl) {
                console.log("[Broadcast API] Attempting webhook delivery...")
                try {
                    const webhookRes = await fetch(webhookUrl, {
                        method: "POST",
                        headers: { "Content-Type": "application/json" },
                        body: JSON.stringify({
                            content: broadcastContent,
                            username: agent.name,
                            ...(agent.avatar_url ? { avatar_url: agent.avatar_url } : {})
                        })
                    })
                    deliveryStatus = webhookRes.ok ? "sent" : `webhook_failed_${webhookRes.status}`
                    console.log("[Broadcast API] Webhook delivery result:", deliveryStatus)
                } catch (webhookErr) {
                    console.warn("[Broadcast API] Webhook delivery threw error:", webhookErr)
                    deliveryStatus = "webhook_error"
                }
            } else if (discordChannelId && discordToken) {
                console.log("[Broadcast API] Attempting bot token delivery to channel:", discordChannelId)
                try {
                    const discordRes = await fetch(`https://discord.com/api/v10/channels/${discordChannelId}/messages`, {
                        method: "POST",
                        headers: {
                            Authorization: `Bot ${discordToken}`,
                            "Content-Type": "application/json"
                        },
                        body: JSON.stringify({ content: broadcastContent })
                    })
                    const discordBody = await discordRes.text()
                    deliveryStatus = discordRes.ok ? "sent" : `bot_failed_${discordRes.status}`
                    console.log("[Broadcast API] Bot delivery result:", deliveryStatus, discordBody.substring(0, 200))
                } catch (botErr) {
                    console.warn("[Broadcast API] Bot delivery threw error:", botErr)
                    deliveryStatus = "bot_error"
                }
            } else {
                // Missing config — log exactly what's available to help debug
                console.warn("[Broadcast API] Discord delivery skipped — no webhook URL or channel_id in config.", {
                    hasWebhookUrl: !!webhookUrl,
                    hasChannelId: !!discordChannelId,
                    hasBotToken: !!discordToken,
                    configKeys: Object.keys(channelConfig)
                })
                deliveryStatus = "skipped_no_config"
            }
        }

        // 5. Log the interaction (admin client bypasses RLS)
        const { data: interaction, error: logErr } = await supabase
            .from("community_agent_interactions")
            .insert({
                agent_id,
                project_id,
                channel_id: deployment.channel_id,
                platform,
                room_id: "broadcast",
                message_type: "broadcast",
                content: broadcastContent,
                external_id: deliveryStatus
            })
            .select("id")
            .single()

        if (logErr) {
            console.error("[Broadcast API] Log error:", logErr)
        }

        return NextResponse.json({
            success: true,
            interaction_id: interaction?.id,
            delivery_status: deliveryStatus,
            ai_refined: broadcastContent !== message
        })

    } catch (err: any) {
        console.error("[Broadcast API] Fatal error:", err)
        return NextResponse.json({ error: err.message || "Broadcast failed" }, { status: 500 })
    }
}
