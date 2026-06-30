CREATE OR REPLACE FUNCTION public.search_barbers_ranked(
  query_text text,
  query_embedding vector(768) DEFAULT NULL,
  limit_val int DEFAULT 10
)
RETURNS TABLE (
  id uuid,
  name text,
  profile_url text,
  passport_image_url text,
  specialty_type text,
  metro_area text,
  status text,
  is_actively_looking boolean,
  match_score numeric
) AS $$
BEGIN
  RETURN QUERY
  WITH search_results AS (
    SELECT 
      b.id,
      b.name,
      b.profile_url,
      b.passport_image_url,
      b.specialty_type,
      b.metro_area,
      b.status,
      b.is_actively_looking,
      b.email,
      b.embedding,
      to_tsvector('english', coalesce(b.name, '') || ' ' || coalesce(b.specialty_type, '') || ' ' || coalesce(b.metro_area, '')) as search_vector,
      websearch_to_tsquery('english', query_text) as search_query,
      (CASE 
        WHEN query_embedding IS NOT NULL AND b.embedding IS NOT NULL 
        THEN (1 - (b.embedding <=> query_embedding))
        ELSE 0 
      END) as semantic_similarity
    FROM agent_barber_leads b
  )
  SELECT 
    s.id,
    s.name,
    s.profile_url,
    s.passport_image_url,
    s.specialty_type,
    s.metro_area,
    s.status,
    s.is_actively_looking,
    (
      -- Semantic Score
      (CASE WHEN query_embedding IS NOT NULL THEN (s.semantic_similarity * 100) ELSE 0 END) +
      -- Keyword Score
      (CASE WHEN query_text = '' THEN 50
            ELSE COALESCE(ts_rank(s.search_vector, s.search_query) * 100, 0)
       END) +
      -- Engagement Score Modifiers
      (CASE WHEN s.status = 'interested_in_placement' AND s.is_actively_looking = true THEN 15 ELSE 0 END) +
      (CASE WHEN s.email IS NOT NULL AND trim(s.email) != '' THEN 10 ELSE 0 END)
    )::numeric AS match_score
  FROM search_results s
  WHERE 
    query_text = '' 
    OR s.search_vector @@ s.search_query
    OR (query_embedding IS NOT NULL AND s.semantic_similarity > 0.45)
  ORDER BY match_score DESC
  LIMIT limit_val;
END;
$$ LANGUAGE plpgsql;
