-- Migration 064: Add Media Support to Social Content Plan
-- Inner G Complete Agency — Client Intelligence Portal

-- 1. Add media_url to social_content_plan to store AI-generated or uploaded visuals
ALTER TABLE public.social_content_plan
  ADD COLUMN IF NOT EXISTS media_url TEXT;

COMMENT ON COLUMN public.social_content_plan.media_url IS
  'Public URL to the image or video to be posted with the content text.';

-- 2. Ensure social-assets bucket exists for AI generated visuals
INSERT INTO storage.buckets (id, name, public)
VALUES ('social-assets', 'social-assets', true)
ON CONFLICT (id) DO NOTHING;
