/**
 * tiktok/types.ts
 * TikTok API Types
 */

export interface TikTokUser {
    open_id: string;
    union_id?: string;
    avatar_url?: string;
    avatar_url_100?: string;
    avatar_url_200?: string;
    display_name?: string;
    bio_description?: string;
    profile_deep_link?: string;
    is_verified?: boolean;
    follower_count?: number;
    following_count?: number;
    heart_count?: number;
    video_count?: number;
}

export interface TikTokVideo {
    id: string;
    create_time: number;
    cover_image_url?: string;
    share_url?: string;
    embed_link?: string;
    embed_html?: string;
    video_description?: string;
    duration?: number;
    height?: number;
    width?: number;
    title?: string;
    view_count?: number;
    like_count?: number;
    comment_count?: number;
    share_count?: number;
}

export interface InternalTikTokAccount {
    project_id: string;
    tiktok_user_id: string;
    username: string;
    display_name?: string;
    union_id?: string;
    avatar_url?: string;
    avatar_url_100?: string;
    avatar_url_200?: string;
    bio_description?: string;
    profile_deep_link?: string;
    is_verified?: boolean;
    follower_count: number;
    following_count: number;
    heart_count: number;
    video_count: number;
}

export interface InternalTikTokVideo {
    project_id: string;
    tiktok_video_id: string;
    title?: string;
    video_description?: string;
    published_at: string;
    cover_url?: string;
    share_url?: string;
    embed_html?: string;
    embed_link?: string;
    duration_seconds?: number;
    height?: number;
    width?: number;
    view_count: number;
    like_count: number;
    comment_count: number;
    share_count: number;
}
