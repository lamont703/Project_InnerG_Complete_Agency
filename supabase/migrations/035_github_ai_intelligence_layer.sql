-- 1. Ensure the Intelligence Table exists
CREATE TABLE IF NOT EXISTS public.github_insights (
    id UUID PRIMARY KEY DEFAULT extensions.uuid_generate_v4(),
    project_id UUID NOT NULL REFERENCES public.projects(id) ON DELETE CASCADE,
    type TEXT NOT NULL, 
    title TEXT NOT NULL,
    content TEXT NOT NULL, 
    source_count INTEGER DEFAULT 0,
    metadata JSONB DEFAULT '{}'::jsonb,
    created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- 2. Fixed RLS Policy (with DROP statement to prevent errors)
DROP POLICY IF EXISTS "Users can view GitHub insights for their projects" ON public.github_insights;
CREATE POLICY "Users can view GitHub insights for their projects"
    ON public.github_insights FOR SELECT
    USING (project_id IN (SELECT project_id FROM public.project_user_access WHERE user_id = auth.uid()));

-- 3. Fixed Embedding Trigger (Corrected column name 'created_at')
CREATE OR REPLACE FUNCTION public.queue_embedding_job()
RETURNS TRIGGER AS $$
DECLARE
  v_project_id UUID;
BEGIN
  CASE TG_TABLE_NAME
    WHEN 'campaign_metrics' THEN
      SELECT project_id INTO v_project_id FROM public.campaigns WHERE id = NEW.campaign_id;
    WHEN 'funnel_events' THEN
      SELECT c.project_id INTO v_project_id FROM public.funnel_stages fs JOIN public.campaigns c ON c.id = fs.campaign_id WHERE fs.id = NEW.funnel_stage_id;
    WHEN 'agency_knowledge' THEN
      v_project_id := '00000000-0000-0000-0000-000000000000'::UUID;
    WHEN 'github_commits' THEN
      SELECT project_id INTO v_project_id FROM public.github_repos WHERE id = NEW.repo_id;
    ELSE
      v_project_id := NEW.project_id;
  END CASE;

  IF v_project_id IS NOT NULL THEN
    INSERT INTO public.embedding_jobs (project_id, source_table, source_id)
    VALUES (v_project_id, TG_TABLE_NAME, NEW.id)
    ON CONFLICT (source_table, source_id) DO UPDATE 
    SET status = 'pending', created_at = now(); 
  END IF;

  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;
