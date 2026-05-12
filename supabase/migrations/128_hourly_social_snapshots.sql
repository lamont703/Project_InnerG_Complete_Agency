-- Migration 128: Implement Hourly Social Metrics Snapshots and Cron Job
-- This enables accurate 24-hour rolling growth calculations (Velocity) for the Funnels Dashboard.

-- 1. Create the Snapshot Function
CREATE OR REPLACE FUNCTION public.snapshot_hourly_metrics()
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
    INSERT INTO public.project_hourly_metrics (
        project_id,
        snapshot_timestamp,
        youtube_views,
        tiktok_views,
        linkedin_views,
        instagram_reach,
        twitter_impressions,
        facebook_reach,
        total_social_engagement,
        metrics_payload
    )
    SELECT 
        p.id as project_id,
        NOW(),
        COALESCE((SELECT SUM(view_count) FROM public.youtube_videos WHERE project_id = p.id), 0),
        COALESCE((SELECT SUM(view_count) FROM public.tiktok_videos WHERE project_id = p.id), 0),
        COALESCE((SELECT SUM(view_count) FROM public.linkedin_posts WHERE project_id = p.id), 0),
        COALESCE((SELECT SUM(reach) FROM public.instagram_media WHERE project_id = p.id), 0),
        COALESCE((SELECT SUM(impression_count) FROM public.twitter_tweets WHERE project_id = p.id), 0),
        COALESCE((SELECT SUM(followers_count) FROM public.facebook_pages WHERE project_id = p.id), 0), -- Facebook doesn't have a sum of reach on a per-post basis yet, fallback to followers for pulses
        0, -- Engagement can be summed from likes/comments if needed in the payload
        jsonb_build_object(
            'likes', (
                COALESCE((SELECT SUM(like_count) FROM public.youtube_videos WHERE project_id = p.id), 0) +
                COALESCE((SELECT SUM(like_count) FROM public.tiktok_videos WHERE project_id = p.id), 0) +
                COALESCE((SELECT SUM(like_count) FROM public.linkedin_posts WHERE project_id = p.id), 0) +
                COALESCE((SELECT SUM(like_count) FROM public.instagram_media WHERE project_id = p.id), 0) +
                COALESCE((SELECT SUM(like_count) FROM public.twitter_tweets WHERE project_id = p.id), 0)
            )
        )
    FROM public.projects p
    WHERE p.status = 'active';
END;
$$;

-- 2. Schedule the Snapshot Job via pg_cron
-- Note: Runs every hour at 5 minutes past (to avoid peak sync traffic)
DO $$
BEGIN
    BEGIN
        PERFORM cron.unschedule('social-metrics-hourly-snapshot');
    EXCEPTION
        WHEN OTHERS THEN NULL;
    END;

    PERFORM cron.schedule(
        'social-metrics-hourly-snapshot',
        '5 * * * *',
        'SELECT public.snapshot_hourly_metrics();'
    );
EXCEPTION
    WHEN OTHERS THEN
        RAISE NOTICE 'Skipping pg_cron schedule creation. Ensure pg_cron is enabled.';
END $$;

-- 3. Run the first snapshot immediately to avoid the dashboard showing zero
SELECT public.snapshot_hourly_metrics();
