-- The chat-side verification button needs to know, per match, whether a
-- request has already gone out — otherwise the frontend has no way to
-- decide whether to show "Request Verification" for a given result.
-- Added to the three tools whose results represent specific,
-- individually-actionable matches (find_professional_employment,
-- get_workers_at_venue, list_unconfirmed_matches) — not the aggregate
-- tools (get_top_venues_by_worker_count, get_confirmation_stats,
-- get_employment_match_overview), which don't return a single row a
-- button could attach to.
--
-- list_unconfirmed_matches also now excludes already-requested matches
-- by default — the whole point of that tool is "who still needs to be
-- asked," so resurfacing someone already pending in GHL isn't useful.

DROP FUNCTION IF EXISTS find_professional_employment(text, int);

CREATE OR REPLACE FUNCTION find_professional_employment(
  p_name_query text,
  p_limit int DEFAULT 5
)
RETURNS TABLE (
  professional_type text,
  professional_id uuid,
  professional_name text,
  professional_address text,
  venue_type text,
  venue_id uuid,
  venue_name text,
  venue_address text,
  distance_miles numeric,
  confidence_score numeric,
  name_match_score numeric,
  verification_requested_at timestamptz
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
      m.verification_requested_at,
      (
        SELECT count(*) FROM query_tokens qt
        WHERE length(qt.token) >= 3 AND lower(m.professional_name) LIKE '%' || qt.token || '%'
      ) AS token_matches,
      similarity(lower(m.professional_name), lower(p_name_query)) AS trgm_sim
    FROM professional_employment_matches m
  )
  SELECT
    s.professional_type,
    s.professional_id,
    s.professional_name,
    CASE s.professional_type
      WHEN 'barber' THEN (SELECT address FROM agent_barber_leads WHERE id = s.professional_id)
      WHEN 'cosmetologist' THEN (SELECT address FROM agent_cosmetologist_leads WHERE id = s.professional_id)
    END AS professional_address,
    s.venue_type,
    s.venue_id,
    s.venue_name,
    CASE s.venue_type
      WHEN 'shop' THEN (SELECT formatted_address FROM agent_barbershop_leads WHERE id = s.venue_id)
      WHEN 'salon' THEN (SELECT formatted_address FROM agent_salon_leads WHERE id = s.venue_id)
    END AS venue_address,
    s.distance_miles,
    s.confidence_score,
    ROUND((s.token_matches * 10 + s.trgm_sim * 5)::numeric, 2) AS name_match_score,
    s.verification_requested_at
  FROM scored s
  WHERE s.token_matches > 0 OR s.trgm_sim > 0.25
  ORDER BY s.token_matches DESC, s.trgm_sim DESC, s.confidence_score DESC
  LIMIT p_limit;
$$;

DROP FUNCTION IF EXISTS get_workers_at_venue(text, int);

CREATE OR REPLACE FUNCTION get_workers_at_venue(p_venue_query text, p_limit int DEFAULT 20)
RETURNS TABLE (
  professional_type text,
  professional_id uuid,
  professional_name text,
  venue_type text,
  venue_id uuid,
  venue_name text,
  distance_miles numeric,
  confidence_score numeric,
  confirmation_status text,
  verification_requested_at timestamptz
)
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  WITH query_tokens AS (
    SELECT unnest(string_to_array(lower(trim(p_venue_query)), ' ')) AS token
  ),
  venue_scores AS (
    SELECT DISTINCT
      m.venue_id,
      (
        SELECT count(*) FROM query_tokens qt
        WHERE length(qt.token) >= 3 AND lower(m.venue_name) LIKE '%' || qt.token || '%'
      ) AS token_matches,
      similarity(lower(m.venue_name), lower(p_venue_query)) AS trgm_sim
    FROM professional_employment_matches m
  ),
  best_venues AS (
    SELECT venue_id FROM venue_scores
    WHERE token_matches > 0 OR trgm_sim > 0.25
    ORDER BY token_matches DESC, trgm_sim DESC
    LIMIT 2
  )
  SELECT
    m.professional_type, m.professional_id, m.professional_name,
    m.venue_type, m.venue_id, m.venue_name,
    m.distance_miles, m.confidence_score, m.confirmation_status,
    m.verification_requested_at
  FROM professional_employment_matches m
  WHERE m.venue_id IN (SELECT venue_id FROM best_venues)
  ORDER BY m.confidence_score DESC
  LIMIT p_limit;
$$;

DROP FUNCTION IF EXISTS list_unconfirmed_matches(int, numeric);

CREATE OR REPLACE FUNCTION list_unconfirmed_matches(p_limit int DEFAULT 20, p_min_confidence numeric DEFAULT 0)
RETURNS TABLE (
  professional_type text,
  professional_id uuid,
  professional_name text,
  venue_type text,
  venue_id uuid,
  venue_name text,
  distance_miles numeric,
  confidence_score numeric,
  verification_requested_at timestamptz
)
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT professional_type, professional_id, professional_name, venue_type, venue_id, venue_name, distance_miles, confidence_score, verification_requested_at
  FROM professional_employment_matches
  WHERE confirmation_status = 'unconfirmed'
    AND confidence_score >= p_min_confidence
    AND verification_requested_at IS NULL
  ORDER BY confidence_score DESC
  LIMIT p_limit;
$$;
