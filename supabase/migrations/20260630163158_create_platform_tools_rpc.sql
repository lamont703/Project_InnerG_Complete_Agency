CREATE OR REPLACE FUNCTION public.search_platform_tools_ranked(
  query_text text,
  query_embedding vector(768) DEFAULT NULL,
  limit_val int DEFAULT 5
)
RETURNS TABLE (
  id uuid,
  name text,
  url text,
  description text,
  match_score numeric
) AS $$
BEGIN
  RETURN QUERY
  WITH search_results AS (
    SELECT 
      t.id,
      t.name,
      t.url,
      t.description,
      t.embedding,
      to_tsvector('english', t.name || ' ' || t.description) as search_vector,
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
    s.url,
    s.description,
    (
      -- Semantic Score (Max ~100 points)
      (CASE WHEN query_embedding IS NOT NULL THEN (s.semantic_similarity * 100) ELSE 0 END) +
      -- Keyword Score (TS Rank)
      (CASE WHEN query_text = '' THEN 50
            ELSE COALESCE(ts_rank(s.search_vector, s.search_query) * 100, 0)
       END)
    )::numeric AS match_score
  FROM search_results s
  WHERE 
    query_text = '' 
    OR s.search_vector @@ s.search_query
    OR (query_embedding IS NOT NULL AND s.semantic_similarity > 0.45) -- High semantic match bypasses keyword check
  ORDER BY match_score DESC
  LIMIT limit_val;
END;
$$ LANGUAGE plpgsql;
