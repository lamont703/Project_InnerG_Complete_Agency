/**
 * _shared/lib/providers/twitter.ts
 * X (Twitter) API v2 Client for OAuth 2.0 & Profile Discovery
 */

import { getEnv } from "../core/env.ts";

export class TwitterProvider {
    private baseUrl = "https://api.twitter.com/2";
    private authUrl = "https://api.twitter.com/2/oauth2";
    private clientId: string;
    private clientSecret: string;

    constructor() {
        this.clientId = getEnv("TWITTER_CLIENT_ID");
        this.clientSecret = getEnv("TWITTER_CLIENT_SECRET");
    }

    /**
     * Exchanges auth code for access & refresh tokens (OAuth 2.0 PKCE)
     */
    async exchangeCodeForToken(code: string, redirectUri: string, codeVerifier: string): Promise<any> {
        const body = new URLSearchParams({
            client_id: this.clientId,
            client_secret: this.clientSecret, // Some X apps require this, some don't. Supabase Edge usually needs it if provided.
            code: code,
            grant_type: "authorization_code",
            redirect_uri: redirectUri,
            code_verifier: codeVerifier
        });

        const res = await fetch(`${this.authUrl}/token`, {
            method: "POST",
            headers: {
                "Content-Type": "application/x-www-form-urlencoded",
                "Authorization": `Basic ${btoa(`${this.clientId}:${this.clientSecret}`)}`
            },
            body: body.toString()
        });

        if (!res.ok) {
            const err = await res.json().catch(() => ({ message: res.statusText }));
            throw new Error(`X (Twitter) Token Exchange Error: ${err.error_description || err.message || JSON.stringify(err)}`);
        }

        return await res.json();
    }

    /**
     * Refreshes an expired access token
     */
    async refreshToken(refreshToken: string): Promise<any> {
        const body = new URLSearchParams({
            client_id: this.clientId,
            grant_type: "refresh_token",
            refresh_token: refreshToken
        });

        const res = await fetch(`${this.authUrl}/token`, {
            method: "POST",
            headers: {
                "Content-Type": "application/x-www-form-urlencoded",
                "Authorization": `Basic ${btoa(`${this.clientId}:${this.clientSecret}`)}`
            },
            body: body.toString()
        });

        if (!res.ok) {
            const err = await res.json().catch(() => ({ message: res.statusText }));
            throw new Error(`X (Twitter) Token Refresh Error: ${err.message || JSON.stringify(err)}`);
        }

        return await res.json();
    }

    /**
     * Fetches the current user profile (using the Twitter API v2 /users/me)
     */
    async getUserMe(accessToken: string): Promise<any> {
        const fields = [
            "id",
            "name",
            "username",
            "profile_image_url",
            "public_metrics",
            "verified",
            "description"
        ].join(",");

        const res = await fetch(`${this.baseUrl}/users/me?user.fields=${fields}`, {
            method: "GET",
            headers: {
                "Authorization": `Bearer ${accessToken}`
            }
        });

        if (!res.ok) {
            const err = await res.json().catch(() => ({ message: res.statusText }));
            throw new Error(`X (Twitter) User Me Error: ${err.message || JSON.stringify(err)}`);
        }

        const data = await res.json();
        return data.data;
    }

    /**
     * Fetches recent tweets for the user
     */
    async listUserTweets(userId: string, accessToken: string, count: number = 10): Promise<any> {
        const fields = [
            "id",
            "text",
            "created_at",
            "public_metrics",
            "lang",
            "source"
        ].join(",");

        const res = await fetch(`${this.baseUrl}/users/${userId}/tweets?max_results=${count}&tweet.fields=${fields}`, {
            method: "GET",
            headers: {
                "Authorization": `Bearer ${accessToken}`
            }
        });

        if (!res.ok) {
            const err = await res.json().catch(() => ({ message: res.statusText }));
            throw new Error(`X (Twitter) List Tweets Error: ${err.message || JSON.stringify(err)}`);
        }

        return await res.json();
    }

    /**
     * Uploads media to X (Twitter) API v1.1
     * Returns a media_id which can be used in createTweet
     */
    async uploadMedia(accessToken: string, mediaBlob: Blob): Promise<string> {
        const url = "https://upload.twitter.com/1.1/media/upload.json";
        
        // Convert Blob to Base64 to avoid 'Transfer-Encoding: chunked' issues with Deno's FormData
        // which Twitter's v1.1 API proxy rejects with a 403 Forbidden.
        const buffer = await mediaBlob.arrayBuffer();
        const bytes = new Uint8Array(buffer);
        let binary = '';
        for (let i = 0; i < bytes.byteLength; i++) {
            binary += String.fromCharCode(bytes[i]);
        }
        const base64Data = btoa(binary);

        const bodyParams = new URLSearchParams();
        bodyParams.append("media_data", base64Data);

        const res = await fetch(url, {
            method: "POST",
            headers: {
                "Authorization": `Bearer ${accessToken}`,
                "Content-Type": "application/x-www-form-urlencoded"
            },
            body: bodyParams.toString()
        });

        if (!res.ok) {
            const errText = await res.text();
            let errMsg = errText;
            try {
                const parsed = JSON.parse(errText);
                errMsg = parsed.error || parsed.error_description || parsed.message || JSON.stringify(parsed);
            } catch (e) {
                // Not JSON
            }
            throw new Error(`X (Twitter) Media Upload Error: ${errMsg} (Status: ${res.status})`);
        }

        const data = await res.json();
        return data.media_id_string;
    }

    /**
     * Creates a new Tweet (Twitter API v2 POST /tweets)
     */
    async createTweet(accessToken: string, text: string, mediaId?: string): Promise<any> {
        const body: any = { text };
        if (mediaId) {
            body.media = { media_ids: [mediaId] };
        }

        const res = await fetch(`${this.baseUrl}/tweets`, {
            method: "POST",
            headers: {
                "Authorization": `Bearer ${accessToken}`,
                "Content-Type": "application/json"
            },
            body: JSON.stringify(body)
        });

        if (!res.ok) {
            const err = await res.json().catch(() => ({ message: res.statusText }));
            console.error("X (Twitter) API Error Full Response:", JSON.stringify(err, null, 2));
            throw new Error(`X (Twitter) Create Tweet Error: ${err.detail || err.message || JSON.stringify(err)}`);
        }

        const data = await res.json();
        return data.data;
    }
}
