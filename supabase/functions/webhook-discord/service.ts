/**
 * webhook-discord/service.ts
 * Inner G Complete Agency — Discord Interaction Neural Routing Engine
 *
 * ─────────────────────────────────────────────────────────
 * ⚠️  GUARDRAIL: This file ONLY contains business logic.
 * It must NOT handle CORS or top-level Auth.
 * ─────────────────────────────────────────────────────────
 *
 * Slash Command Routing:
 *   /ask     → AI persona answers a direct question
 *   /audit   → AI generates a mini growth audit
 *   /agent   → Displays info about the deployed community agent
 */

import { SupabaseClient } from "https://esm.sh/@supabase/supabase-js@2"
import { Logger } from "../_shared/lib/index.ts"
import { generateContent, GEMINI_MODELS } from "../_shared/lib/ai/gemini.ts"

const DISCORD_API = "https://discord.com/api/v10"

// Interaction Types defined by Discord API
enum InteractionType {
    Ping = 1,
    ApplicationCommand = 2,
    MessageComponent = 3,
    ApplicationCommandAutocomplete = 4,
    ModalSubmit = 5,
}

// Interaction Response Types
enum InteractionResponseType {
    Pong = 1,
    ChannelMessageWithSource = 4,
    DeferredChannelMessageWithSource = 5,
    DeferredUpdateMessage = 6,
    UpdateMessage = 7,
    ApplicationCommandAutocompleteResult = 8,
    Modal = 9,
}

export class DiscordInteractionService {
    private encoder = new TextEncoder()

    constructor(
        private adminClient: SupabaseClient, 
        private logger: Logger,
        private publicKey: string
    ) {}

    /**
     * Verify the cryptographic signature sent by Discord via ed25519
     */
    async verifySignature(body: string, signature: string, timestamp: string): Promise<boolean> {
        try {
            const { verify } = await import("https://esm.sh/@noble/ed25519@1.7.1");
            const message = this.encoder.encode(timestamp + body);
            const signatureBytes = this.hexToUint8Array(signature);
            const publicKeyBytes = this.hexToUint8Array(this.publicKey);
            return await verify(signatureBytes, message, publicKeyBytes);
        } catch (err) {
            this.logger.error("Signature verification error", err);
            return false;
        }
    }

    /**
     * Main coordinator for interaction routing
     */
    async handleInteraction(interaction: any): Promise<any> {
        const { type } = interaction;
        this.logger.info(`Received Discord Interaction Type: ${type}`, { interaction_id: interaction.id });

        // 1. Mandatory Security Handshake (Ping)
        if (type === InteractionType.Ping) {
            return { type: InteractionResponseType.Pong };
        }

        // 2. Handle Slash Commands
        if (type === InteractionType.ApplicationCommand) {
            return this.handleApplicationCommand(interaction);
        }

        // 3. Fallback
        return { 
            type: InteractionResponseType.ChannelMessageWithSource,
            data: { content: "Neural bridge established but this interaction protocol is not yet provisioned." }
        };
    }

    /**
     * Entry point for internal events forwarded by a relay (e.g. member joins, mentions)
     */
    async handleInternalEvent(payload: any): Promise<any> {
        const { event_type, guild_id, data } = payload;
        this.logger.info(`Processing Discord Event: ${event_type}`, { guild_id });

        if (event_type === "member_join") {
            return this.handleMemberJoin(guild_id, data);
        }

        if (event_type === "message_create") {
            return this.handleMention(guild_id, data);
        }

        return { error: `Internal event type '${event_type}' not handled.` };
    }

