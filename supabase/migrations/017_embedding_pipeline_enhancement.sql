-- ============================================================
-- Migration 017: Embedding Pipeline Enhancement (Phase B)
-- Inner G Complete Agency — Client Intelligence Portal
-- ============================================================
-- • Make project_id nullable on document_embeddings + embedding_jobs
--   so agency_knowledge rows (no project scope) can be embedded.
-- • Add `embedding_strategy` column to embedding_jobs to distinguish
--   per-row vs. daily-summary granularity.
-- • Add integration_sync_log and system_connections triggers.
-- ============================================================

-- ─────────────────────────────────────────────
-- 1. Allow project_id = NULL for agency-scoped embeddings
-- ─────────────────────────────────────────────

-- document_embeddings: drop NOT NULL so agency_knowledge can embed without a project
ALTER TABLE public.document_embeddings
  ALTER COLUMN project_id DROP NOT NULL;

-- embedding_jobs: same change
ALTER TABLE public.embedding_jobs
  ALTER COLUMN project_id DROP NOT NULL;

-- Update the queue_embedding_job() function to use NULL instead of sentinel UUID
CREATE OR REPLACE FUNCTION queue_embedding_job()
RETURNS TRIGGER AS $$
DECLARE
  v_project_id UUID;
BEGIN
  -- Determine project_id based on the source table
  CASE TG_TABLE_NAME
    WHEN 'campaign_metrics' THEN
      SELECT project_id INTO v_project_id
      FROM public.campaigns WHERE id = NEW.campaign_id;
    WHEN 'funnel_events' THEN
      SELECT c.project_id INTO v_project_id
      FROM public.funnel_stages fs
      JOIN public.campaigns c ON c.id = fs.campaign_id
      WHERE fs.id = NEW.funnel_stage_id;
    WHEN 'agency_knowledge' THEN
      -- Agency knowledge has no project scope
      v_project_id := NULL;
    ELSE
      -- Most tables have project_id directly
      v_project_id := NEW.project_id;
  END CASE;

  INSERT INTO public.embedding_jobs (project_id, source_table, source_id)
  VALUES (v_project_id, TG_TABLE_NAME, NEW.id);

  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- ─────────────────────────────────────────────
-- 2. Add embedding_strategy column to embedding_jobs
-- ─────────────────────────────────────────────
-- 'per_row'       = embed each individual row immediately
-- 'daily_summary' = this job is part of a daily summary batch
ALTER TABLE public.embedding_jobs
  ADD COLUMN IF NOT EXISTS embedding_strategy TEXT NOT NULL DEFAULT 'per_row';

-- ─────────────────────────────────────────────
-- 3. Add remaining triggers for tables not yet covered
-- ─────────────────────────────────────────────

-- Integration Sync Log
DROP TRIGGER IF EXISTS integration_sync_log_queue_embedding ON public.integration_sync_log;
CREATE TRIGGER integration_sync_log_queue_embedding
  AFTER INSERT ON public.integration_sync_log
  FOR EACH ROW EXECUTE FUNCTION queue_embedding_job();

-- System Connections (on INSERT or UPDATE — status changes matter)
DROP TRIGGER IF EXISTS system_connections_queue_embedding ON public.system_connections;
CREATE TRIGGER system_connections_queue_embedding
  AFTER INSERT OR UPDATE ON public.system_connections
  FOR EACH ROW EXECUTE FUNCTION queue_embedding_job();

-- ─────────────────────────────────────────────
-- 4. Clean up sentinel UUID rows if any exist
-- ─────────────────────────────────────────────
UPDATE public.embedding_jobs
  SET project_id = NULL
  WHERE project_id = '00000000-0000-0000-0000-000000000000';

UPDATE public.document_embeddings
  SET project_id = NULL
  WHERE project_id = '00000000-0000-0000-0000-000000000000';

-- ─────────────────────────────────────────────
-- 5. Update match_documents_agency() to also match NULL project_id
-- ─────────────────────────────────────────────
CREATE OR REPLACE FUNCTION match_documents_agency(
  query_embedding vector(1536),
  match_threshold float DEFAULT 0.5,
  match_count int DEFAULT 10
)
RETURNS TABLE (
  id uuid,
  project_id uuid,
  source_table text,
  source_id uuid,
  content_chunk text,
  similarity float
)
LANGUAGE sql STABLE
AS $$
  SELECT
    d.id,
    d.project_id,
    d.source_table,
    d.source_id,
    d.content_chunk,
    1 - (d.embedding <=> query_embedding) AS similarity
  FROM document_embeddings d
  WHERE 1 - (d.embedding <=> query_embedding) > match_threshold
  ORDER BY d.embedding <=> query_embedding
  LIMIT match_count;
$$;

-- Grant execute to service_role (Edge Functions) and authenticated users
GRANT EXECUTE ON FUNCTION public.match_documents_agency TO authenticated;
GRANT EXECUTE ON FUNCTION public.match_documents_agency TO service_role;
