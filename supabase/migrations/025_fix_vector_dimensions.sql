-- ============================================================
-- Migration 025: Fix Vector Dimensions
-- Inner G Complete Agency — Client Intelligence Portal
-- ============================================================
-- Aligns pgvector dimensions with Gemini text-embedding-004 (768).
-- Previous models used 1536 (OpenAI spec), but we swapped to Gemini.
-- ============================================================

-- 1. Clear existing embeddings (they are incompatible with 768 dims)
TRUNCATE TABLE public.document_embeddings;

-- 2. Alter the embedding column to use 768 dimensions
ALTER TABLE public.document_embeddings 
  ALTER COLUMN embedding TYPE vector(768);

-- 3. Update match_documents RPC
CREATE OR REPLACE FUNCTION public.match_documents (
  query_embedding vector(768),
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

-- 4. Update match_documents_agency RPC
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

COMMENT ON FUNCTION public.match_documents IS
  'RAG helper: vector search scoped by project. Dimensions aligned with Gemini (768).';
COMMENT ON FUNCTION public.match_documents_agency IS
  'RAG helper: agency-wide vector search. Dimensions aligned with Gemini (768).';
