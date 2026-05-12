-- ============================================================
-- Migration 028: Fix Embedding Jobs Unique Constraint
-- Inner G Complete Agency — Client Intelligence Portal
-- ============================================================
-- Fixes "42P10" error: "there is no unique or exclusion constraint 
-- matching the ON CONFLICT specification" in queue_embedding_job().
-- ============================================================

-- 1. Remove any stray duplicates that would block the unique constraint
DELETE FROM public.embedding_jobs a
USING (
    SELECT MIN(id::text)::uuid as id, source_table, source_id
    FROM public.embedding_jobs
    GROUP BY source_table, source_id
    HAVING COUNT(*) > 1
) b
WHERE a.source_table = b.source_table 
  AND a.source_id = b.source_id 
  AND a.id <> b.id;

-- 2. Add the UNIQUE constraint (required for ON CONFLICT logic)
-- We use a UNIQUE INDEX for better performance and compatibility
DROP INDEX IF EXISTS public.idx_embedding_jobs_source_unique;
CREATE UNIQUE INDEX idx_embedding_jobs_source_unique 
  ON public.embedding_jobs (source_table, source_id);

-- 3. Update the trigger function to be more robust
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
      v_project_id := NULL;
    ELSE
      -- Most tables have project_id directly
      v_project_id := NEW.project_id;
  END CASE;

  -- Insert or Update the job in the queue
  IF v_project_id IS NOT NULL THEN
    INSERT INTO public.embedding_jobs (project_id, source_table, source_id, status)
    VALUES (v_project_id, TG_TABLE_NAME, NEW.id, 'pending')
    ON CONFLICT (source_table, source_id) DO UPDATE
    SET status = 'pending', 
        processed_at = NULL, 
        error_message = NULL, 
        created_at = now();
  END IF;

  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

COMMENT ON INDEX public.idx_embedding_jobs_source_unique IS 
  'Enforces one active embedding job per source row. Required for ON CONFLICT logic in queue_embedding_job().';
