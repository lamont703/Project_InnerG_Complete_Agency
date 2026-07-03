-- Hybrid (semantic + full-text) ranking RPC for cosmetologists, mirroring
-- search_barbers_ranked's 80/20 alpha weighting.
CREATE OR REPLACE FUNCTION public.search_cosmetologists_ranked(
  query_text text,
  query_embedding vector(768) DEFAULT NULL,
  limit_val int DEFAULT 10,
  offset_val int DEFAULT 0
)
RETURNS TABLE (
  id uuid,
  name text,
  profile_url text,
  address text,
  metro_area text,
  booksy_photo_url text,
  booksy_gallery_urls jsonb,
  booksy_services jsonb,
  booksy_price_range text,
  booksy_rating numeric,
  booksy_review_count integer,
  match_score numeric,
  total_matched bigint
) AS $$
BEGIN
  RETURN QUERY
  WITH search_results AS (
    SELECT
      c.id,
      c.name,
      c.profile_url,
      c.address,
      c.metro_area,
      c.booksy_photo_url,
      c.booksy_gallery_urls,
      c.booksy_services,
      c.booksy_price_range,
      c.booksy_rating,
      c.booksy_review_count,
      c.embedding,
      to_tsvector('english',
        coalesce(c.name, '') || ' ' ||
        coalesce(c.metro_area, '') || ' ' ||
        coalesce((SELECT string_agg(s->>'name', ' ') FROM jsonb_array_elements(c.booksy_services) s), '')
      ) as search_vector,
      websearch_to_tsquery('english', query_text) as search_query,
      (CASE
        WHEN query_embedding IS NOT NULL AND c.embedding IS NOT NULL
        THEN (1 - (c.embedding <=> query_embedding))
        ELSE 0
      END) as semantic_similarity
    FROM agent_cosmetologist_leads c
  )
  SELECT
    s.id,
    s.name,
    s.profile_url,
    s.address,
    s.metro_area,
    s.booksy_photo_url,
    s.booksy_gallery_urls,
    s.booksy_services,
    s.booksy_price_range,
    s.booksy_rating,
    s.booksy_review_count,
    (
      -- 80% Weight to AI Semantic Score
      (CASE WHEN query_embedding IS NOT NULL THEN (s.semantic_similarity * 100 * 0.80) ELSE 0 END) +
      -- 20% Weight to Keyword Score
      (CASE WHEN query_text = '' THEN (50 * 0.20)
            ELSE COALESCE(ts_rank(s.search_vector, s.search_query) * 100 * 0.20, 0)
       END) +
      -- Rating / review-volume bonus
      (COALESCE(s.booksy_rating, 0) * 10) +
      LEAST((COALESCE(s.booksy_review_count, 0) / 5), 50)
    )::numeric AS match_score,
    count(*) OVER() as total_matched
  FROM search_results s
  -- Soft filter: Must score higher than 10 points (blocks pure garbage)
  WHERE (
    (CASE WHEN query_embedding IS NOT NULL THEN (s.semantic_similarity * 100 * 0.80) ELSE 0 END) +
    (CASE WHEN query_text = '' THEN 10 ELSE COALESCE(ts_rank(s.search_vector, s.search_query) * 100 * 0.20, 0) END)
  ) > 10
  ORDER BY match_score DESC
  LIMIT limit_val
  OFFSET offset_val;
END;
$$ LANGUAGE plpgsql;
