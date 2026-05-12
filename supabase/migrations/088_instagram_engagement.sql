-- Migration 084: Instagram Engagement
-- Inner G Complete Agency — Client Intelligence Portal

-- 1. Add Instagram engagement controls to project_agent_config
ALTER TABLE public.project_agent_config
  ADD COLUMN IF NOT EXISTS instagram_engagement_enabled BOOLEAN NOT NULL DEFAULT FALSE;

COMMENT ON COLUMN public.project_agent_config.instagram_engagement_enabled IS
  'If true, the AI agent will automatically respond to comments on Instagram media synced to this project.';

-- 2. Create instagram_comments table
CREATE TABLE IF NOT EXISTS public.instagram_comments (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    project_id UUID NOT NULL REFERENCES public.projects(id) ON DELETE CASCADE,
    media_id UUID NOT NULL REFERENCES public.instagram_media(id) ON DELETE CASCADE,
    instagram_comment_id TEXT NOT NULL,
    from_id TEXT NOT NULL,
    from_username TEXT,
    content TEXT NOT NULL,
    created_at TIMESTAMP WITH TIME ZONE NOT NULL,
    last_synced_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    parent_comment_id TEXT, -- For threading (Instagram supports 1 level of nesting)
    ai_processed_at TIMESTAMP WITH TIME ZONE,
    UNIQUE(project_id, instagram_comment_id)
);

-- Indexes
CREATE INDEX IF NOT EXISTS idx_instagram_comments_project ON public.instagram_comments(project_id);
CREATE INDEX IF NOT EXISTS idx_instagram_comments_media ON public.instagram_comments(media_id);
CREATE INDEX IF NOT EXISTS idx_instagram_comments_ai_pending 
  ON public.instagram_comments (project_id, ai_processed_at) 
  WHERE ai_processed_at IS NULL;

-- RLS
ALTER TABLE public.instagram_comments ENABLE ROW LEVEL SECURITY;

-- Policies
DROP POLICY IF EXISTS "Users can view comments for their project's instagram media" ON public.instagram_comments;
CREATE POLICY "Users can view comments for their project's instagram media"
    ON public.instagram_comments FOR SELECT
    USING (can_access_project(project_id));

-- AI RAG: QUEUE EMBEDDINGS
DROP TRIGGER IF EXISTS trigger_queue_instagram_comments_embedding ON public.instagram_comments;
CREATE TRIGGER trigger_queue_instagram_comments_embedding
    AFTER INSERT OR UPDATE ON public.instagram_comments
    FOR EACH ROW EXECUTE FUNCTION queue_embedding_job();

COMMENT ON TABLE public.instagram_comments IS 'Stores text content of comments on Instagram media for agency intelligence and automated engagement.';
