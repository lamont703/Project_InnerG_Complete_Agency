-- The AI Mode "where does X work" tool originally returned only names,
-- deliberately with no profile_url, so the model was instructed to
-- mention the venue as plain text rather than risk inventing a link. A
-- real chat transcript showed this reads as a real gap — the whole point
-- of AI Mode is to also serve as navigation into the app, so entity
-- mentions should link out whenever a real page exists. Adding the
-- underlying ids so the caller can construct real hrefs instead.
DROP FUNCTION IF EXISTS find_professional_employment(text, int);

CREATE OR REPLACE FUNCTION find_professional_employment(
  p_name_query text,
  p_limit int DEFAULT 5
)
RETURNS TABLE (
  professional_type text,
  professional_id uuid,
  professional_name text,
  venue_type text,
  venue_id uuid,
  venue_name text,
  distance_miles numeric,
  confidence_score numeric,
  name_match_score numeric
)
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  WITH query_tokens AS (
    SELECT unnest(string_to_array(lower(trim(p_name_query)), ' ')) AS token
  ),
  scored AS (
    SELECT
      m.professional_type,
      m.professional_id,
      m.professional_name,
      m.venue_type,
      m.venue_id,
      m.venue_name,
      m.distance_miles,
      m.confidence_score,
      (
        SELECT count(*) FROM query_tokens qt
        WHERE length(qt.token) >= 3 AND lower(m.professional_name) LIKE '%' || qt.token || '%'
      ) AS token_matches,
      similarity(lower(m.professional_name), lower(p_name_query)) AS trgm_sim
    FROM professional_employment_matches m
  )
  SELECT
    professional_type,
    professional_id,
    professional_name,
    venue_type,
    venue_id,
    venue_name,
    distance_miles,
    confidence_score,
    ROUND((token_matches * 10 + trgm_sim * 5)::numeric, 2) AS name_match_score
  FROM scored
  WHERE token_matches > 0 OR trgm_sim > 0.25
  ORDER BY token_matches DESC, trgm_sim DESC, confidence_score DESC
  LIMIT p_limit;
$$;
