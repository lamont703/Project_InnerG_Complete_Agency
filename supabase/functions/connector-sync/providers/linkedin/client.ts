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

        // LinkedIn's POST /posts returns 201 Created with an empty body
        // and the URN in the 'x-linkedin-id' or 'x-restli-id' header
        if (response.status === 201) {
            const id = response.headers.get("x-restli-id") || response.headers.get("x-linkedin-id");
            return { id } as unknown as T;
        }

        const text = await response.text();
        return text ? JSON.parse(text) : {} as T;
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
                // Determine resource type/ID from URN (e.g., urn:li:organization:123)
                const parts = urn.split(':');
                const id = parts[parts.length - 1];
                const type = parts.length >= 3 ? parts[2] : 'organization';
                
                const endpoint = type === 'organization' ? `/organizations/${id}` : `/${id}`;
                
                const pageData = await this.request<any>(endpoint);
                pages.push({
                    id: urn, // Always use the full URN as the ID
                    vanityName: pageData.vanityName || id,
                    localizedName: pageData.localizedName || pageData.localizedFirstName || "LinkedIn Page",
                    logoV2: pageData.logoV2 || pageData.profilePicture
                });
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
        // Ensure we have a proper URN
        const urn = pageUrn.startsWith('urn:li:') ? pageUrn : `urn:li:organization:${pageUrn}`;
        
        const parts = urn.split(':');
        const id = parts[parts.length - 1];
        const type = parts.length >= 3 ? parts[2] : 'organization';
        
        const endpoint = type === 'organization' ? `/organizations/${id}` : `/${id}`;
        const pageData = await this.request<any>(endpoint);
        
        return {
            id: urn,
            vanityName: pageData.vanityName || id,
            localizedName: pageData.localizedName || pageData.localizedFirstName || "LinkedIn Page",
            logoV2: pageData.logoV2 || pageData.profilePicture
        };
    }

    /**
     * Fetch follower statistics for a page
     */
    async getPageFollowers(pageUrn: string): Promise<number> {
        const encodedUrn = encodeURIComponent(pageUrn);
        const data = await this.request<{ elements: any[] }>(
            `/organizationalEntityFollowerStatistics?q=organizationalEntity&organizationalEntity=${encodedUrn}`
        );
        return data.elements?.[0]?.followerCounts?.[0]?.followerCount || 0;
    }

    /**
     * Fetch page metrics (impressions, clicks, etc.)
     */
    async getPageMetrics(pageUrn: string): Promise<LinkedInPageMetrics> {
        const encodedUrn = encodeURIComponent(pageUrn);
        const data = await this.request<{ elements: any[] }>(
            `/organizationalEntityShareStatistics?q=organizationalEntity&organizationalEntity=${encodedUrn}`
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
        // Ensure we use a proper URN for authors
        const urn = pageUrn.startsWith('urn:li:') ? pageUrn : `urn:li:organization:${pageUrn}`;
        
        const encodedUrn = encodeURIComponent(urn);
        const data = await this.request<{ elements: LinkedInPost[] }>(
            `/ugcPosts?q=authors&authors=List(${encodedUrn})&count=${count}`
        );
        return data.elements || [];
    }

    /**
     * Fetch statistics for specific posts (shares)
     */
    async getPostStatistics(pageUrn: string, shareUrns: string[]): Promise<Record<string, any>> {
        if (shareUrns.length === 0) return {};

        const encodedOrg = encodeURIComponent(pageUrn);
        const encodedShares = shareUrns.map(s => encodeURIComponent(s)).join(',');
        
        // This endpoint requires both the organization and the list of shares
        const data = await this.request<{ elements: any[] }>(
            `/organizationalEntityShareStatistics?q=organizationalEntity&organizationalEntity=${encodedOrg}&shares=List(${encodedShares})`
        ).catch((err) => {
            console.error("LinkedIn Post Stats Error:", err.message);
            return { elements: [] };
        });

        const stats: Record<string, any> = {};
        for (const item of data.elements || []) {
            const urn = item.share || item.ugcPost;
            if (urn) {
                stats[urn] = item.totalShareStatistics || {};
            }
        }
        return stats;
    }

    /**
     * Create a text-based post on LinkedIn
     * @param authorUrn The URN of the author (urn:li:person:id or urn:li:organization:id)
     * @param text The content of the post
     */
    async createPost(authorUrn: string, text: string): Promise<{ id: string }> {
        // Ensure we have a proper URN (defaults to organization if not specified)
        const urn = authorUrn.startsWith('urn:li:') ? authorUrn : `urn:li:organization:${authorUrn}`;

        return this.request<{ id: string }>("/posts", {
            method: "POST",
            headers: {
                "Content-Type": "application/json"
            },
            body: JSON.stringify({
                author: urn,
                commentary: text,
                visibility: "PUBLIC",
                distribution: {
                    feedDistribution: "MAIN_FEED",
                    targetEntities: [],
                    thirdPartyDistributionChannels: []
                },
                lifecycleState: "PUBLISHED",
                isReshareDisabledByAuthor: false
            })
        });
    }
}
