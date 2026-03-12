/**
 * tiktok/transformer.ts
 * TikTok Data Transformer
 */

import { InternalTikTokAccount, InternalTikTokVideo, TikTokUser, TikTokVideo } from "./types.ts";

export class TikTokTransformer {
    static toInternalAccount(projectId: string, user: TikTokUser): InternalTikTokAccount {
        return {
            project_id: projectId,
            tiktok_user_id: user.open_id,
            username: user.display_name || user.open_id, // OpenID as fallback if username not available in v2 user/info
            display_name: user.display_name,
            avatar_url: user.avatar_url,
            follower_count: user.follower_count || 0,
            following_count: user.following_count || 0,
            heart_count: user.heart_count || 0,
            video_count: user.video_count || 0,
        };
    }

    static toInternalVideo(projectId: string, video: TikTokVideo): InternalTikTokVideo {
        return {
            project_id: projectId,
            tiktok_video_id: video.id,
            title: video.title || video.video_description,
            published_at: new Date(video.create_time * 1000).toISOString(),
            cover_url: video.cover_image_url,
            view_count: video.view_count || 0,
            like_count: video.like_count || 0,
            comment_count: video.comment_count || 0,
            share_count: video.share_count || 0,
        };
    }
}
