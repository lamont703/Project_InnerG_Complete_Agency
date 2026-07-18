-- Production is currently hitting Gemini's embed_content free-tier quota
-- (confirmed live: "429 Quota exceeded for metric:
-- generativelanguage.googleapis.com/embed_content_free_tier_requests" on
-- nearly every real search request), which makes actions.ts's
-- searchBarbershops() fall back to query_embedding: null (it already
-- catches the embedding failure and degrades gracefully — see actions.ts).
--
-- But 7 of the 8 ranked-search RPCs couldn't actually degrade gracefully:
-- their relevance-threshold WHERE clause only has two terms — semantic
-- similarity (0 when embedding is null) and ts_rank()*100*0.20 — and
-- requires the sum > 10. With embedding null, that means ts_rank() alone
-- must exceed 0.5, which real full-text keyword matches almost never
-- reach on their own (Postgres ts_rank rarely gets past ~0.1-0.3 for a
-- typical single/two-term match). So whenever the embedding call fails,
-- these RPCs return zero rows for completely real, obvious matches (e.g.
-- searching "barbershop" returned "No results found" in production despite
-- hundreds of real matching shops) — reproduced live against production.
--
-- search_events_ranked (the 8th) already had the right fix: a token_matches
-- count (simple substring match against the same columns already used in
-- its to_tsvector) plus an explicit `OR (query_embedding IS NULL AND
-- token_matches > 0)` escape hatch in the WHERE clause. This migration
-- ports that exact pattern to the other 7 — same idiom, same threshold
-- logic, just the column set changed per table to match what each
-- function's own to_tsvector call already indexes.
--
-- This is a correctness fix independent of the Gemini billing/quota
-- situation — any embedding-API hiccup (quota, timeout, outage) should
-- degrade search to keyword-only, not zero it out entirely.

-- 1. search_barbershops_ranked
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
  slug text,
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
  base_relevance numeric,
  quality_bonus numeric,
  hiring_bonus numeric,
  total_matched bigint
) AS $$
BEGIN
  RETURN QUERY
  WITH query_tokens AS (
    SELECT unnest(string_to_array(lower(trim(query_text)), ' ')) AS token
  ),
  search_results AS (
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
      END) as semantic_similarity,
      (SELECT count(*) FROM query_tokens qt
        WHERE length(qt.token) >= 3 AND (
          lower(COALESCE(a.shop_name, '')) LIKE '%' || qt.token || '%' OR
          lower(COALESCE(a.city, '')) LIKE '%' || qt.token || '%' OR
          lower(COALESCE(a.ai_culture_summary, '')) LIKE '%' || qt.token || '%' OR
          lower(COALESCE(a.opportunity_status, '')) LIKE '%' || qt.token || '%' OR
          lower(COALESCE(a.rent_type, '')) LIKE '%' || qt.token || '%'
        )
      ) AS token_matches
    FROM agent_barbershop_leads a
  )
  SELECT
    s.id,
    s.slug,
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
      (CASE WHEN query_embedding IS NOT NULL THEN (s.semantic_similarity * 200 * 0.80) ELSE 0 END) +
      (CASE WHEN query_text = '' THEN (100 * 0.20)
            ELSE COALESCE(ts_rank(s.search_vector, s.search_query) * 100 * 0.20, 0)
       END) +
      (CASE WHEN s.hiring_need = true THEN 500 ELSE 0 END) +
      (CASE WHEN s.conversation_turns IS NOT NULL OR s.last_conversation_history IS NOT NULL THEN 400 ELSE 0 END) +
      (CASE WHEN s.email IS NOT NULL AND s.email != '' THEN 100 ELSE 0 END) +
      (CASE WHEN s.ai_culture_summary IS NOT NULL AND s.ai_culture_summary != '' THEN 200 ELSE 0 END) +
      (COALESCE(s.rating, 0) * 10) +
      LEAST((COALESCE(s.total_reviews, 0) / 5), 50)
    )::numeric AS trust_score,
    (
      (CASE WHEN query_embedding IS NOT NULL THEN (s.semantic_similarity * 100 * 0.80) ELSE 0 END) +
      (CASE WHEN query_text = '' THEN (100 * 0.20)
            ELSE COALESCE(ts_rank(s.search_vector, s.search_query) * 100 * 0.20, 0)
       END)
    )::numeric AS base_relevance,
    LEAST(
      (CASE WHEN s.claimed_at IS NOT NULL THEN 0.10 ELSE 0 END) +
      (CASE WHEN s.conversation_turns IS NOT NULL OR s.last_conversation_history IS NOT NULL THEN 0.08 ELSE 0 END) +
      (CASE WHEN s.email IS NOT NULL AND s.email != '' THEN 0.04 ELSE 0 END) +
      (CASE WHEN s.ai_culture_summary IS NOT NULL AND s.ai_culture_summary != '' THEN 0.06 ELSE 0 END) +
      (COALESCE(s.rating, 0) / 5 * 0.08) +
      (LEAST(COALESCE(s.total_reviews, 0), 250)::numeric / 250 * 0.08),
      0.40
    )::numeric AS quality_bonus,
    (CASE WHEN s.hiring_need = true THEN 0.35 ELSE 0 END)::numeric AS hiring_bonus,
    count(*) OVER() AS total_matched
  FROM search_results s
  WHERE
    (is_hiring_filter = false OR (s.hiring_need = true AND s.booth_count_available > 0))
    AND (rent_type_filter = '' OR rent_type_filter IS NULL OR s.rent_type = rent_type_filter)
    AND (
      query_text = ''
      OR (
        (CASE WHEN query_embedding IS NOT NULL THEN (s.semantic_similarity * 200 * 0.80) ELSE 0 END) +
        COALESCE(ts_rank(s.search_vector, s.search_query) * 100 * 0.20, 0)
      ) > 10
      OR (query_embedding IS NULL AND s.token_matches > 0)
    )
  ORDER BY trust_score DESC
  LIMIT limit_val OFFSET offset_val;
