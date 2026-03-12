/**
 * tiktok/client.ts
 * TikTok API Client (v2)
 */

export class TikTokClient {
    private baseUrl = "https://open.tiktokapis.com/v2";

    constructor(private accessToken: string) {}

    private async request(endpoint: string, method = "GET", body?: any, params: Record<string, string> = {}) {
        const url = new URL(`${this.baseUrl}${endpoint}`);
        Object.entries(params).forEach(([key, value]) => url.searchParams.append(key, value));

        const response = await fetch(url.toString(), {
            method,
            headers: {
                "Authorization": `Bearer ${this.accessToken}`,
                "Content-Type": "application/json",
            },
            body: body ? JSON.stringify(body) : undefined,
        });

        if (!response.ok) {
            let errorMsg = response.statusText;
            try {
                const error = await response.json();
                errorMsg = error.error?.message || error.message || response.statusText;
            } catch (_) {
                // Ignore parse error
            }
            throw new Error(`TikTok API Error: ${errorMsg}`);
        }

        return response.json();
    }

    async getUserInfo() {
        // Reference: https://developers.tiktok.com/doc/tiktok-api-v2-user-info/
        return this.request("/user/info/", "GET", undefined, {
            fields: "open_id,union_id,avatar_url,display_name,follower_count,following_count,heart_count,video_count"
        });
    }

    async getUserVideos(cursor?: number, count = 20) {
        // Reference: https://developers.tiktok.com/doc/tiktok-api-v2-video-list/
        const body: any = {
            max_count: count
        };
        if (cursor) {
            body.cursor = cursor;
        }

        return this.request("/video/list/", "POST", body, {
            fields: "id,create_time,cover_image_url,share_url,video_description,duration,height,width,title,embed_html,view_count,like_count,comment_count,share_count"
        });
    }
}
