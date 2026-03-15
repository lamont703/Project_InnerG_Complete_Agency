-- ============================================================
-- Migration 069: Multi-Tenant Isolation Helpers
-- Inner G Complete Agency — Client Intelligence Portal
-- ============================================================
-- 1. Fixes vector dimensions for session summary matching.
-- 2. Adds agency-wide (cross-project) RAG helpers.
-- ============================================================

-- 1. Update match_session_summaries to Gemini dimensions (768)
DROP FUNCTION IF EXISTS public.match_session_summaries(vector(1536), uuid, uuid, float, int);

CREATE OR REPLACE FUNCTION public.match_session_summaries(
  query_embedding vector(768),
  p_user_id uuid,
  p_project_id uuid,
  match_threshold float DEFAULT 0.45,
  match_count int DEFAULT 5
)
RETURNS TABLE (
  id uuid,
  session_id uuid,
  content_chunk text,
  similarity float,
  is_processed boolean
)
LANGUAGE sql STABLE
AS $$
  SELECT
    de.id,
    ss.session_id,
    de.content_chunk,
    1 - (de.embedding <=> query_embedding) AS similarity,
    TRUE as is_processed
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

-- 2. Create match_session_summaries_agency (Cross-project memory)
CREATE OR REPLACE FUNCTION public.match_session_summaries_agency(
  query_embedding vector(768),
  p_user_id uuid,
  match_threshold float DEFAULT 0.45,
  match_count int DEFAULT 10
)
RETURNS TABLE (
  id uuid,
  project_id uuid,
  session_id uuid,
  content_chunk text,
  similarity float
)
LANGUAGE sql STABLE
AS $$
  SELECT
    de.id,
    de.project_id,
    ss.session_id,
    de.content_chunk,
    1 - (de.embedding <=> query_embedding) AS similarity
  FROM public.document_embeddings de
  JOIN public.session_summaries ss
    ON ss.id = de.source_id
    AND de.source_table = 'session_summaries'
  WHERE ss.user_id = p_user_id
    AND 1 - (de.embedding <=> query_embedding) > match_threshold
  ORDER BY de.embedding <=> query_embedding
  LIMIT match_count;
$$;

-- Grant permissions
GRANT EXECUTE ON FUNCTION public.match_session_summaries_agency TO authenticated;
GRANT EXECUTE ON FUNCTION public.match_session_summaries_agency TO service_role;

COMMENT ON FUNCTION public.match_session_summaries_agency IS 'Agency-wide memory search: finds relevant past session summaries for a user across ALL their accessible projects.';
