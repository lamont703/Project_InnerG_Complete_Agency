-- Migration 065: Add video_url to youtube_videos
-- This helps the AI agent share direct video links.

-- 1. Add the video_url column
ALTER TABLE public.youtube_videos 
ADD COLUMN IF NOT EXISTS video_url TEXT;

-- 2. Backfill existing records
UPDATE public.youtube_videos
SET video_url = 'https://www.youtube.com/watch?v=' || video_id
WHERE video_url IS NULL;

-- 3. Update the RAG prompt or formatter if needed (handled in following steps)
