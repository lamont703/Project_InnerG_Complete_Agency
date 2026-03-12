-- Migration 043: Create LinkedIn Analytics Intelligence Tables
-- Storing LinkedIn page metrics and post data for AI analysis.

-- 1. LinkedIn Pages
CREATE TABLE IF NOT EXISTS public.linkedin_pages (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    project_id UUID NOT NULL REFERENCES public.projects(id) ON DELETE CASCADE,
    linkedin_page_id TEXT NOT NULL, -- urn:li:organization:123
    name TEXT NOT NULL,
    vanity_name TEXT,
    logo_url TEXT,
    follower_count BIGINT DEFAULT 0,
    total_views BIGINT DEFAULT 0,
    total_clicks BIGINT DEFAULT 0,
    engagement_rate FLOAT DEFAULT 0,
    last_synced_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    UNIQUE(project_id, linkedin_page_id)
);

-- 2. LinkedIn Posts
CREATE TABLE IF NOT EXISTS public.linkedin_posts (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    project_id UUID NOT NULL REFERENCES public.projects(id) ON DELETE CASCADE,
    page_id UUID REFERENCES public.linkedin_pages(id) ON DELETE CASCADE,
    linkedin_post_id TEXT NOT NULL, -- urn:li:share:123 or urn:li:ugcPost:123
    content TEXT,
    published_at TIMESTAMP WITH TIME ZONE,
    view_count BIGINT DEFAULT 0,
    like_count BIGINT DEFAULT 0,
    comment_count BIGINT DEFAULT 0,
    share_count BIGINT DEFAULT 0,
    last_synced_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    UNIQUE(project_id, linkedin_post_id)
);

-- Indexes
CREATE INDEX IF NOT EXISTS idx_linkedin_pages_project ON public.linkedin_pages(project_id);
CREATE INDEX IF NOT EXISTS idx_linkedin_posts_project ON public.linkedin_posts(project_id);
CREATE INDEX IF NOT EXISTS idx_linkedin_posts_page ON public.linkedin_posts(page_id);

-- RLS
ALTER TABLE public.linkedin_pages ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.linkedin_posts ENABLE ROW LEVEL SECURITY;

-- Policies
CREATE POLICY "Users can view their project's linkedin pages" 
    ON public.linkedin_pages FOR SELECT 
    USING (project_id IN (SELECT project_id FROM public.project_user_access WHERE user_id = auth.uid()));

CREATE POLICY "Users can view their project's linkedin posts" 
    ON public.linkedin_posts FOR SELECT 
    USING (project_id IN (SELECT project_id FROM public.project_user_access WHERE user_id = auth.uid()));

-- AI RAG: QUEUE EMBEDDINGS
DROP TRIGGER IF EXISTS trigger_queue_linkedin_pages_embedding ON public.linkedin_pages;
CREATE TRIGGER trigger_queue_linkedin_pages_embedding
    AFTER INSERT OR UPDATE ON public.linkedin_pages
    FOR EACH ROW EXECUTE FUNCTION queue_embedding_job();

DROP TRIGGER IF EXISTS trigger_queue_linkedin_posts_embedding ON public.linkedin_posts;
CREATE TRIGGER trigger_queue_linkedin_posts_embedding
    AFTER INSERT OR UPDATE ON public.linkedin_posts
    FOR EACH ROW EXECUTE FUNCTION queue_embedding_job();