END;
$$ LANGUAGE plpgsql;


-- 2. search_barbers_ranked
DROP FUNCTION IF EXISTS public.search_barbers_ranked(text, vector(768), int, int);

CREATE FUNCTION public.search_barbers_ranked(
  query_text text,
  query_embedding vector(768) DEFAULT NULL,
  limit_val int DEFAULT 10,
  offset_val int DEFAULT 0
)
RETURNS TABLE (
  id uuid,
  slug text,
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
  base_relevance numeric,
  quality_bonus numeric,
  total_matched bigint
) AS $$
BEGIN
  RETURN QUERY
  WITH query_tokens AS (
    SELECT unnest(string_to_array(lower(trim(query_text)), ' ')) AS token
  ),
  search_results AS (
    SELECT
      b.id,
      b.slug,
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
      END) as semantic_similarity,
      (SELECT count(*) FROM query_tokens qt
        WHERE length(qt.token) >= 3 AND (
          lower(COALESCE(b.name, '')) LIKE '%' || qt.token || '%' OR
          lower(COALESCE(b.specialty_type, '')) LIKE '%' || qt.token || '%' OR
          lower(COALESCE(b.metro_area, '')) LIKE '%' || qt.token || '%'
        )
      ) AS token_matches
    FROM agent_barber_leads b
  )
  SELECT
    s.id,
    s.slug,
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
      (CASE WHEN query_embedding IS NOT NULL THEN (s.semantic_similarity * 100 * 0.80) ELSE 0 END) +
      (CASE WHEN query_text = '' THEN (50 * 0.20)
            ELSE COALESCE(ts_rank(s.search_vector, s.search_query) * 100 * 0.20, 0)
       END) +
      (CASE WHEN s.status = 'interested_in_placement' AND s.is_actively_looking = true THEN 15 ELSE 0 END) +
      (CASE WHEN s.email IS NOT NULL AND trim(s.email) != '' THEN 10 ELSE 0 END)
    )::numeric AS match_score,
    (
      (CASE WHEN query_embedding IS NOT NULL THEN (s.semantic_similarity * 100 * 0.80) ELSE 0 END) +
      (CASE WHEN query_text = '' THEN (50 * 0.20)
            ELSE COALESCE(ts_rank(s.search_vector, s.search_query) * 100 * 0.20, 0)
       END)
    )::numeric AS base_relevance,
    LEAST(
      (CASE WHEN s.status = 'interested_in_placement' AND s.is_actively_looking = true THEN 0.15 ELSE 0 END) +
      (CASE WHEN s.email IS NOT NULL AND trim(s.email) != '' THEN 0.05 ELSE 0 END) +
      (COALESCE(s.booksy_rating, 0) / 5 * 0.10) +
      (LEAST(COALESCE(s.booksy_review_count, 0), 250)::numeric / 250 * 0.10),
      0.40
    )::numeric AS quality_bonus,
    count(*) OVER() as total_matched
  FROM search_results s
  WHERE query_text = ''
     OR (
       (CASE WHEN query_embedding IS NOT NULL THEN (s.semantic_similarity * 100 * 0.80) ELSE 0 END) +
       COALESCE(ts_rank(s.search_vector, s.search_query) * 100 * 0.20, 0)
     ) > 10
     OR (query_embedding IS NULL AND s.token_matches > 0)
  ORDER BY match_score DESC
  LIMIT limit_val
  OFFSET offset_val;
