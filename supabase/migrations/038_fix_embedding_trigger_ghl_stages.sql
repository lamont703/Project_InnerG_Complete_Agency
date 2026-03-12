-- ============================================================
-- Migration 038: Fix Embedding Trigger for GHL Stages
-- Inner G Complete Agency — Client Intelligence Portal
-- ============================================================
-- Resolves "record 'new' has no field 'project_id'" by 
-- correctly joining parent tables for GHL stages.
-- ============================================================

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
    WHEN 'ghl_pipeline_stages' THEN
      SELECT project_id INTO v_project_id FROM public.ghl_pipelines WHERE id = NEW.pipeline_id;
    WHEN 'agency_knowledge' THEN
      -- Agency knowledge has no specific project scope
      v_project_id := NULL;
    WHEN 'github_commits' THEN
      SELECT project_id INTO v_project_id FROM public.github_repos WHERE id = NEW.repo_id;
    ELSE
      -- Most tables (ghl_social_posts, ghl_social_insights, ai_signals, ghl_opportunities, ghl_pipelines, github_repos, etc.)
      -- have project_id directly on the record.
      v_project_id := NEW.project_id;
  END CASE;

  -- Insert/Update the job in the queue
  INSERT INTO public.embedding_jobs (project_id, source_table, source_id)
  VALUES (v_project_id, TG_TABLE_NAME, NEW.id)
  ON CONFLICT (source_table, source_id) DO UPDATE
  SET status = 'pending', created_at = now();

  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;
