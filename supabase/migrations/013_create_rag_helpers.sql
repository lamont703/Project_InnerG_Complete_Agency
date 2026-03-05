-- ============================================================
-- Migration 013: RAG Helper Functions
-- Inner G Complete Agency — Client Intelligence Portal
-- ============================================================

-- MATCH DOCUMENTS RPC
-- Used by AI Assistant to conduct semantic similarity search
-- across project-scoped data chunks.
CREATE OR REPLACE FUNCTION public.match_documents (
  query_embedding vector(1536),
  match_threshold float,
  match_count int,
  p_project_id uuid
)
RETURNS TABLE (
  id uuid,
  content_chunk text,
  source_table text,
  similarity float
)
LANGUAGE plpgsql
AS $$
BEGIN
  RETURN QUERY
  SELECT
    document_embeddings.id,
    document_embeddings.content_chunk,
    document_embeddings.source_table,
    1 - (document_embeddings.embedding <=> query_embedding) AS similarity
  FROM public.document_embeddings
  WHERE document_embeddings.project_id = p_project_id
    AND 1 - (document_embeddings.embedding <=> query_embedding) > match_threshold
  ORDER BY similarity DESC
  LIMIT match_count;
END;
$$;

-- Grant access to authenticated users
GRANT EXECUTE ON FUNCTION public.match_documents TO authenticated;
GRANT EXECUTE ON FUNCTION public.match_documents TO service_role;

COMMENT ON FUNCTION public.match_documents IS
  'Performs cosine similarity search on document_embeddings scoped to a specific project. Used by the Growth Assistant for RAG.';
