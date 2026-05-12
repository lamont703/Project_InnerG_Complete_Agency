
-- Migration 058: Normalize RAG RPC
-- Ensures match_documents returns all expected fields for the RagService.

DROP FUNCTION IF EXISTS public.match_documents(vector(768), float, int, uuid);

CREATE OR REPLACE FUNCTION public.match_documents (
  query_embedding vector(768),
  match_threshold float,
  match_count int,
  p_project_id uuid
)
RETURNS TABLE (
  id uuid,
  content text,
  source_table text,
  source_id uuid,
  similarity float
)
LANGUAGE plpgsql
AS $$
BEGIN
  RETURN QUERY
  SELECT
    d.id,
    d.content_chunk AS content,
    d.source_table,
    d.source_id,
    1 - (d.embedding <=> query_embedding) AS similarity
  FROM public.document_embeddings d
  WHERE d.project_id = p_project_id
    AND 1 - (d.embedding <=> query_embedding) > match_threshold
  ORDER BY similarity DESC
  LIMIT match_count;
END;
$$;

COMMENT ON FUNCTION public.match_documents IS 'RAG helper: vector search scoped by project. Returns content, source_table, source_id, and similarity.';
