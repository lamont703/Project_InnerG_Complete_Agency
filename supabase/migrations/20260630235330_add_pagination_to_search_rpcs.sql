-- 1. Add Offset to Barbers Search
CREATE OR REPLACE FUNCTION public.search_barbers_ranked(
  query_text text,
  query_embedding vector(768) DEFAULT NULL,
  limit_val int DEFAULT 10,
  offset_val int DEFAULT 0
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
  match_score numeric,
  total_matched bigint
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
    )::numeric AS match_score,
    count(*) OVER() as total_matched
  FROM search_results s
  WHERE 
    query_text = '' 
    OR s.search_vector @@ s.search_query
    OR (query_embedding IS NOT NULL AND s.semantic_similarity > 0.45)
  ORDER BY match_score DESC
  LIMIT limit_val
  OFFSET offset_val;
END;
$$ LANGUAGE plpgsql;

-- 2. Add Offset to Web Search
CREATE OR REPLACE FUNCTION public.search_web_pages_ranked(
  query_text text,
  query_embedding vector(768) DEFAULT NULL,
  limit_val int DEFAULT 20,
  is_video_filter boolean DEFAULT NULL,
  offset_val int DEFAULT 0
)
RETURNS TABLE (
  id uuid,
  url text,
  raw_text text,
  domain_id uuid,
  og_image_url text,
  is_video boolean,
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
    INNER JOIN crawler_seed_domains d ON w.domain_id = d.id
    WHERE (is_video_filter IS NULL OR w.is_video = is_video_filter)
      AND d.status = 'Active' -- CRITICAL FIX: Only show Active domains in search
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
    )::numeric AS match_score,
    count(*) OVER() as total_matched
  FROM search_results s
  WHERE 
    query_text = '' 
    OR s.search_vector @@ s.search_query
    OR (query_embedding IS NOT NULL AND s.semantic_similarity > 0.5)
  ORDER BY match_score DESC
  LIMIT limit_val
  OFFSET offset_val;
END;
$$ LANGUAGE plpgsql;

-- 3. Add Offset to Platform Tools
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
    WHERE t.is_active = true
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
    OR (query_embedding IS NOT NULL AND s.semantic_similarity > 0.4)
  ORDER BY match_score DESC
  LIMIT limit_val
  OFFSET offset_val;
END;
$$ LANGUAGE plpgsql;
