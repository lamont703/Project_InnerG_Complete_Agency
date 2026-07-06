-- Found while verifying live: asking "which salon employs the most
-- people" returned shops mixed in, since the tool had no way to filter
-- by venue type — it always ranked across shops and salons combined.
DROP FUNCTION IF EXISTS get_top_venues_by_worker_count(int, numeric);

CREATE OR REPLACE FUNCTION get_top_venues_by_worker_count(
  p_limit int DEFAULT 10,
  p_min_confidence numeric DEFAULT 40,
  p_venue_type text DEFAULT NULL
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
    AND (p_venue_type IS NULL OR m.venue_type = p_venue_type)
  GROUP BY m.venue_type, m.venue_id, m.venue_name
  ORDER BY worker_count DESC, avg_confidence DESC
  LIMIT p_limit;
$$;
