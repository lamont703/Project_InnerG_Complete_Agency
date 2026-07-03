-- Hybrid (semantic + full-text) ranking RPC for beauty supply stores,
-- an exact mirror of search_supply_stores_ranked (barber supply stores) but
-- pointed at agent_beauty_supply_store_leads so the two store types can be
-- queried independently and merged client-side under the same "Stores" tab.

CREATE OR REPLACE FUNCTION public.search_beauty_supply_stores_ranked(
  query_text text,
  query_embedding vector(768) DEFAULT NULL,
  limit_val int DEFAULT 10,
  offset_val int DEFAULT 0
)
RETURNS TABLE (
  id uuid,
  name text,
  formatted_address text,
  city text,
  phone text,
  website text,
  rating numeric,
  total_reviews integer,
  google_images jsonb,
  price_level text,
  match_score numeric,
  total_matched bigint
) AS $$
BEGIN
  RETURN QUERY
  WITH search_results AS (
    SELECT
      s.id,
      s.name,
      s.formatted_address,
      s.city,
      s.phone,
      s.website,
      s.rating,
      s.total_reviews,
      s.google_images,
      s.price_level,
      s.embedding,
      to_tsvector('english',
        COALESCE(s.name, '') || ' ' ||
        COALESCE(s.city, '') || ' ' ||
        COALESCE(s.place_types, '')
      ) as search_vector,
      websearch_to_tsquery('english', query_text) as search_query,
      (CASE
        WHEN query_embedding IS NOT NULL AND s.embedding IS NOT NULL
        THEN (1 - (s.embedding <=> query_embedding))
        ELSE 0
      END) as semantic_similarity
    FROM agent_beauty_supply_store_leads s
  )
  SELECT
    s.id,
    s.name,
    s.formatted_address,
    s.city,
    s.phone,
    s.website,
    s.rating,
    s.total_reviews,
    s.google_images,
    s.price_level,
    (
      -- 80% Weight to AI Semantic Score
      (CASE WHEN query_embedding IS NOT NULL THEN (s.semantic_similarity * 100 * 0.80) ELSE 0 END) +
      -- 20% Weight to Keyword Score
      (CASE WHEN query_text = '' THEN (50 * 0.20)
            ELSE COALESCE(ts_rank(s.search_vector, s.search_query) * 100 * 0.20, 0)
       END) +
      -- Rating / review-volume bonus
      (COALESCE(s.rating, 0) * 10) +
      LEAST((COALESCE(s.total_reviews, 0) / 5), 50)
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
