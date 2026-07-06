-- Powers the AI Mode "where does X work" tool. Booking-platform names in
-- professional_employment_matches are mostly personal brand handles
-- ("KamKutz", "T0nyfad3s"), not "First Last" names, so a real person's
-- name has to be matched against a handle that may only share a
-- first-name substring with it (or may share nothing at all — a real,
-- known data limitation, not something this query can fully solve).
--
-- Ranks by: how many query-name tokens (3+ chars) appear as a substring
-- in the professional_name, then trigram similarity (pg_trgm, already
-- enabled in 024_chat_agent_alignment.sql) as a secondary signal, then
-- the existing employment-match confidence_score. Returns candidates,
-- not a single answer — a name search can plausibly match more than one
-- person, and the caller (the AI) needs to see that ambiguity rather
-- than have it silently collapsed to one row.
CREATE OR REPLACE FUNCTION find_professional_employment(
  p_name_query text,
  p_limit int DEFAULT 5
)
RETURNS TABLE (
  professional_type text,
  professional_name text,
  venue_type text,
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
      m.professional_name,
      m.venue_type,
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
    professional_name,
    venue_type,
    venue_name,
    distance_miles,
    confidence_score,
    ROUND((token_matches * 10 + trgm_sim * 5)::numeric, 2) AS name_match_score
  FROM scored
  WHERE token_matches > 0 OR trgm_sim > 0.25
  ORDER BY token_matches DESC, trgm_sim DESC, confidence_score DESC
  LIMIT p_limit;
$$;
