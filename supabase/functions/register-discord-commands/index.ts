/**
 * register-discord-commands/index.ts
 * Registers slash commands with Discord for a specific guild Neural Bridge.
 * This is called once per guild after the bridge is established.
 * 
 * Commands registered:
 *   /ask     — Ask the AI agent a direct question
 *   /audit   — Request a mini growth audit
 *   /agent   — Learn about the community agent
 */

import { createHandler, Logger, okResponse, validationErrorResponse } from "../_shared/lib/index.ts"

const DISCORD_API = "https://discord.com/api/v10"

const SLASH_COMMANDS = [
    {
        name: "ask",
        description: "Ask the community intelligence agent a question",
        options: [
            {
                name: "question",
                description: "What would you like to know?",
                type: 3, // STRING
                required: true
            }
        ]
    },
    {
        name: "audit",
        description: "Request a mini growth audit from the AI agent",
        options: [
            {
                name: "topic",
                description: "What area to audit? (content, engagement, growth, conversions)",
                type: 3, // STRING
                required: false
            }
        ]
    },
    {
        name: "agent",
        description: "Learn about this community's AI intelligence agent"
    }
]

export default createHandler(async ({ adminClient, body, user }) => {
    const logger = new Logger("register-discord-commands")
    const { channel_id } = body

    if (!channel_id) {
        return validationErrorResponse("Missing channel_id.")
    }

    try {
        // 1. Fetch the Discord bridge channel
        const { data: channel, error: cErr } = await adminClient
            .from("community_channels")
            .select("id, name, config, project_id")
            .eq("id", channel_id)
            .eq("platform", "discord")
            .single()

        if (cErr || !channel) throw new Error("Discord bridge channel not found.")

        const guildId = channel.config?.guild_id
        const appId = Deno.env.get("DISCORD_APP_ID")
        const botToken = Deno.env.get("DISCORD_BOT_TOKEN")

        if (!guildId) throw new Error("No guild_id found in channel config.")
        if (!appId) throw new Error("DISCORD_APP_ID is not configured.")
        if (!botToken) throw new Error("DISCORD_BOT_TOKEN is not configured.")

        logger.info(`Registering ${SLASH_COMMANDS.length} commands for guild ${guildId}`)

        // 2. Register guild-scoped slash commands (instant, no review needed)
        const res = await fetch(`${DISCORD_API}/applications/${appId}/guilds/${guildId}/commands`, {
            method: "PUT", // Bulk overwrite
            headers: {
                "Authorization": `Bot ${botToken}`,
                "Content-Type": "application/json"
            },
            body: JSON.stringify(SLASH_COMMANDS)
        })

        if (!res.ok) {
            const err = await res.json().catch(() => ({ message: res.statusText }))
            throw new Error(`Discord API Error: ${JSON.stringify(err)}`)
        }

        const commands = await res.json()
        logger.info(`Registered ${commands.length} commands successfully on guild ${guildId}`)

        // 3. Mark commands as registered in channel config
        await adminClient
            .from("community_channels")
            .update({
                config: {
                    ...channel.config,
                    commands_registered: true,
                    commands_registered_at: new Date().toISOString()
                }
            })
            .eq("id", channel_id)

        return okResponse({
            success: true,
            guild_name: channel.name,
            commands_registered: commands.map((c: any) => c.name)
        })

    } catch (err) {
        logger.error("Command Registration Failure", err)
        return validationErrorResponse(err instanceof Error ? err.message : "Command registration failed.")
    }
}, {
    requireAuth: true
})
