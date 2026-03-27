/**
 * _shared/lib/providers/linkedin.ts
 * LinkedIn API Client for OAuth 2.0 & Profile Discovery
 */

import { getEnv } from "../core/env.ts";

export class LinkedInProvider {
    private baseUrl = "https://api.linkedin.com/v2";
    private authUrl = "https://www.linkedin.com/oauth/v2";
    private clientId: string;
    private clientSecret: string;

    constructor() {
        this.clientId = getEnv("LINKEDIN_CLIENT_ID");
        this.clientSecret = getEnv("LINKEDIN_CLIENT_SECRET");
    }

    /**
     * Exchanges auth code for access token (Standard OAuth 2.0)
     */
    async exchangeCodeForToken(code: string, redirectUri: string): Promise<any> {
        const body = new URLSearchParams({
            grant_type: "authorization_code",
            code: code,
            redirect_uri: redirectUri,
            client_id: this.clientId,
            client_secret: this.clientSecret
        });

        const res = await fetch(`${this.authUrl}/accessToken`, {
            method: "POST",
            headers: {
                "Content-Type": "application/x-www-form-urlencoded"
            },
            body: body.toString()
        });

        if (!res.ok) {
            const err = await res.json().catch(() => ({ message: res.statusText }));
            throw new Error(`LinkedIn Token Exchange Error: ${err.error_description || err.message || JSON.stringify(err)}`);
        }

        return await res.json();
    }

    private async request<T>(accessToken: string, path: string, options: RequestInit = {}): Promise<T> {
        const response = await fetch(`${this.baseUrl}${path}`, {
            ...options,
            headers: {
                "Authorization": `Bearer ${accessToken}`,
                "X-Restli-Protocol-Version": "2.0.0",
                "Accept": "application/json",
                ...(options.headers || {})
            }
        });

        if (!response.ok) {
            const error = await response.json().catch(() => ({ message: "Unknown error" }));
            throw new Error(`LinkedIn API Error (${response.status}): ${error.message || JSON.stringify(error)}`);
        }

        const text = await response.text();
        return text ? JSON.parse(text) : {} as T;
    }

    /**
     * Fetches the current user profile using OpenID Connect (OIDC) userinfo endpoint
     */
    async getUserMe(accessToken: string): Promise<any> {
        const res = await fetch(`${this.baseUrl}/userinfo`, {
            method: "GET",
            headers: {
                "Authorization": `Bearer ${accessToken}`
            }
        });

        if (!res.ok) {
            const err = await res.json().catch(() => ({ message: res.statusText }));
            throw new Error(`LinkedIn User Info Error: ${err.message || JSON.stringify(err)}`);
        }

        const data = await res.json();
        // Standard OIDC fields: sub, name, given_name, family_name, picture, email
        return {
            id: data.sub,
            name: data.name,
            username: data.preferred_username || data.name,
            profile_image_url: data.picture,
            email: data.email
        };
    }

    /**
     * Get organizational pages where the user has an admin role
     */
    async getAdminPages(accessToken: string): Promise<any[]> {
        // First get the URNs of organizations the user manages
        const data = await this.request<{ elements: any[] }>(
            accessToken,
            "/organizationalEntityAcls?q=roleAssignee&role=ADMINISTRATOR&state=APPROVED"
        );

        if (!data.elements || data.elements.length === 0) return [];

        const orgUrns = data.elements.map(el => el.organizationalTarget);
        
        // Fetch details for these organizations
        const pages: any[] = [];
        for (const urn of orgUrns) {
            try {
                const parts = urn.split(':');
                const id = parts[parts.length - 1];
                const type = parts.length >= 3 ? parts[2] : 'organization';
                const endpoint = type === 'organization' ? `/organizations/${id}` : `/${id}`;
                
                const pageData = await this.request<any>(accessToken, endpoint);
                pages.push({
                    id: urn,
                    vanityName: pageData.vanityName || id,
                    localizedName: pageData.localizedName || pageData.localizedFirstName || "LinkedIn Page",
                    profile_image_url: pageData.logoV2 || pageData.profilePicture
                });
            } catch (err) {
                console.error(`Failed to fetch details for ${urn}:`, err);
            }
        }

        return pages;
    }

    /**
     * Fetches recent posts for the user (r_member_social scope required)
     */
    async listUserPosts(accessToken: string, count: number = 10): Promise<any> {
        return this.request(accessToken, `/posts?author=urn:li:person:(AUTHENTICATED_MEMBER_URN)&count=${count}`);
    }
}
