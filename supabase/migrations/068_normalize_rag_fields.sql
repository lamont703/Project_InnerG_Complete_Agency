-- Migration 068: Normalize Agency RAG RPC
-- Ensures match_documents_agency returns the same 'content' field as match_documents.

DROP FUNCTION IF EXISTS public.match_documents_agency(vector(768), float, int);

CREATE OR REPLACE FUNCTION public.match_documents_agency(
  query_embedding vector(768),
  match_threshold float DEFAULT 0.3,
  match_count int DEFAULT 20
)
RETURNS TABLE (
  id uuid,
  project_id uuid,
  source_table text,
  source_id uuid,
  content text,
  similarity float
)
LANGUAGE plpgsql
AS $$
BEGIN
  RETURN QUERY
  SELECT
    d.id,
    d.project_id,
    d.source_table,
    d.source_id,
    d.content_chunk AS content,
    1 - (d.embedding <=> query_embedding) AS similarity
  FROM public.document_embeddings d
  WHERE 1 - (d.embedding <=> query_embedding) > match_threshold
  ORDER BY similarity DESC
  LIMIT match_count;
END;
$$;

GRANT EXECUTE ON FUNCTION public.match_documents_agency TO authenticated;
GRANT EXECUTE ON FUNCTION public.match_documents_agency TO service_role;
