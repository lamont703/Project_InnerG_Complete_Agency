/**
 * linkedin/client.ts
 * LinkedIn API Client Implementation
 */

import { LinkedInProfile, LinkedInPage, LinkedInPost, LinkedInPageMetrics, LinkedInComment } from "./types.ts";

export class LinkedInClient {
    private baseUrl = "https://api.linkedin.com/v2";

    constructor(private accessToken: string) {}

    private async request<T>(path: string, options: RequestInit = {}): Promise<T> {
        const response = await fetch(`${this.baseUrl}${path}`, {
            ...options,
            headers: {
                "Authorization": `Bearer ${this.accessToken}`,
                "X-Restli-Protocol-Version": "2.0.0",
                "Linkedin-Version": "202502",
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
     * Fetch total follower count for an organization
     * Using the recommended networkSizes API for totals.
     */
    async getPageFollowers(pageUrn: string): Promise<number> {
        const encodedUrn = encodeURIComponent(pageUrn);
        try {
            // This is the recommended way to get total followers for 2024/2025
            const data = await this.request<{ firstDegreeSize: number; size?: number }>(
                `/networkSizes/${encodedUrn}?edgeType=CompanyFollowedByMember`
            );
            // v2 usually returns firstDegreeSize, but some endpoints return size.
            return data.firstDegreeSize ?? data.size ?? 0;
        } catch (err: any) {
            console.warn(`[LinkedInClient] networkSizes failed for followers (${err.message}). Trying legacy stats...`);
            try {
                // Fallback to organizational statistics if networkSizes is restricted
                const data = await this.request<{ elements: any[] }>(
                    `/organizationalEntityFollowerStatistics?q=organizationalEntity&organizationalEntity=${encodedUrn}`
                );
                // Summing the first element's followerCounts if present
                const stats = data.elements?.[0];
                return stats?.followerCounts?.[0]?.followerCount || 0;
            } catch {
                return 0;
            }
        }
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
    async listRecentPosts(pageUrn: string, count = 20): Promise<LinkedInPost[]> {
        // Ensure we use a proper URN for authors
        const urn = pageUrn.startsWith('urn:li:') ? pageUrn : `urn:li:organization:${pageUrn}`;
        
        const encodedUrn = encodeURIComponent(urn);
        const data = await this.request<{ elements: LinkedInPost[] }>(
            `/ugcPosts?q=authors&authors=List(${encodedUrn})&count=${count}`
        );
        return data.elements || [];
    }

    /**
     * Batch check if specific posts still exist on LinkedIn
     * @returns List of IDs that are still live
     */
    async checkPostsExist(postUrns: string[]): Promise<string[]> {
        if (postUrns.length === 0) return [];
        
        const encodedIds = postUrns.map(id => encodeURIComponent(id)).join(',');
        try {
            const data = await this.request<{ results: Record<string, any> }>(
                `/ugcPosts?ids=List(${encodedIds})`
            );
            return Object.keys(data.results || {});
        } catch (err) {
            console.warn("[LinkedInClient] Batch check failed:", err);
            return postUrns; // Fallback to assume they exist if the query itself fails
        }
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
    async createPost(authorUrn: string, text: string, mediaAsset?: string): Promise<{ id: string }> {
        // Ensure we have a proper URN (defaults to organization if not specified)
        const urn = authorUrn.startsWith('urn:li:') ? authorUrn : `urn:li:organization:${authorUrn}`;

        const payload: any = {
            author: urn,
            lifecycleState: "PUBLISHED",
            specificContent: {
                "com.linkedin.ugc.ShareContent": {
                    shareCommentary: {
                        text: text.slice(0, 3000)
                    },
                    shareMediaCategory: mediaAsset ? (mediaAsset.includes("video") ? "VIDEO" : "IMAGE") : "NONE"
                }
            },
            visibility: {
                "com.linkedin.ugc.MemberNetworkVisibility": "PUBLIC"
            }
        };

        if (mediaAsset) {
            payload.specificContent["com.linkedin.ugc.ShareContent"].media = [
                {
                    status: "READY",
                    description: { text: "Uploaded Media" },
                    media: mediaAsset,
                    title: { text: "Media Content" }
                }
            ];
        }

        return this.request<{ id: string }>("/ugcPosts", {
            method: "POST",
            headers: {
                "Content-Type": "application/json"
            },
            body: JSON.stringify(payload)
        });
    }

    /**
     * Upload an image to LinkedIn and return the asset URN
     */
    async uploadImage(authorUrn: string, imageBuffer: Blob, mimeType: string): Promise<string> {
        const urn = authorUrn.startsWith('urn:li:') ? authorUrn : `urn:li:organization:${authorUrn}`;

        // 1. Register Upload
        const registerData = await this.request<any>("/assets?action=registerUpload", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({
                registerUploadRequest: {
                    recipes: ["urn:li:digitalmediaRecipe:feedshare-image"],
                    owner: urn,
                    serviceRelationships: [
                        {
                            relationshipType: "OWNER",
                            identifier: "urn:li:userGeneratedContent"
                        }
                    ]
                }
            })
        });

        const uploadUrl = registerData.value.uploadMechanism["com.linkedin.digitalmedia.uploading.MediaUploadHttpRequest"].uploadUrl;
        const assetUrn = registerData.value.asset;

        // 2. Binary Upload
        const uploadRes = await fetch(uploadUrl, {
            method: "POST",
            headers: {
                "Authorization": `Bearer ${this.accessToken}`,
                "Content-Type": mimeType
            },
            body: imageBuffer
        });

        if (!uploadRes.ok) {
            const error = await uploadRes.text();
            throw new Error(`LinkedIn Binary Upload Failed: ${error}`);
        }

        return assetUrn;
    }

    /**
     * Upload a video to LinkedIn and return the asset URN
     */
    async uploadVideo(authorUrn: string, videoBuffer: Blob, mimeType: string): Promise<string> {
        const urn = authorUrn.startsWith('urn:li:') ? authorUrn : `urn:li:organization:${authorUrn}`;

        // 1. Register Video Upload
        const registerData = await this.request<any>("/assets?action=registerUpload", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({
                registerUploadRequest: {
                    recipes: ["urn:li:digitalmediaRecipe:feedshare-video"],
                    owner: urn,
                    serviceRelationships: [
                        {
                            relationshipType: "OWNER",
                            identifier: "urn:li:userGeneratedContent"
                        }
                    ]
                }
            })
        });

        const uploadUrl = registerData.value.uploadMechanism["com.linkedin.digitalmedia.uploading.MediaUploadHttpRequest"].uploadUrl;
        const assetUrn = registerData.value.asset;

        // 2. Binary Upload
        const uploadRes = await fetch(uploadUrl, {
            method: "POST",
            headers: {
                "Authorization": `Bearer ${this.accessToken}`,
                "Content-Type": mimeType
            },
            body: videoBuffer
        });

        if (!uploadRes.ok) {
            const error = await uploadRes.text();
            throw new Error(`LinkedIn Video Binary Upload Failed: ${error}`);
        }

        // 3. Poll for "READY" status
        let isReady = false;
        let attempts = 0;
        const maxAttempts = 20; 

        while (!isReady && attempts < maxAttempts) {
            await new Promise(r => setTimeout(r, 5000));
            attempts++;
            
            const assetData = await this.request<any>(`/assets/${assetUrn.split(':').pop()}`);
            if (assetData.recipes?.[0]?.status === "AVAILABLE") {
                isReady = true;
            }
            console.log(`[LinkedInClient] Video processing status: ${assetData.recipes?.[0]?.status || "PROCESSING"}`);
        }

        if (!isReady) throw new Error("LinkedIn video processing timed out.");

        return assetUrn;
    }

    /**
     * Fetch comments or replies for a specific post
     * To fetch replies, provide the parentCommentUrn.
     */
    async getPostComments(postUrn: string, parentCommentUrn?: string): Promise<LinkedInComment[]> {
        const fetchSocial = async (target: string, parent?: string) => {
            const encodedTarget = encodeURIComponent(target);
            let path = `/socialActions/${encodedTarget}/comments`;
            if (parent) {
                path += `?q=parentComment&parentComment=${encodeURIComponent(parent)}`;
            }
            return this.request<{ elements: LinkedInComment[] }>(path);
        };

        const fetchLegacy = async (parent: string) => {
            const path = `/comments?q=parentFeed&target=${encodeURIComponent(parent)}`;
            return this.request<{ elements: LinkedInComment[] }>(path);
        };

        // Candidates: 1. Root from Parent URN, 2. Full Post URN, 3. Atomic Post ID
        const targets: string[] = [];
        
        if (parentCommentUrn) {
            const match = parentCommentUrn.match(/urn:li:comment:\(([^,]+),/);
            if (match) targets.push(match[1]);
        }
        
        if (postUrn && !targets.includes(postUrn)) targets.push(postUrn);
        
        const atomicId = postUrn.split(':').pop();
        if (atomicId && !targets.includes(atomicId)) targets.push(atomicId);

        let lastError: any = null;
        for (const target of targets) {
            try {
                const data = await fetchSocial(target, parentCommentUrn);
                return data.elements || [];
            } catch (err: any) {
                lastError = err;
                if (!err.message.includes("404")) throw err;
            }
        }

        // Final Strategy: Legacy Feed query (often works for non-projected shares)
        if (parentCommentUrn) {
            try {
                const data = await fetchLegacy(parentCommentUrn);
                return data.elements || [];
            } catch (err: any) {
                if (lastError) throw lastError;
                throw err;
            }
        }

        if (lastError) throw lastError;
        return [];
    }

    /**
     * Create a comment or reply
     * @param targetUrn The URN of the post or root object to comment on
     * @param actorUrn The URN of the actor (urn:li:person:id or urn:li:organization:id)
     * @param text The content of the comment
     * @param parentCommentUrn The URN of the comment to reply to (if it's a reply)
     */
    async createComment(targetUrn: string, actorUrn: string, text: string, parentCommentUrn?: string): Promise<{ id: string }> {
        // Resolve Target: Use Parent's root if available, otherwise Post URN, otherwise Post ID
        let finalTarget = targetUrn;
        if (parentCommentUrn) {
            const match = parentCommentUrn.match(/urn:li:comment:\(([^,]+),/);
            if (match) finalTarget = match[1];
        }

        const body: any = {
            actor: actorUrn,
            message: {
                text: text
            }
        };

        if (parentCommentUrn) {
            body.parentComment = parentCommentUrn;
        }

        // Multi-Path Attempt for the POST as well
        const attemptPost = async (target: string) => {
            const encodedTarget = encodeURIComponent(target);
            return this.request<{ id: string }>(`/socialActions/${encodedTarget}/comments`, {
                method: "POST",
                headers: {
                    "Content-Type": "application/json"
                },
                body: JSON.stringify(body)
            });
        };

        try {
            return await attemptPost(finalTarget);
        } catch (err: any) {
            if (err.message.includes("404")) {
                // Fallback to postUrn or Atomic ID
                const atomicId = targetUrn.split(':').pop();
                if (atomicId && atomicId !== finalTarget) {
                    try {
                        return await attemptPost(atomicId);
                    } catch {
                        throw err; // original
                    }
                }
            }
            throw err;
        }
    }
}
