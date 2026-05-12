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
     * Get video transcript (captions)
     * Note: This requires the 'https://www.googleapis.com/auth/youtube.force-ssl' or 
     * 'https://www.googleapis.com/auth/youtube.readonly' scope.
     */
    async getVideoTranscript(videoId: string): Promise<string | null> {
        try {
            // 1. List available captions
            const captionData = await this.request<{ items: any[] }>(
                `/captions?part=snippet&videoId=${videoId}`
            );

            if (!captionData.items || captionData.items.length === 0) return null;

            // 2. Find the first track (preferably English or 'standard')
            const track = captionData.items.find(i => i.snippet.language === "en") || captionData.items[0];
            
            // 3. Download the track
            // Note: The download endpoint is different and returns binary/text content
            const downloadUrl = `${this.baseUrl}/captions/${track.id}?tfmt=srt`;
            const response = await fetch(downloadUrl, {
                headers: {
                    "Authorization": `Bearer ${this.accessToken}`,
                    "Accept": "*/*"
                }
            });

            if (!response.ok) return null;
            
            const text = await response.text();
            // Clean up SRT tags if needed, or just return as is for Gemini to parse
            return text.replace(/<[^>]*>/g, "").replace(/\d+\s+\d{2}:\d{2}:\d{2},\d{3} --> \d{2}:\d{2}:\d{2},\d{3}/g, "").trim();
        } catch (err: any) {
            if (err.message.includes("(403)")) {
                console.warn(`[YouTube Client] Skipping transcript for ${videoId}: Insufficient scopes (403). Ensure 'https://www.googleapis.com/auth/youtube.force-ssl' is included in your OAuth connection.`);
            } else {
                console.warn(`[YouTube Client] Could not fetch transcript for ${videoId}:`, err.message);
            }
            return null;
        }
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
