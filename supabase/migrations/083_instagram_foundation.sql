-- Migration 083: Instagram Integration Foundation
-- Adds Instagram as a supported connector and creates account/media tables.

-- 1. Add 'instagram' to relevant enums if not present
DO $$ 
BEGIN
    ALTER TYPE public.external_db_type ADD VALUE 'instagram';
EXCEPTION
    WHEN duplicate_object THEN NULL;
END $$;

-- 2. Seed Instagram Connector Type
-- We'll use this so users can see Instagram in their Connector Admin
INSERT INTO public.connector_types (name, provider, description, config_schema)
VALUES (
    'Instagram Business',
    'instagram',
    'Sync Instagram Business account metrics, media engagement, and audience growth.',
    '{
        "required": ["access_token"],
        "properties": {
            "access_token": { "type": "string", "label": "Meta Access Token", "placeholder": "EAAG...", "sensitive": true },
            "instagram_business_account_id": { "type": "string", "label": "IG Business ID", "placeholder": "1784..." },
            "facebook_page_id": { "type": "string", "label": "Linked FB Page ID" }
        }
    }'::jsonb
)
ON CONFLICT (name) DO UPDATE 
SET config_schema = EXCLUDED.config_schema,
    description = EXCLUDED.description,
    provider = EXCLUDED.provider;

-- 3. Instagram Accounts
CREATE TABLE IF NOT EXISTS public.instagram_accounts (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    project_id UUID NOT NULL REFERENCES public.projects(id) ON DELETE CASCADE,
    instagram_business_id TEXT NOT NULL,
    username TEXT NOT NULL,
    name TEXT,
    profile_picture_url TEXT,
    follower_count BIGINT DEFAULT 0,
    media_count BIGINT DEFAULT 0,
    last_synced_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    UNIQUE(project_id, instagram_business_id)
);

-- 4. Instagram Media (Posts/Reels)
CREATE TABLE IF NOT EXISTS public.instagram_media (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    project_id UUID NOT NULL REFERENCES public.projects(id) ON DELETE CASCADE,
    instagram_media_id TEXT NOT NULL,
    caption TEXT,
    media_type TEXT, -- IMAGE, VIDEO, CAROUSEL_ALBUM
    media_url TEXT,
    permalink TEXT,
    timestamp TIMESTAMP WITH TIME ZONE,
    like_count BIGINT DEFAULT 0,
    comments_count BIGINT DEFAULT 0,
    reach BIGINT DEFAULT 0,
    impressions BIGINT DEFAULT 0,
    last_synced_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    UNIQUE(project_id, instagram_media_id)
);

-- Indexes
CREATE INDEX IF NOT EXISTS idx_instagram_accounts_project ON public.instagram_accounts(project_id);
CREATE INDEX IF NOT EXISTS idx_instagram_media_project ON public.instagram_media(project_id);

-- RLS
ALTER TABLE public.instagram_accounts ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.instagram_media ENABLE ROW LEVEL SECURITY;

-- Policies
DROP POLICY IF EXISTS "Users can view their project's instagram accounts" ON public.instagram_accounts;
CREATE POLICY "Users can view their project's instagram accounts" 
    ON public.instagram_accounts FOR SELECT 
    USING (can_access_project(project_id));

DROP POLICY IF EXISTS "Users can view their project's instagram media" ON public.instagram_media;
CREATE POLICY "Users can view their project's instagram media" 
    ON public.instagram_media FOR SELECT 
    USING (can_access_project(project_id));

-- AI RAG Triggers
DROP TRIGGER IF EXISTS trigger_queue_instagram_accounts_embedding ON public.instagram_accounts;
CREATE TRIGGER trigger_queue_instagram_accounts_embedding
    AFTER INSERT OR UPDATE ON public.instagram_accounts
    FOR EACH ROW EXECUTE FUNCTION queue_embedding_job();

DROP TRIGGER IF EXISTS trigger_queue_instagram_media_embedding ON public.instagram_media;
CREATE TRIGGER trigger_queue_instagram_media_embedding
    AFTER INSERT OR UPDATE ON public.instagram_media
    FOR EACH ROW EXECUTE FUNCTION queue_embedding_job();
