CREATE OR REPLACE FUNCTION public.search_web_pages_ranked(
  query_text text,
  query_embedding vector(768) DEFAULT NULL,
  limit_val int DEFAULT 20,
  is_video_filter boolean DEFAULT NULL
)
RETURNS TABLE (
  id uuid,
  url text,
  raw_text text,
  domain_id uuid,
  og_image_url text,
  is_video boolean,
  domain_url text,
  match_score numeric
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
      w.embedding,
      d.domain_url,
      -- Truncate raw_text to 100,000 chars before converting to tsvector to prevent size limit crashes
      to_tsvector('english', left(COALESCE(w.raw_text, ''), 100000)) as search_vector,
      websearch_to_tsquery('english', query_text) as search_query,
      (CASE 
        WHEN query_embedding IS NOT NULL AND w.embedding IS NOT NULL 
        THEN (1 - (w.embedding <=> query_embedding))
        ELSE 0 
      END) as semantic_similarity
    FROM scraped_web_pages w
    LEFT JOIN crawler_seed_domains d ON w.domain_id = d.id
    WHERE is_video_filter IS NULL OR w.is_video = is_video_filter
  )
  SELECT 
    s.id,
    s.url,
    s.raw_text,
    s.domain_id,
    s.og_image_url,
    s.is_video,
    s.domain_url,
    (
      -- Semantic Score (Max ~100 points)
      (CASE WHEN query_embedding IS NOT NULL THEN (s.semantic_similarity * 100) ELSE 0 END) +
      -- Keyword Score (TS Rank)
      (CASE WHEN query_text = '' THEN 50
            ELSE COALESCE(ts_rank(s.search_vector, s.search_query) * 100, 0)
       END) +
      -- First-Party Domain Bonus (Massive override for owned properties)
      (CASE WHEN s.url ILIKE '%innergcomplete.com/insights%' THEN 500 ELSE 0 END)
    )::numeric AS match_score
  FROM search_results s
  WHERE 
    query_text = '' 
    OR s.search_vector @@ s.search_query
    OR (query_embedding IS NOT NULL AND s.semantic_similarity > 0.5)
  ORDER BY match_score DESC
  LIMIT limit_val;
END;
$$ LANGUAGE plpgsql;
