/**
 * complete-discord-auth/index.ts
 * Handshakes with Discord to finalize the "Neural Bridge" for a Project.
 * Stores Guild IDs and Bot Credentials in the community_channels table.
 */

import { createHandler, Logger, DiscordProvider, Repo, okResponse, validationErrorResponse } from "../_shared/lib/index.ts"

export default createHandler(async ({ adminClient, body, user }) => {
    const logger = new Logger("complete-discord-auth")
    const { code, state, redirect_uri } = body

    if (!code || !state) {
        return validationErrorResponse("Missing auth code or state correlation.")
    }

    // State is expected to be the Project ID (sent from frontend)
    const projectId = state
    const discord = new DiscordProvider()

    try {
        // 1. Exchange Code for Tokens
        logger.info("Exchanging code for Discord tokens...", { projectId })
        const tokenData = await discord.exchangeCodeForToken(code, redirect_uri)
        
        // When a bot is added via OAuth2, Discord returns guild information
        const { access_token, refresh_token, expires_in, guild } = tokenData

        if (!guild) {
            throw new Error("No guild detected in the Discord handshake. Ensure 'bot' scope was selected.")
        }

        // 2. Resolve User & Project context
        const { data: project, error: pErr } = await adminClient
            .from("projects")
            .select("id, name, slug")
            .eq("id", projectId)
            .single()

        if (pErr || !project) throw new Error("Target project node not found.")

        // 3. Provision / Update the Community Channel Bridge
        logger.info(`Provisioning Discord Bridge for: ${guild.name} (${guild.id})`)
        
        let channel;
        const { data: existing, error: eErr } = await adminClient
            .from("community_channels")
            .select("id")
            .eq("project_id", projectId)
            .eq("platform", "discord")
            .filter("config->>guild_id", "eq", guild.id)
            .maybeSingle()

        if (existing) {
            const { data: updated, error: uErr } = await adminClient
                .from("community_channels")
                .update({
                    name: guild.name,
                    config: {
                        guild_id: guild.id,
                        access_token,
                        refresh_token,
                        expires_at: new Date(Date.now() + (expires_in * 1000)).toISOString(),
                        permissions: tokenData.permissions
                    }
                })
                .eq("id", existing.id)
                .select()
                .single()
            if (uErr) throw uErr
            channel = updated
        } else {
            const { data: created, error: iErr } = await adminClient
                .from("community_channels")
                .insert({
                    project_id: projectId,
                    name: guild.name,
                    platform: "discord",
                    config: {
                        guild_id: guild.id,
                        access_token,
                        refresh_token,
                        expires_at: new Date(Date.now() + (expires_in * 1000)).toISOString(),
                        permissions: tokenData.permissions
                    }
                })
                .select()
                .single()
            if (iErr) throw iErr
            channel = created
        }

        return okResponse({ 
            success: true, 
            channel_id: channel.id,
            guild_name: guild.name,
            project_slug: project.slug
        })

    } catch (err) {
        logger.error("Discord Bridge Failure", err)
        return validationErrorResponse(err instanceof Error ? err.message : "Handshake failed.")
    }
}, {
    requireAuth: true // User must be logged in to Agency to link a channel
})
