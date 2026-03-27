-- ============================================================
-- Migration 061: Strict Project Isolation & Shared Knowledge Peering
-- Inner G Complete Agency — Multi-tenant Security Enforcement
-- ============================================================

-- 1. Correct the main RAG search to include shared agency knowledge (NULL project)
-- and return the project_id to ensure the application handles silos correctly.
-- We ALSO exclude session_summaries from the generic pool because they require 
-- a strict user_id filter (handled by the specialized match_session_summaries RPC).
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
  is_processed boolean,
  project_id uuid
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
    COALESCE(ni.is_processed, false) AS is_processed,
    d.project_id
  FROM public.document_embeddings d
  LEFT JOIN public.news_intelligence ni ON d.source_table = 'news_intelligence' AND d.source_id = ni.id
  WHERE (d.project_id = p_project_id OR d.project_id IS NULL)
    AND d.source_table != 'session_summaries' -- Security: Exclude summaries from generic search
    AND 1 - (d.embedding <=> query_embedding) > match_threshold
  ORDER BY similarity DESC
  LIMIT match_count;
END;
$$;

-- 2. Add an explicit Access Control RPC for Edge Functions to verify tenancy.
-- This prevents users from "portal-hopping" by changing the project_id in chat requests.
CREATE OR REPLACE FUNCTION public.check_project_access(
  p_project_id uuid,
  p_user_id uuid
)
RETURNS boolean
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  v_role text;
  v_has_access boolean;
BEGIN
  -- 1. Check user role
  SELECT role INTO v_role FROM public.users WHERE id = p_user_id;
  
  -- 2. Super Admins have access to everything
  IF v_role = 'super_admin' THEN
    RETURN true;
  END IF;
  
  -- 3. Regular users must be in project_user_access
  SELECT EXISTS (
    SELECT 1 FROM public.project_user_access
    WHERE project_id = p_project_id AND user_id = p_user_id
  ) INTO v_has_access;
  
  RETURN v_has_access;
END;
$$;
