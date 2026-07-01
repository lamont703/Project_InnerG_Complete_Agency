CREATE OR REPLACE FUNCTION public.search_platform_tools_ranked(
  query_text text,
  query_embedding vector(768) DEFAULT NULL,
  limit_val int DEFAULT 5,
  offset_val int DEFAULT 0
)
RETURNS TABLE (
  id uuid,
  name text,
  description text,
  url text,
  image_url text,
  match_score numeric,
  total_matched bigint
) AS $$
BEGIN
  RETURN QUERY
  WITH search_results AS (
    SELECT 
      t.id,
      t.name,
      t.description,
      t.url,
      t.image_url,
      t.embedding,
      to_tsvector('english', coalesce(t.name, '') || ' ' || coalesce(t.description, '')) as search_vector,
      websearch_to_tsquery('english', query_text) as search_query,
      (CASE 
        WHEN query_embedding IS NOT NULL AND t.embedding IS NOT NULL 
        THEN (1 - (t.embedding <=> query_embedding))
        ELSE 0 
      END) as semantic_similarity
    FROM platform_tools t
  )
  SELECT 
    s.id,
    s.name,
    s.description,
    s.url,
    s.image_url,
    (
      -- Semantic Score
      (CASE WHEN query_embedding IS NOT NULL THEN (s.semantic_similarity * 100) ELSE 0 END) +
      -- Keyword Score
      (CASE WHEN query_text = '' THEN 50
            ELSE COALESCE(ts_rank(s.search_vector, s.search_query) * 100, 0)
       END)
    )::numeric AS match_score,
    count(*) OVER() as total_matched
  FROM search_results s
  WHERE 
    query_text = '' 
    OR s.search_vector @@ s.search_query
    OR (query_embedding IS NOT NULL AND s.semantic_similarity > 0.15)
  ORDER BY match_score DESC
  LIMIT limit_val
  OFFSET offset_val;
END;
$$ LANGUAGE plpgsql;
