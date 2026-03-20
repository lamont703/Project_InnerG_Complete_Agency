/**
 * _shared/lib/providers/tiktok.ts
 * TikTok Open API Client for OAuth & Profile Discovery
 */

import { getEnv } from "../core/env.ts";

export class TikTokProvider {
    private baseUrl = "https://open.tiktokapis.com/v2";
    private clientKey: string;
    private clientSecret: string;

    constructor() {
        this.clientKey = getEnv("TIKTOK_PRODUCTION_CLIENT_KEY");
        this.clientSecret = getEnv("TIKTOK_PRODUCTION_CLIENT_SECRET");
    }

    /**
     * Exchanges auth code for access & refresh tokens
     */
    async exchangeCodeForToken(code: string, redirectUri: string, codeVerifier?: string): Promise<any> {
        const body = new URLSearchParams({
            client_key: this.clientKey,
            client_secret: this.clientSecret,
            code: code,
            grant_type: "authorization_code",
            redirect_uri: redirectUri
        });

        if (codeVerifier) {
            body.append("code_verifier", codeVerifier);
        }

        const res = await fetch(`${this.baseUrl}/oauth/token/`, {
            method: "POST",
            headers: {
                "Content-Type": "application/x-www-form-urlencoded",
                "Cache-Control": "no-cache"
            },
            body: body.toString()
        });

        if (!res.ok) {
            const err = await res.json().catch(() => ({ message: res.statusText }));
            throw new Error(`TikTok Token Exchange Error: ${err.message || JSON.stringify(err)}`);
        }

        return await res.json();
    }

    /**
     * Refreshes an expired access token
     */
    async refreshToken(refreshToken: string): Promise<any> {
        const body = new URLSearchParams({
            client_key: this.clientKey,
            client_secret: this.clientSecret,
            grant_type: "refresh_token",
            refresh_token: refreshToken
        });

        const res = await fetch(`${this.baseUrl}/oauth/token/`, {
            method: "POST",
            headers: {
                "Content-Type": "application/x-www-form-urlencoded",
                "Cache-Control": "no-cache"
            },
            body: body.toString()
        });

        if (!res.ok) {
            const err = await res.json().catch(() => ({ message: res.statusText }));
            throw new Error(`TikTok Token Refresh Error: ${err.message || JSON.stringify(err)}`);
        }

        return await res.json();
    }

    /**
     * Fetches basic user profile information
     */
    async getUserInfo(accessToken: string): Promise<any> {
        // TikTok requires specific fields to be requested
        const fields = [
            "open_id",
            "union_id",
            "avatar_url",
            "display_name",
            "bio_description",
            "is_verified",
            "follower_count",
            "following_count",
            "heart_count",
            "video_count"
        ].join(",");

        const res = await fetch(`${this.baseUrl}/user/info/?fields=${fields}`, {
            method: "GET",
            headers: {
                "Authorization": `Bearer ${accessToken}`
            }
        });

        if (!res.ok) {
            const err = await res.json().catch(() => ({ message: res.statusText }));
            throw new Error(`TikTok User Info Error: ${err.message || JSON.stringify(err)}`);
        }

        const data = await res.json();
        return data.data?.user;
    }

    /**
     * Fetches video list (recent creator content)
     */
    async listCreatorVideos(accessToken: string, cursor?: number, count: number = 20): Promise<any> {
        const payload: any = {
            max_count: count
        };
        if (cursor) payload.cursor = cursor;

        const res = await fetch(`${this.baseUrl}/video/list/`, {
            method: "POST",
            headers: {
                "Authorization": `Bearer ${accessToken}`,
                "Content-Type": "application/json"
            },
            body: JSON.stringify(payload)
        });

        if (!res.ok) {
            const err = await res.json().catch(() => ({ message: res.statusText }));
            throw new Error(`TikTok Video List Error: ${err.message || JSON.stringify(err)}`);
        }

        return await res.json();
    }
}