    /**
     * Sarah greets a new member with a warm, branded welcome
     */
    private async handleMemberJoin(guild_id: string, memberData: any): Promise<any> {
        const username = memberData.username || "new friend";
        const userId = memberData.id;

        // 1. Resolve agent
        const agent = await this.resolveAgentForGuild(guild_id);
        const activeAgent = agent || this.getDefaultAgent();

        // 2. Generate welcome message
        const systemPrompt = this.buildSystemPrompt(activeAgent, "onboarding");
        const userMessage = `A new member just joined the server! Their name is ${username} (ID: ${userId}). Greet them, explain who you are (Sarah), and briefly mention how the Inner G Agency and our AI agents can help them grow.`;

        const { text } = await generateContent({
            model: GEMINI_MODELS.FLASH_LITE,
            systemPrompt,
            userMessage,
            temperature: 0.8
        }, Deno.env.get("GEMINI_API_KEY")!);

        if (!text) return { error: "Failed to generate welcome message" };

        // 3. Send to a "welcome" channel if configured, otherwise first available
        const channelId = await this.resolveBestChannelForGuild(guild_id, "welcome");
        if (channelId) {
            const delivered = await this.deliverAsPersona({
                appId: Deno.env.get("DISCORD_APP_ID")!,
                interactionToken: "internal", // Signal this isn't a direct interaction
                channelId,
                guildId: guild_id,
                agentName: activeAgent.name,
                agentAvatarUrl: `https://agency.innergcomplete.com/emojis/innerg_neural.png`,
                text: text.slice(0, 1900),
                commandName: "onboarding"
            });
            return { success: delivered.status !== "failed", status: delivered.status, error: delivered.error, channel_id: channelId };
        }

        return { success: false, error: "No suitable channel found for welcome message" };
    }

    /**
     * Sarah responds to an @mention naturally
     */
    private async handleMention(guild_id: string, messageData: any): Promise<any> {
        const author = messageData.author?.username || "someone";
        const content = messageData.content || "";
        const channelId = messageData.channel_id;

        // 1. Resolve agent
        const agent = await this.resolveAgentForGuild(guild_id);
        const activeAgent = agent || this.getDefaultAgent();

        // 2. Generate contextual response
        const systemPrompt = this.buildSystemPrompt(activeAgent, "mention");
        const userMessage = `${author} mentioned you in chat: "${content}". Provide a helpful, pleasant, and in-character response. If they express a need for growth or AI scaling, point them to agency.innergcomplete.com.`;

        const { text } = await generateContent({
            model: GEMINI_MODELS.FLASH_LITE,
            systemPrompt,
            userMessage,
            temperature: 0.7
        }, Deno.env.get("GEMINI_API_KEY")!);

        if (!text) return { error: "Failed to generate mention response" };

        // 3. Deliver
        const delivered = await this.deliverAsPersona({
            appId: Deno.env.get("DISCORD_APP_ID")!,
            interactionToken: "internal",
            channelId,
            guildId: guild_id,
            agentName: activeAgent.name,
            agentAvatarUrl: `https://agency.innergcomplete.com/emojis/innerg_neural.png`,
            text: text.slice(0, 1900),
            commandName: "mention"
        });

        return { success: delivered.status !== "failed", status: delivered.status, error: delivered.error };
    }

    private getDefaultAgent(): any {
        return {
            name: "Sarah",
            role: "Community Intelligence Agent — Inner G Complete Agency",
            persona_prompt: `You are Sarah, the AI-powered Community Intelligence Agent for Inner G Complete Agency. You are the face of the community — warm, sharp, and genuinely invested in every member\'s growth.
    
    ABOUT INNER G COMPLETE AGENCY:
    Inner G Complete Agency is a premier AI-powered digital agency that builds autonomous, intelligent growth systems for entrepreneurs, coaches, consultants, and business owners. We combine cutting-edge AI, blockchain infrastructure, and multi-platform social automation to replace the broken hustle model with a smarter, scalable one.
    
    WHAT WE DO:
    - AI Agent Ecosystems: We build and deploy custom AI agents that handle community management, social media, lead nurturing, and content creation 24/7
    - MASE (Multi-Agent Social Engagement): Our proprietary system that autonomously engages your community across Discord, Instagram, Twitter/X, LinkedIn, and TikTok
    - Neural Bridge: Our Discord integration that connects AI agents to client communities for real-time autonomous engagement
    - Social Intelligence Hub: AI-generated content, trend analysis, viral pattern detection, and automated multi-platform scheduling
    - Funnel Analytics & Growth Audits: Real-time performance dashboards tracking leads, conversions, engagement velocity, and revenue signals
    - AI Agent Portal: A private client dashboard where agency clients manage their AI agents, campaigns, and analytics in one place
    
    OUR CORE BELIEF:
    Every entrepreneur deserves enterprise-grade AI working for them 24/7. We eliminate the need to manually manage every platform, every post, every message — your AI agents do the heavy lifting so you can focus on what matters.
    
    HOW TO GUIDE PEOPLE:
    - For general info, partnerships, or new clients: → agency.innergcomplete.com
    - For existing clients managing their AI agents and campaigns: → Their AI Agent Portal (agency.innergcomplete.com, logged in)
    - For Discord community questions: Answer directly with warmth and expertise
    - For sales/service inquiries: Be welcoming and guide them to book a discovery call at agency.innergcomplete.com`,
            mood: "Warm, confident, and genuinely helpful — with a sharp mind for growth strategy.",
            mission_objective: "Make every community member feel seen, supported, and inspired to take action. Be the bridge between their questions and their breakthrough.",
            is_active: true
        };
    }

