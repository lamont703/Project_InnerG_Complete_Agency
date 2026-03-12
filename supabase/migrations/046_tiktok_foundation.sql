-- Migration 046: TikTok Integration Foundation
-- Adds TikTok as a supported platform and connector.

-- 1. Add 'tiktok' to relevant enums
DO $$ 
BEGIN
    ALTER TYPE public.social_platform ADD VALUE 'tiktok';
EXCEPTION
    WHEN duplicate_object THEN NULL;
END $$;

DO $$ 
BEGIN
    ALTER TYPE public.integration_source ADD VALUE 'tiktok';
EXCEPTION
    WHEN duplicate_object THEN NULL;
END $$;

DO $$ 
BEGIN
    ALTER TYPE public.external_db_type ADD VALUE 'tiktok';
EXCEPTION
    WHEN duplicate_object THEN NULL;
END $$;

-- 2. Seed TikTok Connector Type
INSERT INTO public.connector_types (name, provider, description, config_schema)
VALUES (
    'TikTok Business',
    'tiktok',
    'Sync TikTok account metrics, video engagement, and follower growth.',
    '{
        "required": ["access_token"],
        "properties": {
            "access_token": { "type": "string", "label": "TikTok Access Token", "placeholder": "act...", "sensitive": true },
            "refresh_token": { "type": "string", "label": "TikTok Refresh Token", "sensitive": true },
            "tiktok_user_id": { "type": "string", "label": "TikTok User ID", "placeholder": "enter your open_id or user_id" }
        }
    }'::jsonb
)
ON CONFLICT (name) DO UPDATE 
SET config_schema = EXCLUDED.config_schema,
    description = EXCLUDED.description,
    provider = EXCLUDED.provider;

-- 3. Add tiktok_data_enabled to project_agent_config
ALTER TABLE public.project_agent_config 
ADD COLUMN IF NOT EXISTS tiktok_data_enabled BOOLEAN NOT NULL DEFAULT TRUE;

COMMENT ON COLUMN public.project_agent_config.tiktok_data_enabled IS 
'Whether the AI agent should include TikTok account and video data in its RAG context.';

-- 4. TikTok Accounts
CREATE TABLE IF NOT EXISTS public.tiktok_accounts (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    project_id UUID NOT NULL REFERENCES public.projects(id) ON DELETE CASCADE,
    tiktok_user_id TEXT NOT NULL,
    username TEXT NOT NULL,
    display_name TEXT,
    avatar_url TEXT,
    follower_count BIGINT DEFAULT 0,
    following_count BIGINT DEFAULT 0,
    heart_count BIGINT DEFAULT 0,
    video_count BIGINT DEFAULT 0,
    last_synced_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    UNIQUE(project_id, tiktok_user_id)
);

-- 5. TikTok Videos
CREATE TABLE IF NOT EXISTS public.tiktok_videos (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    project_id UUID NOT NULL REFERENCES public.projects(id) ON DELETE CASCADE,
    tiktok_video_id TEXT NOT NULL,
    title TEXT, -- Caption
    published_at TIMESTAMP WITH TIME ZONE,
    cover_url TEXT,
    view_count BIGINT DEFAULT 0,
    like_count BIGINT DEFAULT 0,
    comment_count BIGINT DEFAULT 0,
    share_count BIGINT DEFAULT 0,
    last_synced_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    UNIQUE(project_id, tiktok_video_id)
);

-- Indexes
CREATE INDEX IF NOT EXISTS idx_tiktok_accounts_project ON public.tiktok_accounts(project_id);
CREATE INDEX IF NOT EXISTS idx_tiktok_videos_project ON public.tiktok_videos(project_id);

-- RLS
ALTER TABLE public.tiktok_accounts ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.tiktok_videos ENABLE ROW LEVEL SECURITY;

-- Policies
DROP POLICY IF EXISTS "Users can view their project's tiktok accounts" ON public.tiktok_accounts;
CREATE POLICY "Users can view their project's tiktok accounts" 
    ON public.tiktok_accounts FOR SELECT 
    USING (can_access_project(project_id));

DROP POLICY IF EXISTS "Users can view their project's tiktok videos" ON public.tiktok_videos;
CREATE POLICY "Users can view their project's tiktok videos" 
    ON public.tiktok_videos FOR SELECT 
    USING (can_access_project(project_id));

-- AI RAG: QUEUE EMBEDDINGS
DROP TRIGGER IF EXISTS trigger_queue_tiktok_accounts_embedding ON public.tiktok_accounts;
CREATE TRIGGER trigger_queue_tiktok_accounts_embedding
    AFTER INSERT OR UPDATE ON public.tiktok_accounts
    FOR EACH ROW EXECUTE FUNCTION queue_embedding_job();

DROP TRIGGER IF EXISTS trigger_queue_tiktok_videos_embedding ON public.tiktok_videos;
CREATE TRIGGER trigger_queue_tiktok_videos_embedding
    AFTER INSERT OR UPDATE ON public.tiktok_videos
    FOR EACH ROW EXECUTE FUNCTION queue_embedding_job();
