-- ============================================================
-- Migration 023: Fix GHL Embedding Queueing
-- Includes support for ghl_pipelines and ghl_pipeline_stages
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
      SELECT p.project_id INTO v_project_id
      FROM public.ghl_pipelines p
      WHERE p.id = NEW.pipeline_id;
    WHEN 'agency_knowledge' THEN
      -- Agency knowledge has no project_id — use a sentinel UUID or NULL
      v_project_id := '00000000-0000-0000-0000-000000000000'::UUID;
    ELSE
      -- Most tables have project_id directly (ghl_pipelines, ghl_opportunities, etc)
      v_project_id := NEW.project_id;
  END CASE;

  -- Only insert if we resolved a project_id
  IF v_project_id IS NOT NULL THEN
    INSERT INTO public.embedding_jobs (project_id, source_table, source_id)
    VALUES (v_project_id, TG_TABLE_NAME, NEW.id)
    ON CONFLICT (source_table, source_id) DO UPDATE
    SET status = 'pending', processed_at = NULL, error_message = NULL, created_at = now();
  END IF;

  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Ensure triggers exist for new tables
DROP TRIGGER IF EXISTS ghl_pipelines_queue_embedding ON public.ghl_pipelines;
CREATE TRIGGER ghl_pipelines_queue_embedding
  AFTER INSERT OR UPDATE ON public.ghl_pipelines
  FOR EACH ROW EXECUTE FUNCTION queue_embedding_job();

DROP TRIGGER IF EXISTS ghl_pipeline_stages_queue_embedding ON public.ghl_pipeline_stages;
CREATE TRIGGER ghl_pipeline_stages_queue_embedding
  AFTER INSERT OR UPDATE ON public.ghl_pipeline_stages
  FOR EACH ROW EXECUTE FUNCTION queue_embedding_job();