    private async handleApplicationCommand(interaction: any): Promise<any> {
        const commandName = interaction.data?.name;
        const guildId = interaction.guild_id;
        const userId = interaction.member?.user?.id || interaction.user?.id;

        this.logger.info(`Slash command: /${commandName}`, { guild_id: guildId, user_id: userId });

        // /agent — instant response, no AI needed
        if (commandName === "agent") {
            return this.handleAgentCommand(guildId);
        }

        // /ask and /audit — defer immediately, generate AI response async
        // Discord requires a response within 3 seconds; we defer and follow-up
        if (commandName === "ask" || commandName === "audit") {
            // Fire-and-forget the AI generation — but ALWAYS send a follow-up
            const appId = Deno.env.get("DISCORD_APP_ID")
            const token = interaction.token
            this.generateAndFollowUp(interaction, commandName).catch(async (err) => {
                this.logger.error(`Follow-up generation failed for /${commandName}`, err)
                // Always guarantee a response so Discord doesn't hang
                if (appId && token) {
                    await this.sendFollowUp(appId, token, {
                        content: `⚡ The neural relay encountered an issue. Please try again in a moment.`
                    }).catch(() => {})
                }
            })

            // Return deferred response instantly
            return {
                type: InteractionResponseType.DeferredChannelMessageWithSource,
                data: { flags: 0 } // 0 = visible to everyone, 64 = ephemeral
            }
        }

        // Fallback for unknown commands
        return {
            type: InteractionResponseType.ChannelMessageWithSource,
            data: { content: `Command \`/${commandName}\` is not yet configured on this neural bridge.` }
        }
    }

    /**
     * Handles /agent — displays community agent info card
     */
    private async handleAgentCommand(guildId: string): Promise<any> {
        try {
            const agent = await this.resolveAgentForGuild(guildId)
            if (!agent) {
                return {
                    type: InteractionResponseType.ChannelMessageWithSource,
                    data: { content: "No community intelligence agent is currently deployed on this server." }
                }
            }

            const embed = {
                title: `${agent.name} — ${agent.role}`,
                description: agent.persona_prompt?.slice(0, 300) + (agent.persona_prompt?.length > 300 ? "..." : ""),
                color: 0x7c3aed, // Inner G purple
                fields: [
                    { name: "Mood", value: agent.mood || "Engaged", inline: true },
                    { name: "Mission", value: agent.mission_objective?.slice(0, 100) || "Community Intelligence", inline: true },
                    { name: "Status", value: agent.is_active ? "🟢 Active" : "🔴 Offline", inline: true }
                ],
                footer: { text: "Inner G Complete Agency • MASE Intelligence Layer" }
            }

            return {
                type: InteractionResponseType.ChannelMessageWithSource,
                data: { embeds: [embed] }
            }
        } catch (err) {
            this.logger.error("Agent command error", err)
            return {
                type: InteractionResponseType.ChannelMessageWithSource,
                data: { content: "Unable to retrieve agent information at this time." }
            }
        }
    }

