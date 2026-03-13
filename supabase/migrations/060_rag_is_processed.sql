
-- Migration 060: Enhance RAG with Processing Status
-- Joins with source tables to provide 'is_processed' status to the AI.

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
  similarity float,
  is_processed boolean
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
    1 - (d.embedding <=> query_embedding) AS similarity,
    COALESCE(ni.is_processed, false) AS is_processed
  FROM public.document_embeddings d
  LEFT JOIN public.news_intelligence ni ON d.source_table = 'news_intelligence' AND d.source_id = ni.id
  WHERE d.project_id = p_project_id
    AND 1 - (d.embedding <=> query_embedding) > match_threshold
  ORDER BY similarity DESC
  LIMIT match_count;
END;
$$;

DROP FUNCTION IF EXISTS public.match_documents_agency(vector(768), float, int);

CREATE OR REPLACE FUNCTION public.match_documents_agency(
  query_embedding vector(768),
  match_threshold float DEFAULT 0.5,
  match_count int DEFAULT 10
)
RETURNS TABLE (
  id uuid,
  project_id uuid,
  source_table text,
  source_id uuid,
  content_chunk text,
  similarity float,
  is_processed boolean
)
LANGUAGE sql STABLE
AS $$
  SELECT
    d.id,
    d.project_id,
    d.source_table,
    d.source_id,
    d.content_chunk,
    1 - (d.embedding <=> query_embedding) AS similarity,
    COALESCE(ni.is_processed, false) AS is_processed
  FROM document_embeddings d
  LEFT JOIN public.news_intelligence ni ON d.source_table = 'news_intelligence' AND d.source_id = ni.id
  WHERE 1 - (d.embedding <=> query_embedding) > match_threshold
  ORDER BY d.embedding <=> query_embedding
  LIMIT match_count;
$$;