END;
$$ LANGUAGE plpgsql;


-- 3. search_salons_ranked
DROP FUNCTION IF EXISTS public.search_salons_ranked(text, vector(768), int, int);

CREATE FUNCTION public.search_salons_ranked(
  query_text text,
  query_embedding vector(768) DEFAULT NULL,
  limit_val int DEFAULT 10,
  offset_val int DEFAULT 0
)
RETURNS TABLE (
  id uuid,
  slug text,
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
  base_relevance numeric,
  quality_bonus numeric,
  total_matched bigint
) AS $$
BEGIN
  RETURN QUERY
  WITH query_tokens AS (
    SELECT unnest(string_to_array(lower(trim(query_text)), ' ')) AS token
  ),
  search_results AS (
    SELECT
      s.id,
      s.slug,
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
      END) as semantic_similarity,
      (SELECT count(*) FROM query_tokens qt
        WHERE length(qt.token) >= 3 AND (
          lower(COALESCE(s.shop_name, '')) LIKE '%' || qt.token || '%' OR
          lower(COALESCE(s.city, '')) LIKE '%' || qt.token || '%' OR
          lower(COALESCE(s.place_types, '')) LIKE '%' || qt.token || '%'
        )
      ) AS token_matches
    FROM agent_salon_leads s
    WHERE s.business_status IS NULL OR s.business_status != 'CLOSED_PERMANENTLY'
  )
  SELECT
    s.id,
    s.slug,
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
      (CASE WHEN query_embedding IS NOT NULL THEN (s.semantic_similarity * 100 * 0.80) ELSE 0 END) +
      (CASE WHEN query_text = '' THEN (50 * 0.20)
            ELSE COALESCE(ts_rank(s.search_vector, s.search_query) * 100 * 0.20, 0)
       END) +
      (COALESCE(s.rating, 0) * 10) +
      LEAST((COALESCE(s.total_reviews, 0) / 5), 50)
    )::numeric AS match_score,
    (
      (CASE WHEN query_embedding IS NOT NULL THEN (s.semantic_similarity * 100 * 0.80) ELSE 0 END) +
      (CASE WHEN query_text = '' THEN (50 * 0.20)
            ELSE COALESCE(ts_rank(s.search_vector, s.search_query) * 100 * 0.20, 0)
       END)
    )::numeric AS base_relevance,
    LEAST(
      (COALESCE(s.rating, 0) / 5 * 0.20) +
      (LEAST(COALESCE(s.total_reviews, 0), 250)::numeric / 250 * 0.20),
      0.40
    )::numeric AS quality_bonus,
    count(*) OVER() as total_matched
  FROM search_results s
  WHERE query_text = ''
     OR (
       (CASE WHEN query_embedding IS NOT NULL THEN (s.semantic_similarity * 100 * 0.80) ELSE 0 END) +
       COALESCE(ts_rank(s.search_vector, s.search_query) * 100 * 0.20, 0)
     ) > 10
     OR (query_embedding IS NULL AND s.token_matches > 0)
  ORDER BY match_score DESC
  LIMIT limit_val
  OFFSET offset_val;