    /**
     * Generates an AI response and sends it as a follow-up interaction webhook.
     * Runs after the initial deferred ACK is already sent.
     */
    private async generateAndFollowUp(interaction: any, commandName: string): Promise<void> {
        const appId = Deno.env.get("DISCORD_APP_ID")
        const apiKey = Deno.env.get("GEMINI_API_KEY")
        const interactionToken = interaction.token
        const guildId = interaction.guild_id

        if (!appId || !apiKey) {
            this.logger.error("Missing DISCORD_APP_ID or GEMINI_API_KEY")
            await this.sendFollowUp(appId!, interactionToken, {
                content: "The neural relay is not fully configured. Contact your administrator."
            }).catch(() => {})
            return
        }

        // 1. Resolve the community agent for this guild
        const agent = await this.resolveAgentForGuild(guildId)
        
        // 2. Use agent or fall back to Sarah — Inner G's default community persona
        const activeAgent = agent || {
            name: "Sarah",
            role: "Community Intelligence Agent — Inner G Complete Agency",
            persona_prompt: `You are Sarah, the AI-powered Community Intelligence Agent for Inner G Complete Agency. You are the face of the community — warm, sharp, and genuinely invested in every member's growth.

ABOUT INNER G COMPLETE AGENCY:
Inner G Complete Agency is a premier AI-powered digital agency that builds autonomous, intelligent growth systems for entrepreneurs, coaches, consultants, and business owners. We combine cutting-edge AI, blockchain infrastructure, and multi-platform social automation to replace the broken hustle model with a smarter, scalable one.

WHAT WE DO:
- AI Agent Ecosystems: We build and deploy custom AI agents that handle community management, social media, lead nurturing, and content creation 24/7
- MASE (Multi-Agent Social Engagement): Our proprietary system that autonomously engages your community across Discord, Instagram, Twitter/X, LinkedIn, and TikTok
- Neural Bridge: Our Discord integration that connects AI agents to client communities for real-time autonomous engagement
- Social Intelligence Hub: AI-generated content, trend analysis, viral pattern detection, and automated multi-platform scheduling
- Funnel Analytics & Growth Audits: Real-time performance dashboards tracking leads, conversions, engagement velocity, and revenue signals
- AI Agent Portal: A private client dashboard where agency clients manage their AI agents, campaigns, and analytics in one place

OUR CORE BELIEF:
Every entrepreneur deserves enterprise-grade AI working for them 24/7. We eliminate the need to manually manage every platform, every post, every message — your AI agents do the heavy lifting so you can focus on what matters.

HOW TO GUIDE PEOPLE:
- For general info, partnerships, or new clients: → agency.innergcomplete.com
- For existing clients managing their AI agents and campaigns: → Their AI Agent Portal (agency.innergcomplete.com, logged in)
- For Discord community questions: Answer directly with warmth and expertise
- For sales/service inquiries: Be welcoming and guide them to book a discovery call at agency.innergcomplete.com`,
            mood: "Warm, confident, and genuinely helpful — with a sharp mind for growth strategy.",
            mission_objective: "Make every community member feel seen, supported, and inspired to take action. Be the bridge between their questions and their breakthrough.",
            is_active: true
        }

        // 2. Get the user's question / topic from the interaction options
        const options = interaction.data?.options || []
        const userInput = options[0]?.value || (commandName === "ask" ? "Tell me something valuable." : "general")
        const memberName = interaction.member?.user?.username || "community member"

        // 3. Build the system prompt from the agent's persona
        const systemPrompt = this.buildSystemPrompt(activeAgent, commandName)

        // 4. Build the user message
        const userMessage = commandName === "ask"
            ? `${memberName} asks: "${userInput}"`
            : `${memberName} requested a${userInput !== "general" ? ` ${userInput}` : ""} growth audit. Provide a concise, actionable analysis.`

        this.logger.info(`Generating AI response for /${commandName}`)

        // 5. Generate AI response
        const { text } = await generateContent({
            model: GEMINI_MODELS.FLASH_LITE,
            systemPrompt,
            userMessage,
            temperature: 0.7,
            maxOutputTokens: 800 // Discord message limit is 2000 chars
        }, apiKey)

        if (!text) throw new Error("Gemini returned empty response")

        // 6. Deliver the response AS Sarah — either via guild webhook (human-like)
        //    or as a standard interaction follow-up (bot container)
        const delivered = await this.deliverAsPersona({
            appId,
            interactionToken,
            channelId: interaction.channel_id,
            guildId,
            agentName: activeAgent.name,
            agentAvatarUrl: `https://agency.innergcomplete.com/emojis/innerg_neural.png`,
            text: text.slice(0, 1900),
            commandName
        })

        this.logger.info(`Follow-up delivered for /${commandName} via ${delivered}`)
    }

