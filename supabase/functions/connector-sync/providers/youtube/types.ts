/**
 * youtube/types.ts
 * YouTube API Response Types
 */

export interface YouTubeChannelResponse {
    id: string;
    snippet: {
        title: string;
        description: string;
        thumbnails: {
            default: { url: string };
            medium: { url: string };
            high: { url: string };
        };
    };
    statistics: {
        viewCount: string;
        subscriberCount: string;
        videoCount: string;
    };
}

export interface YouTubeVideoResponse {
    id: {
        videoId: string;
    };
    snippet: {
        title: string;
        description: string;
        publishedAt: string;
        thumbnails: {
            default: { url: string };
            medium: { url: string };
            high: { url: string };
        };
    };
    statistics?: {
        viewCount: string;
        likeCount: string;
        commentCount: string;
    };
}

export interface YouTubeInternalChannel {
    project_id: string;
    channel_id: string;
    title: string;
    description: string;
    thumbnail_url: string;
    view_count: number;
    subscriber_count: number;
    video_count: number;
    last_synced_at: string;
}

export interface YouTubeInternalVideo {
    project_id: string;
    channel_id: string;
    video_id: string;
    title: string;
    description: string;
    published_at: string;
    thumbnail_url: string;
    view_count: number;
    like_count: number;
    comment_count: number;
    last_synced_at: string;
}
