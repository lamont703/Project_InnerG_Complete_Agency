/**
 * linkedin/transformer.ts
 * Transforms LinkedIn API data to internal database formats.
 */

import { LinkedInPage, LinkedInPost, LinkedInPageMetrics, LinkedInComment } from "./types.ts";

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

    static toInternalPost(projectId: string, pageId: string, post: LinkedInPost, stats?: any) {
        // LinkedIn posts have different commentary locations depending on the API version/post type
        const content = post.specificContent?.["com.linkedin.ugc.ShareContent"]?.shareCommentary?.text || post.commentary || "";
        
        let publishedAt: string | null = null;
        if (post.firstPublishedAt) {
            // Handle numeric epoch or string epoch
            const epoch = typeof post.firstPublishedAt === 'number' 
                ? post.firstPublishedAt 
                : parseInt(post.firstPublishedAt as string);
            publishedAt = new Date(epoch).toISOString();
        } else if (post.publishedAt) {
            publishedAt = new Date(post.publishedAt).toISOString();
        }

        return {
            project_id: projectId,
            page_id: pageId,
            linkedin_post_id: post.id,
            content: content,
            published_at: publishedAt,
            view_count: stats?.impressionCount || 0,
            like_count: stats?.likeCount || 0,
            comment_count: stats?.commentCount || 0,
            share_count: stats?.shareCount || 0,
            last_synced_at: new Date().toISOString()
        };
    }

    static toInternalComment(projectId: string, postId: string, comment: LinkedInComment) {
        return {
            project_id: projectId,
            post_id: postId,
            linkedin_comment_id: comment.$URN || comment.id,
            actor_urn: comment.actor,
            content: comment.message.text,
            parent_comment_id: comment.parent || null,
            created_at: new Date(comment.created.time).toISOString(),
            last_synced_at: new Date().toISOString()
        };
    }
}