END;
$$ LANGUAGE plpgsql;


-- 4. search_cosmetologists_ranked
DROP FUNCTION IF EXISTS public.search_cosmetologists_ranked(text, vector(768), int, int);

CREATE FUNCTION public.search_cosmetologists_ranked(
  query_text text,
  query_embedding vector(768) DEFAULT NULL,
  limit_val int DEFAULT 10,
  offset_val int DEFAULT 0
)
RETURNS TABLE (
  id uuid,
  slug text,
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
  base_relevance numeric,
  quality_bonus numeric,
  total_matched bigint
) AS $$
BEGIN
  RETURN QUERY
  WITH query_tokens AS (
    SELECT unnest(string_to_array(lower(trim(query_text)), ' ')) AS token
  ),
  search_results AS (
    SELECT
      c.id,
      c.slug,
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
      END) as semantic_similarity,
      (SELECT count(*) FROM query_tokens qt
        WHERE length(qt.token) >= 3 AND (
          lower(COALESCE(c.name, '')) LIKE '%' || qt.token || '%' OR
          lower(COALESCE(c.metro_area, '')) LIKE '%' || qt.token || '%' OR
          lower(COALESCE((SELECT string_agg(s->>'name', ' ') FROM jsonb_array_elements(c.booksy_services) s), '')) LIKE '%' || qt.token || '%'
        )
      ) AS token_matches
    FROM agent_cosmetologist_leads c
  )
  SELECT
    s.id,
    s.slug,
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
      (CASE WHEN query_embedding IS NOT NULL THEN (s.semantic_similarity * 100 * 0.80) ELSE 0 END) +
      (CASE WHEN query_text = '' THEN (50 * 0.20)
            ELSE COALESCE(ts_rank(s.search_vector, s.search_query) * 100 * 0.20, 0)
       END) +
      (COALESCE(s.booksy_rating, 0) * 10) +
      LEAST((COALESCE(s.booksy_review_count, 0) / 5), 50)
    )::numeric AS match_score,
    (
      (CASE WHEN query_embedding IS NOT NULL THEN (s.semantic_similarity * 100 * 0.80) ELSE 0 END) +
      (CASE WHEN query_text = '' THEN (50 * 0.20)
            ELSE COALESCE(ts_rank(s.search_vector, s.search_query) * 100 * 0.20, 0)
       END)
    )::numeric AS base_relevance,
    LEAST(
      (COALESCE(s.booksy_rating, 0) / 5 * 0.20) +
      (LEAST(COALESCE(s.booksy_review_count, 0), 250)::numeric / 250 * 0.20),
      0.40
    )::numeric AS quality_bonus,
    count(*) OVER() as total_matched
  FROM search_results s
  WHERE query_text = ''
     OR (
       (CASE WHEN query_embedding IS NOT NULL THEN (s.semantic_similarity * 100 * 0.80) ELSE 0 END) +
       COALESCE(ts_rank(s.search_vector, s.search_query) * 100 * 0.20, 0)
     ) > 10
     OR (query_embedding IS NULL AND s.token_matches > 0)
  ORDER BY match_score DESC
  LIMIT limit_val
  OFFSET offset_val;
END;
$$ LANGUAGE plpgsql;


-- 5. search_schools_ranked
DROP FUNCTION IF EXISTS public.search_schools_ranked(text, vector(768), int, int);

