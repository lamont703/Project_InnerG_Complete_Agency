-- 1. Alpha Weighting for Barbers Search
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
      -- 80% Weight to AI Semantic Score
      (CASE WHEN query_embedding IS NOT NULL THEN (s.semantic_similarity * 100 * 0.80) ELSE 0 END) +
      -- 20% Weight to Keyword Score
      (CASE WHEN query_text = '' THEN (50 * 0.20)
            ELSE COALESCE(ts_rank(s.search_vector, s.search_query) * 100 * 0.20, 0)
       END) +
      -- Engagement Score Modifiers (Fixed Points)
      (CASE WHEN s.status = 'interested_in_placement' AND s.is_actively_looking = true THEN 15 ELSE 0 END) +
      (CASE WHEN s.email IS NOT NULL AND trim(s.email) != '' THEN 10 ELSE 0 END)
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

-- 2. Alpha Weighting for Web Search Results
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
      AND d.status = 'Active'
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
      -- 80% Weight to AI Semantic Score
      (CASE WHEN query_embedding IS NOT NULL THEN (s.semantic_similarity * 100 * 0.80) ELSE 0 END) +
      -- 20% Weight to Keyword Score
      (CASE WHEN query_text = '' THEN (50 * 0.20)
            ELSE COALESCE(ts_rank(s.search_vector, s.search_query) * 100 * 0.20, 0)
       END) +
      -- First-Party Domain Bonus
      (CASE WHEN s.url ILIKE '%innergcomplete.com/insights%' THEN 500 ELSE 0 END)
    )::numeric AS match_score,
    count(*) OVER() as total_matched
  FROM search_results s
  -- Soft filter: Must score higher than 10 points
  WHERE (
    (CASE WHEN query_embedding IS NOT NULL THEN (s.semantic_similarity * 100 * 0.80) ELSE 0 END) +
    (CASE WHEN query_text = '' THEN 10 ELSE COALESCE(ts_rank(s.search_vector, s.search_query) * 100 * 0.20, 0) END)
  ) > 10
  ORDER BY match_score DESC
  LIMIT limit_val
  OFFSET offset_val;
END;
$$ LANGUAGE plpgsql;

-- 3. Alpha Weighting for Platform Tools
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
      -- 80% Weight to AI Semantic Score
      (CASE WHEN query_embedding IS NOT NULL THEN (s.semantic_similarity * 100 * 0.80) ELSE 0 END) +
      -- 20% Weight to Keyword Score
      (CASE WHEN query_text = '' THEN (50 * 0.20)
            ELSE COALESCE(ts_rank(s.search_vector, s.search_query) * 100 * 0.20, 0)
       END)
    )::numeric AS match_score,
    count(*) OVER() as total_matched
  FROM search_results s
  -- Soft filter: Must score higher than 10 points
  WHERE (
    (CASE WHEN query_embedding IS NOT NULL THEN (s.semantic_similarity * 100 * 0.80) ELSE 0 END) +
    (CASE WHEN query_text = '' THEN 10 ELSE COALESCE(ts_rank(s.search_vector, s.search_query) * 100 * 0.20, 0) END)
  ) > 10
  ORDER BY match_score DESC
  LIMIT limit_val
  OFFSET offset_val;
END;
$$ LANGUAGE plpgsql;

-- 4. Alpha Weighting for Barbershops
CREATE OR REPLACE FUNCTION public.search_barbershops_ranked(
  query_text text,
  is_hiring_filter boolean,
  rent_type_filter text,
  limit_val int,
  offset_val int,
  query_embedding vector(768) DEFAULT NULL
)
RETURNS TABLE (
  id uuid,
  shop_name text,
  city text,
  formatted_address text,
  phone text,
  hiring_need boolean,
  booth_count_available integer,
  rent_type text,
  rent_rate text,
  ai_culture_summary text,
  rating numeric,
  total_reviews integer,
  opportunity_status text,
  google_images jsonb,
  trust_score numeric,
  total_matched bigint
) AS $$
BEGIN
  RETURN QUERY
  WITH search_results AS (
    SELECT 
      a.*,
      to_tsvector('english', 
        COALESCE(a.shop_name, '') || ' ' || 
        COALESCE(a.city, '') || ' ' || 
        COALESCE(a.ai_culture_summary, '') || ' ' || 
        COALESCE(a.opportunity_status, '') || ' ' || 
        COALESCE(a.rent_type, '')
      ) as search_vector,
      websearch_to_tsquery('english', query_text) as search_query,
      (CASE 
        WHEN query_embedding IS NOT NULL AND a.embedding IS NOT NULL 
        THEN (1 - (a.embedding <=> query_embedding))
        ELSE 0 
      END) as semantic_similarity
    FROM agent_barbershop_leads a
  )
  SELECT 
    s.id,
    s.shop_name,
    s.city,
    s.formatted_address,
    s.phone,
    s.hiring_need,
    s.booth_count_available,
    s.rent_type,
    s.rent_rate,
    s.ai_culture_summary,
    s.rating,
    s.total_reviews,
    s.opportunity_status,
    s.google_images,
    (
      -- 80% Weight to AI Semantic Score (Scaled to max 200 originally, so 200 * 0.8 = 160 max base)
      (CASE WHEN query_embedding IS NOT NULL THEN (s.semantic_similarity * 200 * 0.80) ELSE 0 END) +
      -- 20% Weight to Keyword Score
      (CASE WHEN query_text = '' THEN (100 * 0.20)
            ELSE COALESCE(ts_rank(s.search_vector, s.search_query) * 100 * 0.20, 0)
       END) +
      -- Fixed Multipliers
      (CASE WHEN s.hiring_need = true THEN 500 ELSE 0 END) +
      (CASE WHEN s.conversation_turns IS NOT NULL OR s.last_conversation_history IS NOT NULL THEN 400 ELSE 0 END) +
      (CASE WHEN s.email IS NOT NULL AND s.email != '' THEN 100 ELSE 0 END) +
      (CASE WHEN s.ai_culture_summary IS NOT NULL AND s.ai_culture_summary != '' THEN 200 ELSE 0 END) +
      (COALESCE(s.rating, 0) * 10) +
      LEAST((COALESCE(s.total_reviews, 0) / 5), 50)
    )::numeric AS trust_score,
    count(*) OVER() AS total_matched
  FROM search_results s
  WHERE 
    (is_hiring_filter = false OR (s.hiring_need = true AND s.booth_count_available > 0))
    AND (rent_type_filter = '' OR rent_type_filter IS NULL OR s.rent_type = rent_type_filter)
    -- Soft Filter: Must score higher than 10 base points
    AND (
      (CASE WHEN query_embedding IS NOT NULL THEN (s.semantic_similarity * 200 * 0.80) ELSE 0 END) +
      (CASE WHEN query_text = '' THEN 20 ELSE COALESCE(ts_rank(s.search_vector, s.search_query) * 100 * 0.20, 0) END)
    ) > 10
  ORDER BY trust_score DESC
  LIMIT limit_val OFFSET offset_val;
END;
$$ LANGUAGE plpgsql;
