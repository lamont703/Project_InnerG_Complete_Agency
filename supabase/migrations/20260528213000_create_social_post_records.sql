-- Migration 172: Create Social Post Records
-- Inner G Complete Agency — Client Intelligence Portal
-- Tracks published social media posts for archiving and reposting

CREATE TABLE IF NOT EXISTS public.social_post_records (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    project_id UUID NOT NULL REFERENCES public.projects(id) ON DELETE CASCADE,
    platform TEXT NOT NULL, -- 'instagram', 'tiktok', 'linkedin', etc.
    media_url TEXT,
    caption TEXT,
    hashtags TEXT[],
    external_post_id TEXT,
    created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Indexes
CREATE INDEX IF NOT EXISTS idx_social_post_records_project ON public.social_post_records(project_id);
CREATE INDEX IF NOT EXISTS idx_social_post_records_platform ON public.social_post_records(platform);

-- Enable RLS
ALTER TABLE public.social_post_records ENABLE ROW LEVEL SECURITY;

-- RLS Policies
DROP POLICY IF EXISTS "Users can view post records for their projects" ON public.social_post_records;
CREATE POLICY "Users can view post records for their projects"
    ON public.social_post_records FOR SELECT
    USING (project_id IN (SELECT project_id FROM public.project_user_access WHERE user_id = auth.uid()));

DROP POLICY IF EXISTS "Users can create post records for their projects" ON public.social_post_records;
CREATE POLICY "Users can create post records for their projects"
    ON public.social_post_records FOR INSERT
    WITH CHECK (project_id IN (SELECT project_id FROM public.project_user_access WHERE user_id = auth.uid()));

-- Comment
COMMENT ON TABLE public.social_post_records IS 'Permanent archive of published social media posts across all platforms.';