CREATE FUNCTION public.search_schools_ranked(
  query_text text,
  query_embedding vector(768) DEFAULT NULL,
  limit_val int DEFAULT 10,
  offset_val int DEFAULT 0
)
RETURNS TABLE (
  id uuid,
  slug text,
  school_name text,
  school_category text,
  city text,
  formatted_address text,
  phone text,
  website text,
  rating text,
  google_review_count integer,
  google_photos jsonb,
  accreditation_status text,
  accreditor_name text,
  annual_tuition numeric,
  completion_rate numeric,
  state_pass_rate text,
  written_pass_rate_2026 numeric,
  written_test_takers_2026 integer,
  practical_pass_rate_2026 numeric,
  practical_test_takers_2026 integer,
  pell_grant_rate numeric,
  federal_loan_rate numeric,
  match_score numeric,
  base_relevance numeric,
  quality_bonus numeric,
  total_matched bigint
) AS $$
BEGIN
  RETURN QUERY
  WITH query_tokens AS (
    SELECT unnest(string_to_array(lower(trim(query_text)), ' ')) AS token
  ),
  combined AS (
    SELECT
      b.id, b.slug, b.school_name, 'Barber School'::text as school_category, b.city, b.formatted_address,
      b.phone, b.website, b.rating, b.google_review_count, b.google_photos,
      b.accreditation_status, b.accreditor_name, b.annual_tuition, b.completion_rate,
      b.state_pass_rate, b.written_pass_rate_2026, b.written_test_takers_2026,
      b.practical_pass_rate_2026, b.practical_test_takers_2026,
      b.pell_grant_rate, b.federal_loan_rate, b.embedding
    FROM agent_barber_school_leads b
    WHERE b.google_business_status IS NULL OR b.google_business_status != 'CLOSED_PERMANENTLY'
    UNION ALL
    SELECT
      c.id, c.slug, c.school_name, COALESCE(c.license_type, 'Cosmetology School')::text as school_category, c.city, c.formatted_address,
      c.phone, c.website, c.rating, c.google_review_count, c.google_photos,
      c.accreditation_status, c.accreditor_name, c.annual_tuition, c.completion_rate,
      c.state_pass_rate, c.written_pass_rate_2026, c.written_test_takers_2026,
      c.practical_pass_rate_2026, c.practical_test_takers_2026,
      c.pell_grant_rate, c.federal_loan_rate, c.embedding
    FROM agent_cosmetology_school_leads c
    WHERE c.google_business_status IS NULL OR c.google_business_status != 'CLOSED_PERMANENTLY'
  ),
  search_results AS (
    SELECT
      cm.*,
      to_tsvector('english',
        coalesce(cm.school_name, '') || ' ' ||
        coalesce(cm.city, '') || ' ' ||
        coalesce(cm.school_category, '') || ' ' ||
        coalesce(cm.accreditation_status, '') || ' ' ||
        coalesce(cm.accreditor_name, '')
      ) as search_vector,
      websearch_to_tsquery('english', query_text) as search_query,
      (CASE
        WHEN query_embedding IS NOT NULL AND cm.embedding IS NOT NULL
        THEN (1 - (cm.embedding <=> query_embedding))
        ELSE 0
      END) as semantic_similarity,
      (SELECT count(*) FROM query_tokens qt
        WHERE length(qt.token) >= 3 AND (
          lower(COALESCE(cm.school_name, '')) LIKE '%' || qt.token || '%' OR
          lower(COALESCE(cm.city, '')) LIKE '%' || qt.token || '%' OR
          lower(COALESCE(cm.school_category, '')) LIKE '%' || qt.token || '%' OR
          lower(COALESCE(cm.accreditation_status, '')) LIKE '%' || qt.token || '%' OR
          lower(COALESCE(cm.accreditor_name, '')) LIKE '%' || qt.token || '%'
        )
      ) AS token_matches
    FROM combined cm
  )
  SELECT
    r.id,
    r.slug,
    r.school_name,
    r.school_category,
    r.city,
    r.formatted_address,
    r.phone,
    r.website,
    r.rating,
    r.google_review_count,
    r.google_photos,
    r.accreditation_status,
    r.accreditor_name,
    r.annual_tuition,
    r.completion_rate,
    r.state_pass_rate,
    r.written_pass_rate_2026,
    r.written_test_takers_2026,
    r.practical_pass_rate_2026,
    r.practical_test_takers_2026,
    r.pell_grant_rate,
    r.federal_loan_rate,
    (
      (CASE WHEN query_embedding IS NOT NULL THEN (r.semantic_similarity * 100 * 0.80) ELSE 0 END) +
      (CASE WHEN query_text = '' THEN (50 * 0.20)
            ELSE COALESCE(ts_rank(r.search_vector, r.search_query) * 100 * 0.20, 0)
       END) +
      (CASE WHEN r.accreditation_status IN ('Accredited', 'State Licensed') THEN 15 ELSE 0 END) +
      (CASE WHEN r.state_pass_rate IS NOT NULL THEN 10 ELSE 0 END) +
      (CASE WHEN r.written_pass_rate_2026 IS NOT NULL OR r.practical_pass_rate_2026 IS NOT NULL
            THEN (COALESCE(r.written_pass_rate_2026, r.practical_pass_rate_2026) * 15)
            ELSE 0
       END)
    )::numeric AS match_score,
    (
      (CASE WHEN query_embedding IS NOT NULL THEN (r.semantic_similarity * 100 * 0.80) ELSE 0 END) +
      (CASE WHEN query_text = '' THEN (50 * 0.20)
            ELSE COALESCE(ts_rank(r.search_vector, r.search_query) * 100 * 0.20, 0)
       END)
    )::numeric AS base_relevance,
    LEAST(
      (CASE WHEN r.accreditation_status IN ('Accredited', 'State Licensed') THEN 0.12 ELSE 0 END) +
      (CASE WHEN r.state_pass_rate IS NOT NULL THEN 0.08 ELSE 0 END) +
      (CASE WHEN r.written_pass_rate_2026 IS NOT NULL OR r.practical_pass_rate_2026 IS NOT NULL
            THEN COALESCE(r.written_pass_rate_2026, r.practical_pass_rate_2026) * 0.20
            ELSE 0
       END),
      0.40
    )::numeric AS quality_bonus,
    count(*) OVER() as total_matched
  FROM search_results r
  WHERE query_text = ''
     OR (
       (CASE WHEN query_embedding IS NOT NULL THEN (r.semantic_similarity * 100 * 0.80) ELSE 0 END) +
       COALESCE(ts_rank(r.search_vector, r.search_query) * 100 * 0.20, 0)
     ) > 10
     OR (query_embedding IS NULL AND r.token_matches > 0)
  ORDER BY match_score DESC
  LIMIT limit_val
  OFFSET offset_val;
