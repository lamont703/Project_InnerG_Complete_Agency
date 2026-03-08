-- ============================================================
-- Migration 018: Session Summaries Privacy + RLS
-- Inner G Complete Agency — Client Intelligence Portal
-- ============================================================
-- Adds RLS policies for session_summaries to enforce privacy:
-- users can only see their own session summaries.
-- Also adds a helper function for Layer 2 memory search.
-- ============================================================

-- ─────────────────────────────────────────────
-- RLS on session_summaries
-- ─────────────────────────────────────────────
ALTER TABLE public.session_summaries ENABLE ROW LEVEL SECURITY;

-- Users can only read their own session summaries
DROP POLICY IF EXISTS "Users read own session summaries" ON public.session_summaries;
CREATE POLICY "Users read own session summaries"
  ON public.session_summaries
  FOR SELECT
  USING (user_id = auth.uid());

-- Service role can do everything (for the batch job)
DROP POLICY IF EXISTS "Service role full access on session_summaries" ON public.session_summaries;
CREATE POLICY "Service role full access on session_summaries"
  ON public.session_summaries
  FOR ALL
  USING (auth.role() = 'service_role');

-- ─────────────────────────────────────────────
-- RPC: match_session_summaries
-- Layer 2 memory search — user-scoped
-- ─────────────────────────────────────────────
CREATE OR REPLACE FUNCTION public.match_session_summaries(
  query_embedding vector(1536),
  p_user_id uuid,
  p_project_id uuid,
  match_threshold float DEFAULT 0.5,
  match_count int DEFAULT 3
)
RETURNS TABLE (
  id uuid,
  session_id uuid,
  content_chunk text,
  similarity float
)
LANGUAGE sql STABLE
AS $$
  SELECT
    de.id,
    ss.session_id,
    de.content_chunk,
    1 - (de.embedding <=> query_embedding) AS similarity
  FROM public.document_embeddings de
  JOIN public.session_summaries ss
    ON ss.id = de.source_id
    AND de.source_table = 'session_summaries'
  WHERE ss.user_id = p_user_id
    AND ss.project_id = p_project_id
    AND 1 - (de.embedding <=> query_embedding) > match_threshold
  ORDER BY de.embedding <=> query_embedding
  LIMIT match_count;
$$;

COMMENT ON FUNCTION public.match_session_summaries IS
  'Layer 2 memory search: finds relevant past session summaries for a specific user + project, using vector similarity. Always scoped to the authenticated user for privacy.';
