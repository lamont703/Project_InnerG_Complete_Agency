-- Four new AI Mode tools covering the question categories that had no
-- tool at all: venue -> people (the inverse of find_professional_
-- employment), confirmation-status auditing, an outreach worklist, and
-- a data-quality overview. School-level placement rate is deliberately
-- NOT built here — school_name is populated on only 3 of 1429 barber
-- records (self-reported via Passport, which almost nobody uses), so a
-- tool answering "what's [school]'s placement rate" would return
-- near-empty results for almost every real school today.

-- 1. Venue -> people. Same token+trigram fuzzy match as
-- find_professional_employment, but matched against venue_name instead
-- of professional_name, then resolved to the single best-matching
-- venue_id (or top 2, in case of a genuine name collision) so all of
-- that venue's workers come back together rather than a flat list of
-- independently-scored rows.
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
  confirmation_status text
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
    m.distance_miles, m.confidence_score, m.confirmation_status
  FROM professional_employment_matches m
  WHERE m.venue_id IN (SELECT venue_id FROM best_venues)
  ORDER BY m.confidence_score DESC
  LIMIT p_limit;
$$;

-- 2. Confirmation-status audit — a single-row summary. Every match is
-- 'unconfirmed' today (no confirmation/outreach flow built yet), so
-- confirmed_pct will honestly read 0 until that exists.
CREATE OR REPLACE FUNCTION get_confirmation_stats()
RETURNS TABLE (
  total_matches bigint,
  confirmed_count bigint,
  denied_count bigint,
  unconfirmed_count bigint,
  confirmed_pct numeric,
  avg_confidence numeric
)
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT
    COUNT(*) AS total_matches,
    COUNT(*) FILTER (WHERE confirmation_status = 'confirmed') AS confirmed_count,
    COUNT(*) FILTER (WHERE confirmation_status = 'denied') AS denied_count,
    COUNT(*) FILTER (WHERE confirmation_status = 'unconfirmed') AS unconfirmed_count,
    ROUND((COUNT(*) FILTER (WHERE confirmation_status = 'confirmed')::numeric / NULLIF(COUNT(*), 0) * 100), 1) AS confirmed_pct,
    ROUND(AVG(confidence_score)::numeric, 1) AS avg_confidence
  FROM professional_employment_matches;
$$;

-- 3. Outreach worklist — highest confidence first, so the most-likely-
-- correct matches get confirmed before lower-confidence ones.
CREATE OR REPLACE FUNCTION list_unconfirmed_matches(p_limit int DEFAULT 20, p_min_confidence numeric DEFAULT 0)
RETURNS TABLE (
  professional_type text,
  professional_id uuid,
  professional_name text,
  venue_type text,
  venue_id uuid,
  venue_name text,
  distance_miles numeric,
  confidence_score numeric
)
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT professional_type, professional_id, professional_name, venue_type, venue_id, venue_name, distance_miles, confidence_score
  FROM professional_employment_matches
  WHERE confirmation_status = 'unconfirmed' AND confidence_score >= p_min_confidence
  ORDER BY confidence_score DESC
  LIMIT p_limit;
$$;

-- 4. Data-quality overview. unmatched_eligible_count replicates the same
-- eligibility filter compute_professional_employment_matches uses
-- (lat/lng present, name isn't a shop-like listing) minus however many
-- of those actually landed a match within 3 miles of any venue — a real
-- "tried but found nothing nearby" count, not just "never attempted."
CREATE OR REPLACE FUNCTION get_employment_match_overview()
RETURNS TABLE (
  total_matches bigint,
  barber_matches bigint,
  cosmetologist_matches bigint,
  shop_matches bigint,
  salon_matches bigint,
  avg_confidence numeric,
  avg_distance_miles numeric,
  high_confidence_count bigint,
  low_confidence_count bigint,
  unmatched_eligible_count bigint
)
LANGUAGE plpgsql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_shop_like_pattern text := '(barbershop|barber shop|salon|studio|parlor|lounge|grooming)';
  v_eligible_professionals bigint;
BEGIN
  SELECT
    (SELECT COUNT(*) FROM agent_barber_leads WHERE latitude IS NOT NULL AND longitude IS NOT NULL AND name !~* v_shop_like_pattern)
    + (SELECT COUNT(*) FROM agent_cosmetologist_leads WHERE latitude IS NOT NULL AND longitude IS NOT NULL AND name !~* v_shop_like_pattern)
  INTO v_eligible_professionals;

  RETURN QUERY
  SELECT
    COUNT(*) AS total_matches,
    COUNT(*) FILTER (WHERE m.professional_type = 'barber') AS barber_matches,
    COUNT(*) FILTER (WHERE m.professional_type = 'cosmetologist') AS cosmetologist_matches,
    COUNT(*) FILTER (WHERE m.venue_type = 'shop') AS shop_matches,
    COUNT(*) FILTER (WHERE m.venue_type = 'salon') AS salon_matches,
    ROUND(AVG(m.confidence_score)::numeric, 1) AS avg_confidence,
    ROUND(AVG(m.distance_miles)::numeric, 3) AS avg_distance_miles,
    COUNT(*) FILTER (WHERE m.confidence_score >= 70) AS high_confidence_count,
    COUNT(*) FILTER (WHERE m.confidence_score < 40) AS low_confidence_count,
    GREATEST(v_eligible_professionals - COUNT(*), 0) AS unmatched_eligible_count
  FROM professional_employment_matches m;
END;
$$;
