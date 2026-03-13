-- Migration 048: LinkedIn Comments
-- Inner G Complete Agency — Client Intelligence Portal
-- Storing comments for LinkedIn posts to enable AI sentiment analysis and engagement tracking.

CREATE TABLE IF NOT EXISTS public.linkedin_comments (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    project_id UUID NOT NULL REFERENCES public.projects(id) ON DELETE CASCADE,
    post_id UUID NOT NULL REFERENCES public.linkedin_posts(id) ON DELETE CASCADE,
    linkedin_comment_id TEXT NOT NULL, -- urn:li:comment:(ugcPost:123,456)
    actor_urn TEXT NOT NULL, -- urn:li:person:123 or urn:li:organization:123
    content TEXT NOT NULL,
    created_at TIMESTAMP WITH TIME ZONE NOT NULL,
    last_synced_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    parent_comment_id TEXT, -- For threading if we want to store it (optional)
    UNIQUE(project_id, linkedin_comment_id)
);

-- Indexes
CREATE INDEX IF NOT EXISTS idx_linkedin_comments_project ON public.linkedin_comments(project_id);
CREATE INDEX IF NOT EXISTS idx_linkedin_comments_post ON public.linkedin_comments(post_id);

-- RLS
ALTER TABLE public.linkedin_comments ENABLE ROW LEVEL SECURITY;

-- Policies
DROP POLICY IF EXISTS "Users can view comments for their project's linkedin posts" ON public.linkedin_comments;
CREATE POLICY "Users can view comments for their project's linkedin posts"
    ON public.linkedin_comments FOR SELECT
    USING (project_id IN (SELECT project_id FROM public.project_user_access WHERE user_id = auth.uid()));

-- AI RAG: QUEUE EMBEDDINGS
DROP TRIGGER IF EXISTS trigger_queue_linkedin_comments_embedding ON public.linkedin_comments;
CREATE TRIGGER trigger_queue_linkedin_comments_embedding
    AFTER INSERT OR UPDATE ON public.linkedin_comments
    FOR EACH ROW EXECUTE FUNCTION queue_embedding_job();

-- Add Comment
COMMENT ON TABLE public.linkedin_comments IS 'Stores text content of comments on LinkedIn posts for agency intelligence.';