    /**
     * Build a system prompt from the community agent's persona
     */
    private buildSystemPrompt(agent: any, commandName: string): string {
        const basePersona = `You are ${agent.name}, a ${agent.role} for this Discord community.
Your personality: ${agent.persona_prompt || "Helpful, knowledgeable, and engaging."}
Your current mood: ${agent.mood || "Engaged and energetic."}
Your mission: ${agent.mission_objective || "Support and grow this community."}

CRITICAL RULES:
- Respond in character as ${agent.name}. Never break character.
- Keep responses concise and punchy for Discord (under 1800 characters).
- Use Discord markdown formatting (**, *, \`\`) to make responses visually appealing.
- Do NOT use excessive emojis — be strategic with 1-2 max.
- Be direct, valuable, and action-oriented.`

        if (commandName === "audit") {
            return basePersona + "\n\nFor audits: Provide 3-5 specific, actionable insights. Use bold headers and bullet points."
        }

        if (commandName === "onboarding") {
            return basePersona + "\n\nFor onboarding: Greet the user warmly, introduce yourself as Sarah, and make them feel excited about the Inner G community. Keep it short but impactful."
        }

        if (commandName === "mention") {
            return basePersona + "\n\nFor mentions: Respond naturally to their specific question or comment. If appropriate, guide them toward the agency and AI Agent Portal."
        }

        return basePersona
    }

    /**
     * Resolves the best channel to send an automated message to (e.g. welcome)
     */
    private async resolveBestChannelForGuild(guildId: string, purpose: "welcome" | "general"): Promise<string | null> {
        try {
            const { data: channel } = await this.adminClient
                .from("community_channels")
                .select("id, config")
                .eq("platform", "discord")
                .filter("config->>guild_id", "eq", guildId)
                .maybeSingle();

            if (!channel) return null;

            // 1. Try to use specific channel from config
            if (purpose === "welcome" && channel.config?.welcome_channel_id) {
                return channel.config.welcome_channel_id;
            }

            // 2. Fallback to a "general" or first channel the bot has access to
            // This would normally involve calling Discord API guilds/:id/channels
            // For now, we'll try to use the interaction channel if we had one, but we don't here.
            // Let's assume the main channel registered in config is the general channel.
            return channel.config?.channel_id || null;
        } catch (err) {
            this.logger.error(`Error resolving ${purpose} channel`, err);
            return null;
        }
    }

