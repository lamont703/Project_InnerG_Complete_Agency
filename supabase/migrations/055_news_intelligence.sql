
-- Migration 055: News Intelligence
-- Inner G Complete Agency — News & Trends Intelligence Layer

-- 1. Add newsapi to external providers
DO $$ 
BEGIN
    ALTER TYPE public.external_db_type ADD VALUE 'newsapi';
EXCEPTION
    WHEN duplicate_object THEN NULL;
END $$;

-- 2. Seed NewsAPI Connector Type
INSERT INTO public.connector_types (name, provider, description, config_schema)
VALUES (
    'News Intelligence (NewsAPI)',
    'newsapi',
    'Sync high-engagement trending news for AI-driven social orchestration.',
    '{
        "required": ["apiKey"],
        "properties": {
            "apiKey": { "type": "string", "label": "NewsAPI Key", "placeholder": "3174...", "sensitive": true }
        }
    }'::jsonb
)
ON CONFLICT (provider) DO UPDATE 
SET config_schema = EXCLUDED.config_schema,
    description = EXCLUDED.description;

-- 3. Create enum for news categories (buckets)
DO $$ 
BEGIN
    CREATE TYPE public.news_bucket AS ENUM (
        'big_tech_rivalry', 
        'future_of_work', 
        'ethics_regulation', 
        'institutional_web3',
        'general_tech'
    );
EXCEPTION
    WHEN duplicate_object THEN NULL;
END $$;

-- 2. News Intelligence Table
CREATE TABLE IF NOT EXISTS public.news_intelligence (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    project_id UUID NOT NULL REFERENCES public.projects(id) ON DELETE CASCADE,
    
    -- Article Metadata
    bucket public.news_bucket NOT NULL,
    title TEXT NOT NULL,
    description TEXT,
    url TEXT NOT NULL,
    source_name TEXT,
    published_at TIMESTAMPTZ NOT NULL,
    
    -- Processing State
    is_processed BOOLEAN DEFAULT false,
    processed_at TIMESTAMPTZ,
    social_plan_id UUID REFERENCES public.social_content_plan(id) ON DELETE SET NULL,
    
    -- Sync Metadata
    synced_at TIMESTAMPTZ DEFAULT now(),
    
    -- Prevent duplicate articles within a project
    UNIQUE(project_id, url)
);

-- 3. Indexes
CREATE INDEX IF NOT EXISTS idx_news_intel_project ON public.news_intelligence(project_id);
CREATE INDEX IF NOT EXISTS idx_news_intel_bucket ON public.news_intelligence(bucket);
CREATE INDEX IF NOT EXISTS idx_news_intel_is_processed ON public.news_intelligence(is_processed);
CREATE INDEX IF NOT EXISTS idx_news_intel_published_at ON public.news_intelligence(published_at);

-- 4. Enable RLS
ALTER TABLE public.news_intelligence ENABLE ROW LEVEL SECURITY;

-- 5. RLS Policies
DROP POLICY IF EXISTS "Users can view news intelligence for their projects" ON public.news_intelligence;
CREATE POLICY "Users can view news intelligence for their projects"
    ON public.news_intelligence FOR SELECT
    USING (project_id IN (SELECT project_id FROM public.project_user_access WHERE user_id = auth.uid()));

-- 6. Cleanup Function (TTL: 7 days)
-- We'll keep it for 7 days to give the AI enough "weekly" context
CREATE OR REPLACE FUNCTION public.cleanup_old_news_intelligence()
RETURNS void AS $$
BEGIN
    DELETE FROM public.news_intelligence
    WHERE published_at < now() - INTERVAL '7 days'
    AND is_processed = false;
END;
$$ LANGUAGE plpgsql;

-- 7. Comment
COMMENT ON TABLE public.news_intelligence IS 'Stores curated, high-engagement news articles for AI agents to use in social content orchestration.';
