-- school_district_name (added to agent_barbershop_leads/salon/barber/
-- cosmetologist_leads by the census/school-district enrichment backfill)
-- was invisible to the AI chat's general search context — it only ever
-- reached the model through the single-shop ecosystem report, which
-- requires a shopId. Adding it to these four ranked-search RPCs lets the
-- model reference a shop/salon/barber/cosmetologist's district in ANY
-- chat answer, not just the "ask about my own shop" flow.
--
-- RETURNS TABLE can't be changed via CREATE OR REPLACE — Postgres requires
-- a DROP first when the output columns change (same pattern already used
-- in 20260706120000_add_pay_structure_to_barber_search.sql).

DROP FUNCTION IF EXISTS public.search_barbershops_ranked(text, boolean, text, int, int, vector(768));

CREATE FUNCTION public.search_barbershops_ranked(
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
  school_district_name text,
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
    s.school_district_name,
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


DROP FUNCTION IF EXISTS public.search_barbers_ranked(text, vector(768), int, int);

CREATE FUNCTION public.search_barbers_ranked(
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
  desired_pay_structure text,
  booksy_photo_url text,
  booksy_rating numeric,
  booksy_review_count integer,
  school_district_name text,
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
      b.desired_pay_structure,
      b.booksy_photo_url,
      b.booksy_rating,
      b.booksy_review_count,
      b.school_district_name,
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
    s.desired_pay_structure,
    s.booksy_photo_url,
    s.booksy_rating,
    s.booksy_review_count,
    s.school_district_name,
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


DROP FUNCTION IF EXISTS public.search_salons_ranked(text, vector(768), int, int);

CREATE FUNCTION public.search_salons_ranked(
  query_text text,
  query_embedding vector(768) DEFAULT NULL,
  limit_val int DEFAULT 10,
  offset_val int DEFAULT 0
)
RETURNS TABLE (
  id uuid,
  shop_name text,
  formatted_address text,
  city text,
  phone text,
  website text,
  rating numeric,
  total_reviews integer,
  google_images jsonb,
  place_types text,
  business_status text,
  school_district_name text,
  match_score numeric,
  total_matched bigint
) AS $$
BEGIN
  RETURN QUERY
  WITH search_results AS (
    SELECT
      s.id,
      s.shop_name,
      s.formatted_address,
      s.city,
      s.phone,
      s.website,
      s.rating,
      s.total_reviews,
      s.google_images,
      s.place_types,
      s.business_status,
      s.school_district_name,
      s.embedding,
      to_tsvector('english',
        COALESCE(s.shop_name, '') || ' ' ||
        COALESCE(s.city, '') || ' ' ||
        COALESCE(s.place_types, '')
      ) as search_vector,
      websearch_to_tsquery('english', query_text) as search_query,
      (CASE
        WHEN query_embedding IS NOT NULL AND s.embedding IS NOT NULL
        THEN (1 - (s.embedding <=> query_embedding))
        ELSE 0
      END) as semantic_similarity
    FROM agent_salon_leads s
    WHERE s.business_status IS NULL OR s.business_status != 'CLOSED_PERMANENTLY'
  )
  SELECT
    s.id,
    s.shop_name,
    s.formatted_address,
    s.city,
    s.phone,
    s.website,
    s.rating,
    s.total_reviews,
    s.google_images,
    s.place_types,
    s.business_status,
    s.school_district_name,
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


DROP FUNCTION IF EXISTS public.search_cosmetologists_ranked(text, vector(768), int, int);

CREATE FUNCTION public.search_cosmetologists_ranked(
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
  school_district_name text,
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
      c.school_district_name,
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
    s.school_district_name,
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


-- Direct aggregate, not a similarity search — "which school district has
-- the best barbershops" can't be answered from a top-3-per-category RAG
-- result, the same reasoning already applied to the 2026 exam leaderboards.
-- Requires at least 3 rated shops in a district so a single 5-star outlier
-- doesn't top the list.
CREATE OR REPLACE FUNCTION public.get_school_district_barbershop_rankings()
RETURNS TABLE (
  school_district_name text,
  shop_count bigint,
  avg_rating numeric,
  hiring_shop_count bigint
) AS $$
  SELECT
    school_district_name,
    count(*) AS shop_count,
    round(avg(rating), 2) AS avg_rating,
    count(*) FILTER (WHERE hiring_need = true) AS hiring_shop_count
  FROM agent_barbershop_leads
  WHERE school_district_name IS NOT NULL AND rating IS NOT NULL
  GROUP BY school_district_name
  HAVING count(*) >= 3
  ORDER BY avg(rating) DESC, count(*) DESC
  LIMIT 15;
$$ LANGUAGE sql STABLE;
