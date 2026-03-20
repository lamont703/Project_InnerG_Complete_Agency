-- Migration 089: Enhance Instagram Media Metrics
-- Adds video_views and saved count tracking to instagram_media

ALTER TABLE public.instagram_media
ADD COLUMN IF NOT EXISTS video_views BIGINT DEFAULT 0,
ADD COLUMN IF NOT EXISTS saves BIGINT DEFAULT 0;

COMMENT ON COLUMN public.instagram_media.video_views IS 'Total number of times a reel or video was viewed.';
COMMENT ON COLUMN public.instagram_media.saves IS 'Total number of accounts that saved the post.';