END;
$$ LANGUAGE plpgsql;


-- 6. search_supply_stores_ranked
DROP FUNCTION IF EXISTS public.search_supply_stores_ranked(text, vector(768), int, int);

CREATE FUNCTION public.search_supply_stores_ranked(
  query_text text,
  query_embedding vector(768) DEFAULT NULL,
  limit_val int DEFAULT 10,
  offset_val int DEFAULT 0
)
RETURNS TABLE (
  id uuid,
  slug text,
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
  base_relevance numeric,
  quality_bonus numeric,
  total_matched bigint
) AS $$
BEGIN
  RETURN QUERY
  WITH query_tokens AS (
    SELECT unnest(string_to_array(lower(trim(query_text)), ' ')) AS token
  ),
  search_results AS (
    SELECT
      s.id,
      s.slug,
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
      END) as semantic_similarity,
      (SELECT count(*) FROM query_tokens qt
        WHERE length(qt.token) >= 3 AND (
          lower(COALESCE(s.name, '')) LIKE '%' || qt.token || '%' OR
          lower(COALESCE(s.city, '')) LIKE '%' || qt.token || '%' OR
          lower(COALESCE(s.place_types, '')) LIKE '%' || qt.token || '%'
        )
      ) AS token_matches
    FROM agent_barber_supply_store_leads s
  )
  SELECT
    s.id,
    s.slug,
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
      (CASE WHEN query_embedding IS NOT NULL THEN (s.semantic_similarity * 100 * 0.80) ELSE 0 END) +
      (CASE WHEN query_text = '' THEN (50 * 0.20)
            ELSE COALESCE(ts_rank(s.search_vector, s.search_query) * 100 * 0.20, 0)
       END) +
      (COALESCE(s.rating, 0) * 10) +
      LEAST((COALESCE(s.total_reviews, 0) / 5), 50)
    )::numeric AS match_score,
    (
      (CASE WHEN query_embedding IS NOT NULL THEN (s.semantic_similarity * 100 * 0.80) ELSE 0 END) +
      (CASE WHEN query_text = '' THEN (50 * 0.20)
            ELSE COALESCE(ts_rank(s.search_vector, s.search_query) * 100 * 0.20, 0)
       END)
    )::numeric AS base_relevance,
    LEAST(
      (COALESCE(s.rating, 0) / 5 * 0.20) +
      (LEAST(COALESCE(s.total_reviews, 0), 250)::numeric / 250 * 0.20),
      0.40
    )::numeric AS quality_bonus,
    count(*) OVER() as total_matched
  FROM search_results s
  WHERE query_text = ''
     OR (
       (CASE WHEN query_embedding IS NOT NULL THEN (s.semantic_similarity * 100 * 0.80) ELSE 0 END) +
       COALESCE(ts_rank(s.search_vector, s.search_query) * 100 * 0.20, 0)
     ) > 10
     OR (query_embedding IS NULL AND s.token_matches > 0)
  ORDER BY match_score DESC
  LIMIT limit_val
  OFFSET offset_val;
