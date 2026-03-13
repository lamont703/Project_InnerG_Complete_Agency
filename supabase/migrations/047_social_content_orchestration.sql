-- Migration 047: Social Content Orchestration
-- Inner G Complete Agency — Client Intelligence Portal
-- Provides the "Social Employee" framework for AI-driven multi-platform content planning.

-- 1. Post Status Enum
DO $$ 
BEGIN
    CREATE TYPE public.social_post_status AS ENUM ('draft', 'approved', 'scheduled', 'published', 'failed');
EXCEPTION
    WHEN duplicate_object THEN NULL;
END $$;

-- 2. Social Content Plan Table
CREATE TABLE IF NOT EXISTS public.social_content_plan (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    project_id UUID NOT NULL REFERENCES public.projects(id) ON DELETE CASCADE,
    platform public.social_platform NOT NULL,
    content_text TEXT NOT NULL,
    status public.social_post_status NOT NULL DEFAULT 'draft',
    
    -- "Build in Public" Context
    source_type TEXT, -- 'github', 'notion', 'ghl', 'manual'
    source_metadata JSONB DEFAULT '{}'::jsonb, -- e.g. { "commit_id": "...", "page_url": "..." }
    
    -- AI Intent
    ai_reasoning TEXT,
    
    -- Metadata & Logs
    scheduled_at TIMESTAMPTZ,
    published_at TIMESTAMPTZ,
    error_log TEXT,
    external_post_id TEXT, -- The ID returned by LinkedIn/TikTok after posting
    
    created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- 3. Indexes
CREATE INDEX IF NOT EXISTS idx_social_content_project ON public.social_content_plan(project_id);
CREATE INDEX IF NOT EXISTS idx_social_content_status ON public.social_content_plan(status);
CREATE INDEX IF NOT EXISTS idx_social_content_platform ON public.social_content_plan(platform);

-- 4. Enable RLS
ALTER TABLE public.social_content_plan ENABLE ROW LEVEL SECURITY;

-- 5. RLS Policies
DROP POLICY IF EXISTS "Users can view content plans for their projects" ON public.social_content_plan;
CREATE POLICY "Users can view content plans for their projects"
    ON public.social_content_plan FOR SELECT
    USING (project_id IN (SELECT project_id FROM public.project_user_access WHERE user_id = auth.uid()));

DROP POLICY IF EXISTS "Users can create content plans for their projects" ON public.social_content_plan;
CREATE POLICY "Users can create content plans for their projects"
    ON public.social_content_plan FOR INSERT
    WITH CHECK (project_id IN (SELECT project_id FROM public.project_user_access WHERE user_id = auth.uid()));

DROP POLICY IF EXISTS "Users can update content plans for their projects" ON public.social_content_plan;
CREATE POLICY "Users can update content plans for their projects"
    ON public.social_content_plan FOR UPDATE
    USING (project_id IN (SELECT project_id FROM public.project_user_access WHERE user_id = auth.uid()));

-- 6. AI RAG: QUEUE EMBEDDINGS
DROP TRIGGER IF EXISTS social_content_plan_queue_embedding ON public.social_content_plan;
CREATE TRIGGER social_content_plan_queue_embedding
  AFTER INSERT OR UPDATE ON public.social_content_plan
  FOR EACH ROW EXECUTE FUNCTION queue_embedding_job();

-- 7. Add Comment
COMMENT ON TABLE public.social_content_plan IS 'Stores AI-generated social media drafts and their deployment status across platforms.';
