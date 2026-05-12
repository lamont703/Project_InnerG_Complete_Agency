/**
 * deploy-emoji/index.ts
 * Deploys a custom emoji to a Discord Guild via the Bot API.
 * Called from the Neural Emoji Forge in the Community Hub.
 */

import { createHandler, Logger, okResponse, validationErrorResponse } from "../_shared/lib/index.ts"

const DISCORD_API = "https://discord.com/api/v10"

export default createHandler(async ({ adminClient, body, user }) => {
    const logger = new Logger("deploy-emoji")
    const { channel_id, emoji_name, image_data } = body

    if (!channel_id || !emoji_name || !image_data) {
        return validationErrorResponse("Missing channel_id, emoji_name, or image_data.")
    }

    // Validate emoji name (Discord rules: alphanumeric + underscores, 2+ chars)
    const validName = /^[a-zA-Z0-9_]{2,32}$/.test(emoji_name)
    if (!validName) {
        return validationErrorResponse("Emoji name must be 2-32 characters, alphanumeric and underscores only.")
    }

    try {
        // 1. Fetch the community channel to get guild + bot credentials
        const { data: channel, error: cErr } = await adminClient
            .from("community_channels")
            .select("id, name, config, project_id")
            .eq("id", channel_id)
            .eq("platform", "discord")
            .single()

        if (cErr || !channel) throw new Error("Discord bridge channel not found.")

        const guildId = channel.config?.guild_id
        const botToken = Deno.env.get("DISCORD_BOT_TOKEN")

        if (!guildId) throw new Error("No guild_id found in channel bridge config.")
        if (!botToken) throw new Error("DISCORD_BOT_TOKEN is not configured.")

        // 2. Validate the image data URI sent from the browser
        // Format expected: data:image/png;base64,BASE64_DATA
        if (!image_data.startsWith("data:")) {
            throw new Error("image_data must be a valid Base64 data URI.")
        }

        // Estimate byte size from Base64 length (approx 3/4 of chars)
        const base64Part = image_data.split(",")[1] || ""
        const estimatedBytes = Math.round(base64Part.length * 0.75)
        if (estimatedBytes > 256 * 1024) {
            throw new Error(`Image too large (~${Math.round(estimatedBytes / 1024)}KB). Discord max is 256KB.`)
        }

        logger.info(`Deploying emoji :${emoji_name}: to guild ${guildId} (~${Math.round(estimatedBytes / 1024)}KB)`)
        const discordRes = await fetch(`${DISCORD_API}/guilds/${guildId}/emojis`, {
            method: "POST",
            headers: {
                "Authorization": `Bot ${botToken}`,
                "Content-Type": "application/json"
            },
            body: JSON.stringify({
                name: emoji_name,
                image: image_data
            })
        })

        if (!discordRes.ok) {
            const err = await discordRes.json().catch(() => ({ message: discordRes.statusText }))
            throw new Error(`Discord API Error: ${err.message || JSON.stringify(err)}`)
        }

        const emoji = await discordRes.json()
        logger.info(`Emoji deployed successfully: ${emoji.id}`)

        // 4. Log the deployment in the channel config
        await adminClient
            .from("community_channels")
            .update({
                config: {
                    ...channel.config,
                    deployed_emojis: [
                        ...(channel.config?.deployed_emojis || []),
                        { id: emoji.id, name: emoji.name, deployed_at: new Date().toISOString() }
                    ]
                }
            })
            .eq("id", channel_id)

        return okResponse({
            success: true,
            emoji_id: emoji.id,
            emoji_name: emoji.name,
            guild_name: channel.name,
        })

    } catch (err) {
        logger.error("Emoji Deployment Failure", err)
        return validationErrorResponse(err instanceof Error ? err.message : "Emoji deployment failed.")
    }
}, {
    requireAuth: true
})
