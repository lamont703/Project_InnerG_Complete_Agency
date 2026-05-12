/**
 * twitter/transformer.ts
 */

export class TwitterTransformer {
    static toInternalAccount(projectId: string, user: any) {
        return {
            project_id: projectId,
            twitter_user_id: user.id,
            username: user.username,
            name: user.name,
            profile_picture_url: user.profile_image_url,
            follower_count: user.public_metrics?.followers_count || 0,
            following_count: user.public_metrics?.following_count || 0,
            tweet_count: user.public_metrics?.tweet_count || 0,
            last_synced_at: new Date().toISOString()
        };
    }

    static toInternalTweet(projectId: string, tweet: any) {
        return {
            project_id: projectId,
            tweet_id: tweet.id,
            text: tweet.text,
            created_at: tweet.created_at,
            like_count: tweet.public_metrics?.like_count || 0,
            retweet_count: tweet.public_metrics?.retweet_count || 0,
            reply_count: tweet.public_metrics?.reply_count || 0,
            quote_count: tweet.public_metrics?.quote_count || 0,
            impression_count: tweet.public_metrics?.impression_count || 0,
            last_synced_at: new Date().toISOString()
        };
    }
}
