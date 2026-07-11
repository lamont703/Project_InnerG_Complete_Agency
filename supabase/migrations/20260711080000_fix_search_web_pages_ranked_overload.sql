-- Same class of bug as 20260711050000's get_search_performance_by_entity
-- fix: 20260702160000 created search_web_pages_ranked(text, vector(768),
-- int, boolean, int) — 5 params, no is_image_filter. 20260707150000 later
-- added is_image_filter via CREATE OR REPLACE with a DIFFERENT signature
-- (6 params) instead of dropping the old one first, so both have
-- coexisted since. Any caller omitting is_image_filter — exactly how the
-- AI chat route's grounding call works — hits "Could not choose the best
-- candidate function" (confirmed live) and silently returns zero web
-- articles as context for every single chat response, degrading answer
-- quality without ever surfacing an error to the user (the caller treats
-- RPC failure as "no results", not a hard failure).
DROP FUNCTION IF EXISTS public.search_web_pages_ranked(text, vector(768), int, boolean, int);

CREATE OR REPLACE FUNCTION public.search_web_pages_ranked(
  query_text text,
  query_embedding vector(768) DEFAULT NULL,
  limit_val int DEFAULT 20,
  is_video_filter boolean DEFAULT NULL,
  offset_val int DEFAULT 0,
  is_image_filter boolean DEFAULT NULL
)
RETURNS TABLE (
  id uuid,
  url text,
  raw_text text,
  domain_id uuid,
  og_image_url text,
  is_video boolean,
  is_image boolean,
  domain_url text,
  match_score numeric,
  total_matched bigint
) AS $$
BEGIN
  RETURN QUERY
  WITH search_results AS (
    SELECT
      w.id,
      w.url,
      w.raw_text,
      w.domain_id,
      w.og_image_url,
      w.is_video,
      w.is_image,
      w.embedding,
      d.domain_url,
      to_tsvector('english', left(COALESCE(w.raw_text, ''), 100000)) as search_vector,
      websearch_to_tsquery('english', query_text) as search_query,
      (CASE
        WHEN query_embedding IS NOT NULL AND w.embedding IS NOT NULL
        THEN (1 - (w.embedding <=> query_embedding))
        ELSE 0
      END) as semantic_similarity
    FROM scraped_web_pages w
    INNER JOIN crawler_seed_domains d ON w.domain_id = d.id
    WHERE (is_video_filter IS NULL OR w.is_video = is_video_filter)
      AND (is_image_filter IS NULL OR w.is_image = is_image_filter)
      AND d.status = 'Active'
  )
  SELECT
    s.id,
    s.url,
    s.raw_text,
    s.domain_id,
    s.og_image_url,
    s.is_video,
    s.is_image,
    s.domain_url,
    (
      (CASE WHEN query_embedding IS NOT NULL THEN (s.semantic_similarity * 100 * 0.80) ELSE 0 END) +
      (CASE WHEN query_text = '' THEN (50 * 0.20)
            ELSE COALESCE(ts_rank(s.search_vector, s.search_query) * 100 * 0.20, 0)
       END)
    )::numeric AS match_score,
    count(*) OVER() as total_matched
  FROM search_results s
  WHERE (
    (CASE WHEN query_embedding IS NOT NULL THEN (s.semantic_similarity * 100 * 0.80) ELSE 0 END) +
    (CASE WHEN query_text = '' THEN 10 ELSE COALESCE(ts_rank(s.search_vector, s.search_query) * 100 * 0.20, 0) END)
  ) > 10
  ORDER BY match_score DESC
  LIMIT limit_val
  OFFSET offset_val;
END;
$$ LANGUAGE plpgsql;
