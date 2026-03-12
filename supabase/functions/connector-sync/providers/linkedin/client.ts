/**
 * linkedin/client.ts
 * LinkedIn API Client Implementation
 */

import { LinkedInProfile, LinkedInPage, LinkedInPost, LinkedInPageMetrics } from "./types.ts";

export class LinkedInClient {
    private baseUrl = "https://api.linkedin.com/v2";

    constructor(private accessToken: string) {}

    private async request<T>(path: string, options: RequestInit = {}): Promise<T> {
        const response = await fetch(`${this.baseUrl}${path}`, {
            ...options,
            headers: {
                "Authorization": `Bearer ${this.accessToken}`,
                "X-Restli-Protocol-Version": "2.0.0",
                "Accept": "application/json",
                ...(options.headers || {})
            }
        });

        if (!response.ok) {
            const error = await response.json().catch(() => ({ message: "Unknown error" }));
            throw new Error(`LinkedIn API Error (${response.status}): ${error.message || JSON.stringify(error)}`);
        }

        return response.json();
    }

    /**
     * Get the authenticated user's profile
     */
    async getMe(): Promise<LinkedInProfile> {
        return this.request<LinkedInProfile>("/me");
    }

    /**
     * Get organizational pages where the user has an admin role
     */
    async getAdminPages(): Promise<LinkedInPage[]> {
        // First get the URNs of organizations the user manages
        const data = await this.request<{ elements: any[] }>(
            "/organizationalEntityAcls?q=roleAssignee&role=ADMINISTRATOR&state=APPROVED"
        );

        if (!data.elements || data.elements.length === 0) return [];

        const orgUrns = data.elements.map(el => el.organizationalTarget);
        
        // Fetch details for these organizations
        const pages: LinkedInPage[] = [];
        for (const urn of orgUrns) {
            try {
                const page = await this.request<LinkedInPage>(`/${urn.split(':').pop()}`);
                pages.push(page);
            } catch (err) {
                console.error(`Failed to fetch details for ${urn}:`, err);
            }
        }

        return pages;
    }

    /**
     * Get specific page details by ID
     */
    async getPage(pageUrn: string): Promise<LinkedInPage> {
        return this.request<LinkedInPage>(`/${pageUrn.split(':').pop()}`);
    }

    /**
     * Fetch follower statistics for a page
     */
    async getPageFollowers(pageUrn: string): Promise<number> {
        const data = await this.request<{ elements: any[] }>(
            `/organizationalEntityFollowerStatistics?path=organizationalEntity&organizationalEntity=${pageUrn}`
        );
        return data.elements?.[0]?.followerCounts?.[0]?.followerCount || 0;
    }

    /**
     * Fetch page metrics (impressions, clicks, etc.)
     */
    async getPageMetrics(pageUrn: string): Promise<LinkedInPageMetrics> {
        const data = await this.request<{ elements: any[] }>(
            `/organizationalEntityShareStatistics?q=organizationalEntity&organizationalEntity=${pageUrn}`
        );
        
        const stats = data.elements?.[0]?.totalShareStatistics || {};
        const followerCount = await this.getPageFollowers(pageUrn);

        return {
            page_id: pageUrn,
            follower_count: followerCount,
            view_count: stats.impressionCount || 0,
            click_count: stats.clickCount || 0,
            engagement_rate: stats.engagement || 0
        };
    }

    /**
     * List recent posts (UGC shares) for a page
     */
    async listRecentPosts(pageUrn: string, count = 10): Promise<LinkedInPost[]> {
        // Use the newer UGC Post API for better content capture
        const data = await this.request<{ elements: LinkedInPost[] }>(
            `/ugcPosts?q=authors&authors=List(${encodeURIComponent(pageUrn)})&count=${count}&sortBy=LAST_MODIFIED`
        );
        return data.elements || [];
    }
}
