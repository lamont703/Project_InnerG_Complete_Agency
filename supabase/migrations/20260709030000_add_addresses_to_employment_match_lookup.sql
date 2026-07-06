-- A real chat transcript showed the model hallucinating a business
-- address on a follow-up turn ("do you have both of their addresses?")
-- — invented a Houston street address that doesn't exist anywhere in the
-- database. Root cause: find_professional_employment never included
-- address for either the professional or the venue, so a follow-up
-- question later in the same conversation had nothing real in history
-- to draw from and fabricated a plausible-sounding one instead of
-- saying it didn't know.
--
-- Addresses are looked up live via CASE/subselect rather than stored
-- redundantly on professional_employment_matches, since they can change
-- on re-scrape and this only ever returns a handful of rows per call.
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
    ROUND((s.token_matches * 10 + s.trgm_sim * 5)::numeric, 2) AS name_match_score
  FROM scored s
  WHERE s.token_matches > 0 OR s.trgm_sim > 0.25
  ORDER BY s.token_matches DESC, s.trgm_sim DESC, s.confidence_score DESC
  LIMIT p_limit;
$$;
