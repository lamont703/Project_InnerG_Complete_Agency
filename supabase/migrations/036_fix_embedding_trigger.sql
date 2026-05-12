-- Fix for Migration 035 column mismatch
-- Corrects 'updated_at' to 'created_at' for the embedding_jobs table

CREATE OR REPLACE FUNCTION public.queue_embedding_job()
RETURNS TRIGGER AS $$
DECLARE
  v_project_id UUID;
BEGIN
  -- Determine project_id based on the source table
  CASE TG_TABLE_NAME
    WHEN 'campaign_metrics' THEN
      SELECT project_id INTO v_project_id FROM public.campaigns WHERE id = NEW.campaign_id;
    WHEN 'funnel_events' THEN
      SELECT c.project_id INTO v_project_id
      FROM public.funnel_stages fs
      JOIN public.campaigns c ON c.id = fs.campaign_id
      WHERE fs.id = NEW.funnel_stage_id;
    WHEN 'agency_knowledge' THEN
      v_project_id := '00000000-0000-0000-0000-000000000000'::UUID;
    WHEN 'github_commits' THEN
      SELECT project_id INTO v_project_id FROM public.github_repos WHERE id = NEW.repo_id;
    ELSE
      -- Most tables (including github_insights, github_repos) have project_id directly
      v_project_id := NEW.project_id;
  END CASE;

  -- Only insert if we resolved a project_id
  IF v_project_id IS NOT NULL THEN
    INSERT INTO public.embedding_jobs (project_id, source_table, source_id)
    VALUES (v_project_id, TG_TABLE_NAME, NEW.id)
    ON CONFLICT (source_table, source_id) DO UPDATE 
    SET status = 'pending', created_at = now();
  END IF;

  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;
