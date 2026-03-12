/**
 * youtube/transformer.ts
 * YouTube Data Transformer
 */

import { 
    YouTubeChannelResponse, 
    YouTubeVideoResponse, 
    YouTubeInternalChannel, 
    YouTubeInternalVideo 
} from "./types.ts";

export class YouTubeTransformer {
    static toInternalChannel(projectId: string, channel: YouTubeChannelResponse): YouTubeInternalChannel {
        return {
            project_id: projectId,
            channel_id: channel.id,
            title: channel.snippet.title,
            description: channel.snippet.description,
            thumbnail_url: channel.snippet.thumbnails.high?.url || channel.snippet.thumbnails.default?.url,
            view_count: parseInt(channel.statistics.viewCount || "0"),
            subscriber_count: parseInt(channel.statistics.subscriberCount || "0"),
            video_count: parseInt(channel.statistics.videoCount || "0"),
            last_synced_at: new Date().toISOString()
        };
    }

    static toInternalVideo(projectId: string, channelDbId: string, video: YouTubeVideoResponse): YouTubeInternalVideo {
        return {
            project_id: projectId,
            channel_id: channelDbId,
            video_id: video.id.videoId,
            title: video.snippet.title,
            description: video.snippet.description,
            published_at: video.snippet.publishedAt,
            thumbnail_url: video.snippet.thumbnails.high?.url || video.snippet.thumbnails.default?.url,
            view_count: parseInt(video.statistics?.viewCount || "0"),
            like_count: parseInt(video.statistics?.likeCount || "0"),
            comment_count: parseInt(video.statistics?.commentCount || "0"),
            last_synced_at: new Date().toISOString()
        };
    }
}
