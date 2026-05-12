-- ============================================================
-- Migration 037: GHL Social Planner Intelligence
-- Inner G Complete Agency — Client Intelligence Portal
-- ============================================================
-- Adds support for GHL Social Accounts and Posts.
-- Enables the AI Agent to track social media strategy and content.
-- ============================================================

-- GHL SOCIAL ACCOUNTS
CREATE TABLE IF NOT EXISTS public.ghl_social_accounts (
  id                UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  project_id        UUID REFERENCES public.projects(id) ON DELETE CASCADE,
  ghl_account_id    TEXT NOT NULL,
  name              TEXT NOT NULL,
  type              TEXT NOT NULL, -- facebook, instagram, linkedin, etc.
  created_at        TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at        TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE(project_id, ghl_account_id)
);

-- GHL SOCIAL POSTS
CREATE TABLE IF NOT EXISTS public.ghl_social_posts (
  id                UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  project_id        UUID NOT NULL REFERENCES public.projects(id) ON DELETE CASCADE,
  ghl_post_id       TEXT NOT NULL UNIQUE,
  account_id        UUID REFERENCES public.ghl_social_accounts(id) ON DELETE CASCADE,
  content           TEXT,
  status            TEXT NOT NULL, -- scheduled, posted, failed, etc.
  post_type         TEXT,
  scheduled_at      TIMESTAMPTZ,
  posted_at         TIMESTAMPTZ,
  metadata          JSONB DEFAULT '{}'::jsonb,
  created_at        TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at        TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- GHL SOCIAL INSIGHTS (AI distilled strategy)
CREATE TABLE IF NOT EXISTS public.ghl_social_insights (
    id UUID PRIMARY KEY DEFAULT extensions.uuid_generate_v4(),
    project_id UUID NOT NULL REFERENCES public.projects(id) ON DELETE CASCADE,
    type TEXT NOT NULL, -- 'content_strategy', 'engagement_alert', 'trend_analysis'
    title TEXT NOT NULL,
    content TEXT NOT NULL,
    metadata JSONB DEFAULT '{}'::jsonb,
    created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Add indexes for performance and RAG
CREATE INDEX IF NOT EXISTS idx_ghl_social_accounts_project ON public.ghl_social_accounts(project_id);
CREATE INDEX IF NOT EXISTS idx_ghl_social_posts_project ON public.ghl_social_posts(project_id);
CREATE INDEX IF NOT EXISTS idx_ghl_social_posts_account ON public.ghl_social_posts(account_id);
CREATE INDEX IF NOT EXISTS idx_ghl_social_insights_project ON public.ghl_social_insights(project_id);

-- Enable RLS
ALTER TABLE public.ghl_social_accounts ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.ghl_social_posts ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.ghl_social_insights ENABLE ROW LEVEL SECURITY;

-- RLS Policies
DROP POLICY IF EXISTS "Users can view social accounts for their projects" ON public.ghl_social_accounts;
CREATE POLICY "Users can view social accounts for their projects"
    ON public.ghl_social_accounts FOR SELECT
    USING (project_id IN (SELECT project_id FROM public.project_user_access WHERE user_id = auth.uid()));

DROP POLICY IF EXISTS "Users can view social posts for their projects" ON public.ghl_social_posts;
CREATE POLICY "Users can view social posts for their projects"
    ON public.ghl_social_posts FOR SELECT
    USING (project_id IN (SELECT project_id FROM public.project_user_access WHERE user_id = auth.uid()));

DROP POLICY IF EXISTS "Users can view social insights for their projects" ON public.ghl_social_insights;
CREATE POLICY "Users can view social insights for their projects"
    ON public.ghl_social_insights FOR SELECT
    USING (project_id IN (SELECT project_id FROM public.project_user_access WHERE user_id = auth.uid()));

-- AI RAG: QUEUE EMBEDDINGS
-- Posts
DROP TRIGGER IF EXISTS ghl_social_posts_queue_embedding ON public.ghl_social_posts;
CREATE TRIGGER ghl_social_posts_queue_embedding
  AFTER INSERT OR UPDATE ON public.ghl_social_posts
  FOR EACH ROW EXECUTE FUNCTION queue_embedding_job();

-- Insights
DROP TRIGGER IF EXISTS ghl_social_insights_queue_embedding ON public.ghl_social_insights;
CREATE TRIGGER ghl_social_insights_queue_embedding
  AFTER INSERT OR UPDATE ON public.ghl_social_insights
  FOR EACH ROW EXECUTE FUNCTION queue_embedding_job();
