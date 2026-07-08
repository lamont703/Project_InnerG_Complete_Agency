-- Adds pell_grant_rate and federal_loan_rate to search_schools_ranked's
-- RETURNS TABLE so the Schools tab's new "Financial Aid" filter chip can
-- filter client-side without a follow-up query per result, matching the
-- pattern already used for written_pass_rate_2026/annual_tuition filters.
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
  total_matched bigint
) AS $$
BEGIN
  RETURN QUERY
  WITH combined AS (
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
      END) as semantic_similarity
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
    count(*) OVER() as total_matched
  FROM search_results r
  WHERE (
    (CASE WHEN query_embedding IS NOT NULL THEN (r.semantic_similarity * 100 * 0.80) ELSE 0 END) +
    (CASE WHEN query_text = '' THEN 10 ELSE COALESCE(ts_rank(r.search_vector, r.search_query) * 100 * 0.20, 0) END)
  ) > 10
  ORDER BY match_score DESC
  LIMIT limit_val
  OFFSET offset_val;
END;
$$ LANGUAGE plpgsql;
