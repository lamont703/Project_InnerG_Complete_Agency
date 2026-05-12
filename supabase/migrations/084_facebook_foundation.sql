-- Migration 084: Facebook Integration foundation 
-- Adds Facebook as a supported connector.

-- 1. Add 'facebook' to relevant enums if not present
DO $$ 
BEGIN
    ALTER TYPE public.external_db_type ADD VALUE 'facebook';
EXCEPTION
    WHEN duplicate_object THEN NULL;
END $$;

-- 2. Seed Facebook Connector Type
INSERT INTO public.connector_types (name, provider, description, config_schema)
VALUES (
    'Facebook Meta',
    'facebook',
    'Connect your Facebook Page to sync analytics, reach, and community metrics.',
    '{
        "required": ["access_token"],
        "properties": {
            "access_token": { "type": "string", "label": "Meta Access Token", "placeholder": "EAAG...", "sensitive": true },
            "facebook_page_id": { "type": "string", "label": "Linked FB Page ID" }
        }
    }'::jsonb
)
ON CONFLICT (name) DO UPDATE 
SET config_schema = EXCLUDED.config_schema,
    description = EXCLUDED.description,
    provider = EXCLUDED.provider;

-- 3. Facebook Pages (for data tracking)
CREATE TABLE IF NOT EXISTS public.facebook_pages (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    project_id UUID NOT NULL REFERENCES public.projects(id) ON DELETE CASCADE,
    facebook_page_id TEXT NOT NULL,
    name TEXT,
    page_access_token TEXT,
    profile_picture_url TEXT,
    followers_count BIGINT DEFAULT 0,
    fan_count BIGINT DEFAULT 0,
    last_synced_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    UNIQUE(project_id, facebook_page_id)
);

-- RLS
ALTER TABLE public.facebook_pages ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Users can view their project's facebook pages" ON public.facebook_pages;
CREATE POLICY "Users can view their project's facebook pages" 
    ON public.facebook_pages FOR SELECT 
    USING (can_access_project(project_id));

-- Trigger for AI RAG
DROP TRIGGER IF EXISTS trigger_queue_facebook_pages_embedding ON public.facebook_pages;
CREATE TRIGGER trigger_queue_facebook_pages_embedding
    AFTER INSERT OR UPDATE ON public.facebook_pages
    FOR EACH ROW EXECUTE FUNCTION queue_embedding_job();
