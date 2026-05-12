/**
 * connector-sync/providers/meta/transformer.ts
 * Inner G Complete Agency — Meta (FB/IG) Data Transformer
 */

import { MetaInsight, InstagramMedia } from "./types.ts";

export class MetaTransformer {
    static transformInstagramMetrics(
        igInfo: any,
        insights: MetaInsight[],
        media: InstagramMedia[]
    ) {
        // Find specific insight names
        const findValue = (name: string) => 
            insights.find(i => i.name === name)?.values[0]?.value ?? 0;

        // Calculate engagement
        const totalMediaEngagement = media.reduce((acc, m) => acc + (m.like_count || 0) + (m.comments_count || 0), 0);
        const avgEngagement = media.length > 0 ? totalMediaEngagement / media.length : 0;

        return {
            instagram_followers: igInfo.followers_count || 0,
            instagram_reach: findValue('reach'),
            instagram_impressions: findValue('impressions'),
            instagram_profile_views: findValue('profile_views'),
            instagram_website_clicks: findValue('website_clicks'),
            instagram_engagement: avgEngagement,
            instagram_media_count: igInfo.media_count || 0,
            instagram_post_success: 100 // Default to 100% success if we reach this point
        };
    }

    static transformFacebookMetrics(pageInfo: any, insights: MetaInsight[]) {
        const findValue = (name: string) => 
            insights.find(i => i.name === name)?.values[0]?.value ?? 0;

        return {
            facebook_page_likes: pageInfo.fan_count || 0,
            facebook_reach: findValue('page_posts_impressions_unique'),
            facebook_engagement: findValue('page_post_engagements')
        };
    }
}
