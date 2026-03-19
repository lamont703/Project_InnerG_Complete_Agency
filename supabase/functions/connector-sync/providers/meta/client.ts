/**
 * connector-sync/providers/meta/client.ts
 * Meta Graph API Client for Instagram & Facebook Publishing
 */

export class MetaClient {
    private baseUrl = "https://graph.facebook.com/v25.0";

    constructor(private accessToken: string) {}

    /**
     * Publishes a photo post to an Instagram Business Account
     * 1. Create a media container
     * 2. Publish the container
     */
    async createInstagramPost(igUserId: string, caption: string, imageUrl: string): Promise<{ id: string }> {
        // Step 1: Create Media Container
        console.log(`[MetaClient] Creating container for IG User ${igUserId}`);
        const containerRes = await fetch(`${this.baseUrl}/${igUserId}/media`, {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({
                image_url: imageUrl,
                caption: caption,
                access_token: this.accessToken
            })
        });

        if (!containerRes.ok) {
            const err = await containerRes.json().catch(() => ({ error: { message: containerRes.statusText } }));
            throw new Error(`IG Container Error: ${err.error?.message || "Unknown error"}`);
        }

        const containerData = await containerRes.json();
        const creationId = containerData.id;

        if (!creationId) throw new Error("Failed to get creation_id from Meta");

        // Step 2: Publish the Container
        console.log(`[MetaClient] Publishing container ${creationId}`);
        const publishRes = await fetch(`${this.baseUrl}/${igUserId}/media_publish`, {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({
                creation_id: creationId,
                access_token: this.accessToken
            })
        });

        if (!publishRes.ok) {
            const err = await publishRes.json().catch(() => ({ error: { message: publishRes.statusText } }));
            throw new Error(`IG Publish Error: ${err.error?.message || "Unknown error"}`);
        }

        return await publishRes.json();
    }

    /**
     * Publishes a text/link post to a Facebook Page
     */
    async createFacebookPost(pageId: string, message: string, link?: string): Promise<{ id: string }> {
        const payload: any = {
            message: message,
            access_token: this.accessToken
        };
        if (link) payload.link = link;

        const res = await fetch(`${this.baseUrl}/${pageId}/feed`, {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify(payload)
        });

        if (!res.ok) {
            const err = await res.json().catch(() => ({ error: { message: res.statusText } }));
            throw new Error(`FB Post Error: ${err.error?.message || "Unknown error"}`);
        }

        return await res.json();
    }

    /**
     * Publishes a comment to an Instagram Media object
     */
    async createInstagramComment(mediaId: string, message: string): Promise<{ id: string }> {
        const res = await fetch(`${this.baseUrl}/${mediaId}/comments`, {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({
                message: message,
                access_token: this.accessToken
            })
        });

        if (!res.ok) {
            const err = await res.json().catch(() => ({ error: { message: res.statusText } }));
            throw new Error(`IG Comment Error: ${err.error?.message || "Unknown error"}`);
        }

        return await res.json();
    }

    /**
     * Publishes a reply to an Instagram Comment
     */
    async createInstagramReply(commentId: string, message: string): Promise<{ id: string }> {
        const res = await fetch(`${this.baseUrl}/${commentId}/replies`, {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({
                message: message,
                access_token: this.accessToken
            })
        });

        if (!res.ok) {
            const err = await res.json().catch(() => ({ error: { message: res.statusText } }));
            throw new Error(`IG Reply Error: ${err.error?.message || "Unknown error"}`);
        }

        return await res.json();
    }
}
