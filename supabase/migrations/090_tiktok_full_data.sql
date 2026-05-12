-- Migration 090: TikTok Full Data Expansion
-- Adds all available fields from TikTok API v2 to tiktok_accounts and tiktok_videos.

-- ─── tiktok_accounts ─────────────────────────────────────────────────────────
-- New fields from user/info: union_id, bio_description, is_verified,
--   profile_deep_link, avatar_url_100, avatar_url_200

ALTER TABLE public.tiktok_accounts
    ADD COLUMN IF NOT EXISTS union_id TEXT,
    ADD COLUMN IF NOT EXISTS bio_description TEXT,
    ADD COLUMN IF NOT EXISTS is_verified BOOLEAN DEFAULT FALSE,
    ADD COLUMN IF NOT EXISTS profile_deep_link TEXT,
    ADD COLUMN IF NOT EXISTS avatar_url_100 TEXT,
    ADD COLUMN IF NOT EXISTS avatar_url_200 TEXT;

COMMENT ON COLUMN public.tiktok_accounts.union_id IS
    'TikTok Union ID — stable identifier that stays the same across apps in the same developer suite';
COMMENT ON COLUMN public.tiktok_accounts.bio_description IS
    'User biography / bio text from their TikTok profile';
COMMENT ON COLUMN public.tiktok_accounts.is_verified IS
    'Whether the TikTok account has a verified badge';
COMMENT ON COLUMN public.tiktok_accounts.profile_deep_link IS
    'Direct deep link to the TikTok profile (e.g. https://www.tiktok.com/@username)';
COMMENT ON COLUMN public.tiktok_accounts.avatar_url_100 IS
    '100px avatar thumbnail URL';
COMMENT ON COLUMN public.tiktok_accounts.avatar_url_200 IS
    '200px avatar thumbnail URL';

-- ─── tiktok_videos ───────────────────────────────────────────────────────────
-- New fields from video/list: video_description (caption), duration,
--   height, width, share_url, embed_html, embed_link

ALTER TABLE public.tiktok_videos
    ADD COLUMN IF NOT EXISTS video_description TEXT,
    ADD COLUMN IF NOT EXISTS duration_seconds INTEGER DEFAULT 0,
    ADD COLUMN IF NOT EXISTS height INTEGER DEFAULT 0,
    ADD COLUMN IF NOT EXISTS width INTEGER DEFAULT 0,
    ADD COLUMN IF NOT EXISTS share_url TEXT,
    ADD COLUMN IF NOT EXISTS embed_html TEXT,
    ADD COLUMN IF NOT EXISTS embed_link TEXT;

COMMENT ON COLUMN public.tiktok_videos.video_description IS
    'The TikTok video caption / description text';
COMMENT ON COLUMN public.tiktok_videos.duration_seconds IS
    'Video duration in seconds';
COMMENT ON COLUMN public.tiktok_videos.height IS
    'Video height in pixels';
COMMENT ON COLUMN public.tiktok_videos.width IS
    'Video width in pixels';
COMMENT ON COLUMN public.tiktok_videos.share_url IS
    'Shareable URL for the video (e.g. https://www.tiktok.com/@user/video/...)';
COMMENT ON COLUMN public.tiktok_videos.embed_html IS
    'Raw embed HTML snippet for embedding the video in a web page';
COMMENT ON COLUMN public.tiktok_videos.embed_link IS
    'Embed link URL (alternative to embed_html)';
