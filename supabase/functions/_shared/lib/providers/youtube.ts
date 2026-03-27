/**
 * youtube.ts
 * Google/YouTube Provider for OAuth Integration
 */

export class YouTubeProvider {
    private baseUrl = "https://www.googleapis.com";

    constructor(private accessToken: string) {}

    /**
     * Fetches the current Google user profile
     */
    async getUserMe(): Promise<any> {
        const res = await fetch(`${this.baseUrl}/oauth2/v3/userinfo`, {
            headers: {
                "Authorization": `Bearer ${this.accessToken}`
            }
        });

        if (!res.ok) {
            const err = await res.json().catch(() => ({ message: res.statusText }));
            throw new Error(`Google User Info Error: ${err.message || JSON.stringify(err)}`);
        }

        const data = await res.json();
        return {
            id: data.sub,
            name: data.name,
            email: data.email,
            picture: data.picture,
            given_name: data.given_name,
            family_name: data.family_name
        };
    }

    /**
     * Fetches the user's YouTube channels
     */
    async getMyChannels(): Promise<any[]> {
        const res = await fetch(`${this.baseUrl}/youtube/v3/channels?part=snippet,statistics&mine=true`, {
            headers: {
                "Authorization": `Bearer ${this.accessToken}`,
                "Accept": "application/json"
            }
        });

        if (!res.ok) {
            const err = await res.json().catch(() => ({ message: res.statusText }));
            throw new Error(`YouTube Channels Error: ${err.message || JSON.stringify(err)}`);
        }

        const data = await res.json();
        return data.items || [];
    }
}