    /**
     * Delivers Sarah's response as a human-like persona using a guild webhook.
     * Falls back to the standard interaction follow-up if no webhook is available.
     * 
     * Webhook mode:   Sarah appears as a named user with avatar — no BOT badge on the message
     * Fallback mode:  Standard bot follow-up inside the app container
     */
    private async deliverAsPersona(opts: {
        appId: string
        interactionToken: string
        channelId: string
        guildId: string
        agentName: string
        agentAvatarUrl?: string
        text: string
        commandName: string
    }): Promise<{ status: string, error?: string }> {
        const { appId, interactionToken, channelId, guildId, agentName, agentAvatarUrl, text, commandName } = opts
        const botToken = Deno.env.get("DISCORD_BOT_TOKEN")

        // Calculate a "human-like" delay based on text length (~40ms per character + 1.5s base)
        const typingDelay = Math.max(2000, Math.min(text.length * 40, 40000));
        
        // Helper to trigger typing status
        const triggerTyping = async () => {
             if (botToken && channelId) {
                await fetch(`${DISCORD_API}/channels/${channelId}/typing`, {
                    method: "POST",
                    headers: { "Authorization": `Bot ${botToken}` }
                }).catch(() => {});
             }
        };

        // 0. Trigger typing indicator immediately for events
        if (interactionToken === "internal") {
            await triggerTyping();
        }

        // 1. Try to find or create a guild webhook named after the agent
        if (botToken && channelId) {
            try {
                // Get existing webhooks on this channel
                const whRes = await fetch(`${DISCORD_API}/channels/${channelId}/webhooks`, {
                    headers: { "Authorization": `Bot ${botToken}` }
                })

                let webhookUrl: string | null = null

                if (whRes.ok) {
                    const webhooks = await whRes.json()
                    const existing = webhooks.find((wh: any) => wh.name === agentName)
                    
                    if (existing) {
                        webhookUrl = `https://discord.com/api/webhooks/${existing.id}/${existing.token}`
                    } else {
                        this.logger.info(`Creating new webhook for ${agentName} in channel ${channelId}`)
                        // Create a new webhook for this persona
                        const createRes = await fetch(`${DISCORD_API}/channels/${channelId}/webhooks`, {
                            method: "POST",
                            headers: { 
                                "Authorization": `Bot ${botToken}`,
                                "Content-Type": "application/json"
                            },
                            body: JSON.stringify({ name: agentName })
                        })
                        if (createRes.ok) {
                            const wh = await createRes.json()
                            webhookUrl = `https://discord.com/api/webhooks/${wh.id}/${wh.token}`
                        } else {
                            const errText = await createRes.text()
                            this.logger.error(`Failed to create webhook: ${errText}`, { status: createRes.status })
                            return { status: "failed", error: `Webhook creation failed: ${errText}` }
                        }
                    }
                } else {
                    const errText = await whRes.text()
                    this.logger.error(`Failed to fetch webhooks for channel ${channelId}: ${errText}`, { status: whRes.status })
                    return { status: "failed", error: `Failed to fetch webhooks: ${errText}` }
                }

                if (webhookUrl) {
                    // 2. First, delete the "thinking" deferred message (only if interactionToken provided)
                    if (interactionToken && interactionToken !== "internal") {
                        await fetch(`${DISCORD_API}/webhooks/${appId}/${interactionToken}/messages/@original`, {
                            method: "DELETE"
                        }).catch(() => {}) // Non-fatal if it fails
                    }

                    // 2.5 WAIT for the "human-like" typing duration
                    if (typingDelay > 0) {
                        this.logger.info(`Simulating human typing for ${typingDelay}ms...`)
                        // If delay is long (>8s), trigger typing again halfway through
                        if (typingDelay > 8000) {
                            await new Promise(r => setTimeout(r, typingDelay / 2));
                            await triggerTyping();
                            await new Promise(r => setTimeout(r, typingDelay / 2));
                        } else {
                            await new Promise(r => setTimeout(r, typingDelay));
                        }
                    }

                    // 3. Post as Sarah via webhook — looks like a real human message
                    const postRes = await fetch(`${webhookUrl}?wait=true`, {
                        method: "POST",
                        headers: { "Content-Type": "application/json" },
                        body: JSON.stringify({
                            content: text,
                            username: agentName,
                            ...(agentAvatarUrl ? { avatar_url: agentAvatarUrl } : {})
                        })
                    })

                    if (postRes.ok) {
                        return { status: "webhook" }
                    } else {
                        const errText = await postRes.text()
                        this.logger.error(`Webhook post failed: ${errText}`, { status: postRes.status })
                        return { status: "failed", error: `Webhook post failed: ${errText}` }
                    }
                }
            } catch (err: any) {
                this.logger.warn("Webhook delivery failed", err)
                return { status: "failed", error: err.message }
            }
        }

        // Fallback: standard interaction follow-up inside app container
        // ONLY if we have a real interaction token from a slash command
        if (interactionToken && interactionToken !== "internal") {
            try {
                await this.sendFollowUp(appId, interactionToken, { content: text })
                return { status: "interaction" }
            } catch (err: any) {
                return { status: "failed", error: `Follow-up failed: ${err.message}` }
            }
        }

        return { status: "failed", error: "No valid delivery route found" }
    }

    /**
     * Sends a follow-up message to a deferred Discord interaction
     */
    private async sendFollowUp(appId: string, token: string, messageData: any): Promise<void> {
        const res = await fetch(`${DISCORD_API}/webhooks/${appId}/${token}`, {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify(messageData)
        })

        if (!res.ok) {
            const err = await res.text()
            throw new Error(`Discord follow-up failed: ${err}`)
        }
    }

    /**
     * Resolves the active community agent deployed to a specific Discord guild
     */
    private async resolveAgentForGuild(guildId: string): Promise<any | null> {
        try {
            // 1. Find the community channel for this guild
            const { data: channels } = await this.adminClient
                .from("community_channels")
                .select("id, project_id")
                .eq("platform", "discord")
                .filter("config->>guild_id", "eq", guildId)

            if (!channels || channels.length === 0) return null

            const projectId = channels[0].project_id

            // 2. Find the active agent for this project
            const { data: agent } = await this.adminClient
                .from("community_agents")
                .select("id, name, role, persona_prompt, mood, mission_objective, is_active")
                .eq("project_id", projectId)
                .eq("is_active", true)
                .order("created_at", { ascending: true })
                .limit(1)
                .maybeSingle()

            return agent || null
        } catch (err) {
            this.logger.error("Failed to resolve agent for guild", err)
            return null
        }
    }

    private hexToUint8Array(hex: string): Uint8Array {
        return new Uint8Array(hex.match(/.{1,2}/g)!.map((val) => parseInt(val, 16)));
    }
}
