-- Adds a Schools tab to the search engine: hybrid semantic + keyword ranking
-- over agent_barber_school_leads, matching the same 80/20 scoring pattern
-- used by search_barbers_ranked / search_web_pages_ranked / search_platform_tools_ranked.
CREATE OR REPLACE FUNCTION public.search_schools_ranked(
  query_text text,
  query_embedding vector(768) DEFAULT NULL,
  limit_val int DEFAULT 10,
  offset_val int DEFAULT 0
)
RETURNS TABLE (
  id uuid,
  school_name text,
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
  match_score numeric,
  total_matched bigint
) AS $$
BEGIN
  RETURN QUERY
  WITH search_results AS (
    SELECT
      s.id,
      s.school_name,
      s.city,
      s.formatted_address,
      s.phone,
      s.website,
      s.rating,
      s.google_review_count,
      s.google_photos,
      s.accreditation_status,
      s.accreditor_name,
      s.annual_tuition,
      s.completion_rate,
      s.state_pass_rate,
      s.embedding,
      to_tsvector('english',
        coalesce(s.school_name, '') || ' ' ||
        coalesce(s.city, '') || ' ' ||
        coalesce(s.accreditation_status, '') || ' ' ||
        coalesce(s.accreditor_name, '')
      ) as search_vector,
      websearch_to_tsquery('english', query_text) as search_query,
      (CASE
        WHEN query_embedding IS NOT NULL AND s.embedding IS NOT NULL
        THEN (1 - (s.embedding <=> query_embedding))
        ELSE 0
      END) as semantic_similarity
    FROM agent_barber_school_leads s
    WHERE s.google_business_status IS NULL OR s.google_business_status != 'CLOSED_PERMANENTLY'
  )
  SELECT
    r.id,
    r.school_name,
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
    (
      -- 80% Weight to AI Semantic Score
      (CASE WHEN query_embedding IS NOT NULL THEN (r.semantic_similarity * 100 * 0.80) ELSE 0 END) +
      -- 20% Weight to Keyword Score
      (CASE WHEN query_text = '' THEN (50 * 0.20)
            ELSE COALESCE(ts_rank(r.search_vector, r.search_query) * 100 * 0.20, 0)
       END) +
      -- Engagement Score Modifiers (Fixed Points)
      (CASE WHEN r.accreditation_status = 'Accredited' THEN 15 ELSE 0 END) +
      (CASE WHEN r.state_pass_rate IS NOT NULL THEN 10 ELSE 0 END)
    )::numeric AS match_score,
    count(*) OVER() as total_matched
  FROM search_results r
  -- Soft filter: Must score higher than 10 points (blocks pure garbage)
  WHERE (
    (CASE WHEN query_embedding IS NOT NULL THEN (r.semantic_similarity * 100 * 0.80) ELSE 0 END) +
    (CASE WHEN query_text = '' THEN 10 ELSE COALESCE(ts_rank(r.search_vector, r.search_query) * 100 * 0.20, 0) END)
  ) > 10
  ORDER BY match_score DESC
  LIMIT limit_val
  OFFSET offset_val;
END;
$$ LANGUAGE plpgsql;
