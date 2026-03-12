/**
 * linkedin/transformer.ts
 * Transforms LinkedIn API data to internal database formats.
 */

import { LinkedInPage, LinkedInPost, LinkedInPageMetrics } from "./types.ts";

export class LinkedInTransformer {
    static toInternalPage(projectId: string, page: LinkedInPage, metrics?: LinkedInPageMetrics) {
        return {
            project_id: projectId,
            linkedin_page_id: page.id,
            name: page.localizedName,
            vanity_name: page.vanityName,
            logo_url: page.logoV2?.["extended-assets"]?.[0]?.["digital-asset"] || null,
            follower_count: metrics?.follower_count || 0,
            total_views: metrics?.view_count || 0,
            total_clicks: metrics?.click_count || 0,
            engagement_rate: metrics?.engagement_rate || 0,
            last_synced_at: new Date().toISOString()
        };
    }

    static toInternalPost(projectId: string, pageId: string, post: LinkedInPost) {
        // LinkedIn posts have different commentary locations depending on the API version/post type
        const content = post.specificContent?.["com.linkedin.ugc.ShareContent"]?.shareCommentary?.text || post.commentary || "";
        
        return {
            project_id: projectId,
            page_id: pageId,
            linkedin_post_id: post.id,
            content: content,
            published_at: post.publishedAt ? new Date(post.publishedAt).toISOString() : null,
            last_synced_at: new Date().toISOString()
        };
    }
}
