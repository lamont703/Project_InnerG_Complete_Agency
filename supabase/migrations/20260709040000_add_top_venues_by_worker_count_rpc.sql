-- "Which shop has the most workers" is a genuinely different question
-- from find_professional_employment (a per-name lookup) — this is an
-- aggregate over professional_employment_matches, grouped by venue.
-- Defaults to excluding sub-40-confidence matches so a venue doesn't
-- look artificially busy from a handful of weak geocoded guesses;
-- exposed as a parameter rather than hardcoded so the model can ask
-- again without a floor if specifically pushed on it.
CREATE OR REPLACE FUNCTION get_top_venues_by_worker_count(
  p_limit int DEFAULT 10,
  p_min_confidence numeric DEFAULT 40
)
RETURNS TABLE (
  venue_type text,
  venue_id uuid,
  venue_name text,
  venue_address text,
  worker_count bigint,
  avg_confidence numeric
)
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT
    m.venue_type,
    m.venue_id,
    m.venue_name,
    CASE m.venue_type
      WHEN 'shop' THEN (SELECT formatted_address FROM agent_barbershop_leads WHERE id = m.venue_id)
      WHEN 'salon' THEN (SELECT formatted_address FROM agent_salon_leads WHERE id = m.venue_id)
    END AS venue_address,
    COUNT(*) AS worker_count,
    ROUND(AVG(m.confidence_score)::numeric, 1) AS avg_confidence
  FROM professional_employment_matches m
  WHERE m.confidence_score >= p_min_confidence
  GROUP BY m.venue_type, m.venue_id, m.venue_name
  ORDER BY worker_count DESC, avg_confidence DESC
  LIMIT p_limit;
$$;
