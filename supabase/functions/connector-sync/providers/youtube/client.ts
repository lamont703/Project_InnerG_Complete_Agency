/**
 * youtube/client.ts
 * YouTube API Client Implementation
 */

import { YouTubeChannelResponse, YouTubeVideoResponse } from "./types.ts";

export class YouTubeClient {
    private baseUrl = "https://www.googleapis.com/youtube/v3";

    constructor(private accessToken: string) {}

    public setAccessToken(token: string) {
        this.accessToken = token;
    }

    private async request<T>(path: string): Promise<T> {
        const response = await fetch(`${this.baseUrl}${path}`, {
            headers: {
                "Authorization": `Bearer ${this.accessToken}`,
                "Accept": "application/json"
            }
        });

        if (!response.ok) {
            const error = await response.json();
            throw new Error(`YouTube API Error (${response.status}): ${error.error?.message || JSON.stringify(error)}`);
        }

        return response.json();
    }

    /**
     * Refresh the access token using a refresh token
     */
    async refreshAccessToken(clientId: string, clientSecret: string, refreshToken: string): Promise<string> {
        const response = await fetch("https://oauth2.googleapis.com/token", {
            method: "POST",
            headers: { "Content-Type": "application/x-www-form-urlencoded" },
            body: new URLSearchParams({
                client_id: clientId,
                client_secret: clientSecret,
                refresh_token: refreshToken,
                grant_type: "refresh_token",
            }),
        });

        if (!response.ok) {
            const error = await response.json();
            throw new Error(`Failed to refresh YouTube token: ${error.error_description || JSON.stringify(error)}`);
        }

        const data = await response.json();
        this.accessToken = data.access_token;
        return data.access_token;
    }


    /**
     * Get authenticated user's channels
     */
    async getMyChannels(): Promise<YouTubeChannelResponse[]> {
        const data = await this.request<{ items: YouTubeChannelResponse[] }>(
            "/channels?part=snippet,statistics&mine=true"
        );
        return data.items || [];
    }

    /**
     * List recent videos for a channel
     */
    async listRecentVideos(channelId: string, maxResults = 50): Promise<YouTubeVideoResponse[]> {
        // First get search results
        const searchData = await this.request<{ items: any[] }>(
            `/search?part=snippet&channelId=${channelId}&maxResults=${maxResults}&order=date&type=video`
        );
        
        if (!searchData.items || searchData.items.length === 0) return [];

        const videoIds = searchData.items.map(item => item.id.videoId).join(",");
        
        // Then get details (stats) for those videos
        const detailsData = await this.request<{ items: any[] }>(
            `/videos?part=snippet,statistics&id=${videoIds}`
        );

        return detailsData.items.map(item => ({
            id: { videoId: item.id },
            snippet: item.snippet,
            statistics: item.statistics
        }));
    }
}