END;
$$ LANGUAGE plpgsql;


-- 7. search_beauty_supply_stores_ranked
DROP FUNCTION IF EXISTS public.search_beauty_supply_stores_ranked(text, vector(768), int, int);

CREATE FUNCTION public.search_beauty_supply_stores_ranked(
  query_text text,
  query_embedding vector(768) DEFAULT NULL,
  limit_val int DEFAULT 10,
  offset_val int DEFAULT 0
)
RETURNS TABLE (
  id uuid,
  slug text,
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
  base_relevance numeric,
  quality_bonus numeric,
  total_matched bigint
) AS $$
BEGIN
  RETURN QUERY
  WITH query_tokens AS (
    SELECT unnest(string_to_array(lower(trim(query_text)), ' ')) AS token
  ),
  search_results AS (
    SELECT
      s.id,
      s.slug,
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
      END) as semantic_similarity,
      (SELECT count(*) FROM query_tokens qt
        WHERE length(qt.token) >= 3 AND (
          lower(COALESCE(s.name, '')) LIKE '%' || qt.token || '%' OR
          lower(COALESCE(s.city, '')) LIKE '%' || qt.token || '%' OR
          lower(COALESCE(s.place_types, '')) LIKE '%' || qt.token || '%'
        )
      ) AS token_matches
    FROM agent_beauty_supply_store_leads s
  )
  SELECT
    s.id,
    s.slug,
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
      (CASE WHEN query_embedding IS NOT NULL THEN (s.semantic_similarity * 100 * 0.80) ELSE 0 END) +
      (CASE WHEN query_text = '' THEN (50 * 0.20)
            ELSE COALESCE(ts_rank(s.search_vector, s.search_query) * 100 * 0.20, 0)
       END) +
      (COALESCE(s.rating, 0) * 10) +
      LEAST((COALESCE(s.total_reviews, 0) / 5), 50)
    )::numeric AS match_score,
    (
      (CASE WHEN query_embedding IS NOT NULL THEN (s.semantic_similarity * 100 * 0.80) ELSE 0 END) +
      (CASE WHEN query_text = '' THEN (50 * 0.20)
            ELSE COALESCE(ts_rank(s.search_vector, s.search_query) * 100 * 0.20, 0)
       END)
    )::numeric AS base_relevance,
    LEAST(
      (COALESCE(s.rating, 0) / 5 * 0.20) +
      (LEAST(COALESCE(s.total_reviews, 0), 250)::numeric / 250 * 0.20),
      0.40
    )::numeric AS quality_bonus,
    count(*) OVER() as total_matched
  FROM search_results s
  WHERE query_text = ''
     OR (
       (CASE WHEN query_embedding IS NOT NULL THEN (s.semantic_similarity * 100 * 0.80) ELSE 0 END) +
       COALESCE(ts_rank(s.search_vector, s.search_query) * 100 * 0.20, 0)
     ) > 10
     OR (query_embedding IS NULL AND s.token_matches > 0)
  ORDER BY match_score DESC
  LIMIT limit_val
  OFFSET offset_val;
END;
$$ LANGUAGE plpgsql;
