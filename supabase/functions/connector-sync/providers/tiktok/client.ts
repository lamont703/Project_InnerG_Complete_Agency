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

        const data = await response.json().catch(() => ({}));

        // TikTok v2 sometimes returns 200 OK but with an error body
        if (data.error && data.error.code !== "ok" && data.error.code !== 0) {
            const code = data.error.code;
            const message = data.error.message || "Unknown TikTok Error";
            throw new Error(`TikTok API Error (${code}): ${message}`);
        }

        if (!response.ok) {
            throw new Error(`TikTok HTTP Error: ${response.status} ${response.statusText}`);
        }

        return data;
    }

    async getUserInfo() {
        const fields = [
            "open_id",
            "union_id",
            "avatar_url",
            "avatar_url_100",
            "avatar_url_200",
            "display_name",
            "username", // Added missing username field
            "bio_description",
            "profile_deep_link",
            "is_verified",
            "follower_count",
            "following_count",
            "heart_count",
            "video_count"
        ].join(",");
        return this.request("/user/info/", "GET", undefined, { fields });
    }

    async getUserVideos(cursor?: number, count = 20) {
        const fields = [
            "id",
            "create_time",
            "cover_image_url",
            "share_url",
            "embed_link",
            "embed_html",
            "video_description",
            "duration",
            "height",
            "width",
            "title",
            "view_count",
            "like_count",
            "comment_count",
            "share_count"
        ].join(",");

        const body: any = { max_count: count };
        if (cursor) body.cursor = cursor;

        return this.request("/video/list/", "POST", body, { fields });
    }
}
