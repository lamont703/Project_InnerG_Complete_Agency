/**
 * youtube/client.ts
 * YouTube API Client Implementation
 */

import { YouTubeChannelResponse, YouTubeVideoResponse } from "./types.ts";

export class YouTubeClient {
    private baseUrl = "https://www.googleapis.com/youtube/v3";

    constructor(private accessToken: string) {}

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
