/**
 * _shared/lib/providers/discord.ts
 * Discord API v10 Client — OAuth 2.0, Identity, and Emoji Operations
 */

import { getEnv } from "../core/env.ts";

export class DiscordProvider {
    private baseUrl = "https://discord.com/api/v10";
    private clientId: string;
    private clientSecret: string;
    private botToken: string;

    constructor() {
        this.clientId = getEnv("DISCORD_APP_ID");
        // User provided BOT token via secrets, but client_secret is needed for OAuth
        // Discord uses Client Secret for OAuth exchange. 
        // We'll fallback to BOT token for app-level API calls.
        this.clientSecret = Deno.env.get("DISCORD_CLIENT_SECRET") || ""; 
        this.botToken = getEnv("DISCORD_BOT_TOKEN");
    }

    /**
     * Exchanges auth code for access & refresh tokens
     */
    async exchangeCodeForToken(code: string, redirectUri: string): Promise<any> {
        const body = new URLSearchParams({
            client_id: this.clientId,
            client_secret: this.clientSecret,
            code: code,
            grant_type: "authorization_code",
            redirect_uri: redirectUri
        });

        const res = await fetch(`${this.baseUrl}/oauth2/token`, {
            method: "POST",
            headers: {
                "Content-Type": "application/x-www-form-urlencoded"
            },
            body: body.toString()
        });

        if (!res.ok) {
            const err = await res.json().catch(() => ({ message: res.statusText }));
            throw new Error(`Discord Token Exchange Error: ${err.error_description || err.message || JSON.stringify(err)}`);
        }

        return await res.json();
    }

    /**
     * Fetches current authenticated user profile
     */
    async getUserMe(accessToken: string): Promise<any> {
        const res = await fetch(`${this.baseUrl}/users/@me`, {
            method: "GET",
            headers: {
                "Authorization": `Bearer ${accessToken}`
            }
        });

        if (!res.ok) {
            const err = await res.json().catch(() => ({ message: res.statusText }));
            throw new Error(`Discord User Me Error: ${err.message || JSON.stringify(err)}`);
        }

        return await res.json();
    }

    /**
     * Creates a custom emoji in a guild
     * Requires the bot to be in the guild with MANAGE_EMOJIS_AND_STICKERS permission
     */
    async createEmoji(guildId: string, name: string, imageBase64: string): Promise<any> {
        // Image must be a data URI: data:image/jpeg;base64,BASE64_DATA
        const res = await fetch(`${this.baseUrl}/guilds/${guildId}/emojis`, {
            method: "POST",
            headers: {
                "Authorization": `Bot ${this.botToken}`,
                "Content-Type": "application/json"
            },
            body: JSON.stringify({
                name,
                image: imageBase64
            })
        });

        if (!res.ok) {
            const err = await res.json().catch(() => ({ message: res.statusText }));
            throw new Error(`Discord Create Emoji Error: ${err.message || JSON.stringify(err)}`);
        }

        return await res.json();
    }

    /**
     * Sends a message to a channel
     */
    async sendMessage(channelId: string, content: string): Promise<any> {
        const res = await fetch(`${this.baseUrl}/channels/${channelId}/messages`, {
            method: "POST",
            headers: {
                "Authorization": `Bot ${this.botToken}`,
                "Content-Type": "application/json"
            },
            body: JSON.stringify({ content })
        });

        if (!res.ok) {
            const err = await res.json().catch(() => ({ message: res.statusText }));
            throw new Error(`Discord Send Message Error: ${err.message || JSON.stringify(err)}`);
        }

        return await res.json();
    }
}
