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
        
        // 2. Use agent or fall back to a default Inner G persona
        const activeAgent = agent || {
            name: "MASE",
            role: "Community Intelligence Agent",
            persona_prompt: "You are MASE, an AI-powered community intelligence agent for Inner G Complete Agency. You are sharp, knowledgeable, and deliver real value. You help community members grow, learn, and take action.",
            mood: "Engaged and energetic",
            mission_objective: "Educate, engage, and elevate every community member.",
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

        // 6. Truncate to Discord's 2000 char limit + format with embed
        const content = text.slice(0, 1900)
        const embed = {
            description: content,
            color: 0x7c3aed,
            author: {
                name: `${activeAgent.name} • ${activeAgent.role}`
            },
            footer: { text: `/${commandName} • Inner G Intelligence Layer` }
        }

        // 7. Send the follow-up to Discord
        await this.sendFollowUp(appId, interactionToken, { embeds: [embed] })

        this.logger.info(`Follow-up delivered for /${commandName}`)
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

        return basePersona
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
