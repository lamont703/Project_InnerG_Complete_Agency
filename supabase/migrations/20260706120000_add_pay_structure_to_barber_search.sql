-- Surface desired_pay_structure so the Barbers tab can filter by
-- "wants booth rent" / "wants commission", mirroring the existing
-- Barbershops tab filters.
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
