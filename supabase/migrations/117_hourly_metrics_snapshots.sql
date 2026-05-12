-- Migration: 117_hourly_metrics_snapshots
-- Description: Create hourly metrics snapshot tracking for 24-hour rolling averages

CREATE TABLE IF NOT EXISTS public.project_hourly_metrics (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    project_id UUID NOT NULL REFERENCES public.projects(id) ON DELETE CASCADE,
    snapshot_timestamp TIMESTAMPTZ NOT NULL DEFAULT now(),
    youtube_views BIGINT DEFAULT 0,
    tiktok_views BIGINT DEFAULT 0,
    linkedin_views BIGINT DEFAULT 0,
    instagram_reach BIGINT DEFAULT 0,
    twitter_impressions BIGINT DEFAULT 0,
    facebook_reach BIGINT DEFAULT 0,
    total_social_engagement BIGINT DEFAULT 0,
    metrics_payload JSONB DEFAULT '{}'::jsonb,
    created_at TIMESTAMPTZ DEFAULT now()
);

-- Indexes for fast chronological queries
CREATE INDEX IF NOT EXISTS idx_project_hourly_metrics_lookup ON public.project_hourly_metrics(project_id, snapshot_timestamp DESC);

-- Enable RLS
ALTER TABLE public.project_hourly_metrics ENABLE ROW LEVEL SECURITY;

-- RLS Policies
CREATE POLICY "Super admins and analytics engines can manage hourly snapshots"
ON public.project_hourly_metrics FOR ALL 
TO authenticated 
USING (
  EXISTS (
    SELECT 1 FROM public.users 
    WHERE id = auth.uid() AND role = 'super_admin'
  )
);

-- Create a helper function to cleanly truncate or manage table size if it gets too large (e.g., keep only 30 days)
CREATE OR REPLACE FUNCTION public.cleanup_stale_hourly_metrics()
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
    DELETE FROM public.project_hourly_metrics
    WHERE snapshot_timestamp < now() - INTERVAL '30 days';
END;
$$;
