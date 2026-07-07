-- New use case: barber/cosmetology schools must confirm where graduates
-- currently work for 60% placement-rate accreditation reporting. Booksy-
-- scraped barber/cosmetologist "names" are mostly personal booking-brand
-- handles (e.g. "KamKutz", "T0nyfad3s"), not "First Last" names, so
-- matching by name alone is unreliable — geocoded distance to the
-- nearest shop/salon is the stronger signal (validated on a real 60-
-- barber Houston sample: 45% matched within 0.05mi, 68% within 0.25mi).
--
-- This produces a CONFIDENCE-SCORED CANDIDATE, not a confirmed fact —
-- schools report this to licensing boards, so an unconfirmed inference
-- being treated as ground truth is a real liability if wrong. The
-- confirmation_status field exists so a later outreach step (SMS via
-- the existing GHL pipeline) can turn a candidate into an audited,
-- timestamped confirmation.
CREATE TABLE public.professional_employment_matches (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  professional_type text NOT NULL CHECK (professional_type IN ('barber', 'cosmetologist')),
  professional_id uuid NOT NULL,
  professional_name text NOT NULL,
  venue_type text NOT NULL CHECK (venue_type IN ('shop', 'salon')),
  venue_id uuid NOT NULL,
  venue_name text NOT NULL,
  distance_miles numeric NOT NULL,
  confidence_score numeric NOT NULL,
  confirmation_status text NOT NULL DEFAULT 'unconfirmed' CHECK (confirmation_status IN ('unconfirmed', 'confirmed', 'denied')),
  confirmed_at timestamptz,
  confirmation_method text,
  computed_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (professional_type, professional_id)
);

CREATE INDEX idx_professional_employment_matches_professional
  ON public.professional_employment_matches (professional_type, professional_id);
CREATE INDEX idx_professional_employment_matches_venue
  ON public.professional_employment_matches (venue_type, venue_id);

ALTER TABLE public.professional_employment_matches ENABLE ROW LEVEL SECURITY;
-- No public policies — service_role only (school-facing access goes
-- through a SECURITY DEFINER RPC later, same pattern as the search-
-- performance tables from this session).

-- Excludes booking-profile rows whose "name" is actually a shop's own
-- listing (~14% of agent_barber_leads, confirmed via sampling) — "where
-- does [Shop Name] work" isn't a meaningful question, and matching a
-- shop-listing "professional" to itself at 0.000mi would otherwise look
-- like a perfect match and pollute results.
-- Output params are prefixed result_ to avoid colliding with the
-- professional_type/venue_type columns referenced throughout the
-- function body — PL/pgSQL turns RETURNS TABLE params into variables in
-- scope for the whole function, and a bare column reference sharing that
-- name anywhere inside (e.g. an ON CONFLICT target list) becomes
-- ambiguous between the variable and the column.
CREATE OR REPLACE FUNCTION compute_professional_employment_matches()
RETURNS TABLE (result_professional_type text, result_matched_count int)
LANGUAGE plpgsql
AS $$
DECLARE
  v_barber_count int;
  v_cosmetologist_count int;
  shop_like_name_pattern text := '(barbershop|barber shop|salon|studio|parlor|lounge|grooming)';
BEGIN
  -- Barbers -> nearest shop or salon within 3 miles
  WITH venues AS (
    SELECT id, shop_name AS name, 'shop'::text AS venue_type,
           ST_SetSRID(ST_MakePoint(longitude::float8, latitude::float8), 4326)::geography AS loc
    FROM agent_barbershop_leads WHERE latitude IS NOT NULL AND longitude IS NOT NULL
    UNION ALL
    SELECT id, shop_name AS name, 'salon'::text AS venue_type,
           ST_SetSRID(ST_MakePoint(longitude::float8, latitude::float8), 4326)::geography AS loc
    FROM agent_salon_leads WHERE latitude IS NOT NULL AND longitude IS NOT NULL
  ),
  ranked AS (
    SELECT
      b.id AS professional_id,
      b.name AS professional_name,
      v.venue_type,
      v.id AS venue_id,
      v.name AS venue_name,
      ST_Distance(ST_SetSRID(ST_MakePoint(b.longitude::float8, b.latitude::float8), 4326)::geography, v.loc) / 1609.344 AS distance_miles,
      ROW_NUMBER() OVER (
        PARTITION BY b.id
        ORDER BY ST_SetSRID(ST_MakePoint(b.longitude::float8, b.latitude::float8), 4326)::geography <-> v.loc ASC
      ) AS rn
    FROM agent_barber_leads b
    JOIN venues v
      ON ST_DWithin(ST_SetSRID(ST_MakePoint(b.longitude::float8, b.latitude::float8), 4326)::geography, v.loc, 4828.032) -- 3 miles in meters
    WHERE b.latitude IS NOT NULL AND b.longitude IS NOT NULL
      AND b.name !~* shop_like_name_pattern
  ),
  upserted AS (
    INSERT INTO professional_employment_matches (
      professional_type, professional_id, professional_name,
      venue_type, venue_id, venue_name, distance_miles, confidence_score
    )
    SELECT
      'barber', professional_id, professional_name,
      venue_type, venue_id, venue_name, distance_miles,
      ROUND((100 * exp(-distance_miles / 1.2))::numeric, 1)
    FROM ranked WHERE rn = 1
    ON CONFLICT (professional_type, professional_id) DO UPDATE SET
      professional_name = EXCLUDED.professional_name,
      venue_type = EXCLUDED.venue_type,
      venue_id = EXCLUDED.venue_id,
      venue_name = EXCLUDED.venue_name,
      distance_miles = EXCLUDED.distance_miles,
      confidence_score = EXCLUDED.confidence_score,
      computed_at = now()
    RETURNING 1
  )
  SELECT count(*) INTO v_barber_count FROM upserted;

  -- Cosmetologists -> nearest shop or salon within 3 miles
  WITH venues AS (
    SELECT id, shop_name AS name, 'shop'::text AS venue_type,
           ST_SetSRID(ST_MakePoint(longitude::float8, latitude::float8), 4326)::geography AS loc
    FROM agent_barbershop_leads WHERE latitude IS NOT NULL AND longitude IS NOT NULL
    UNION ALL
    SELECT id, shop_name AS name, 'salon'::text AS venue_type,
           ST_SetSRID(ST_MakePoint(longitude::float8, latitude::float8), 4326)::geography AS loc
    FROM agent_salon_leads WHERE latitude IS NOT NULL AND longitude IS NOT NULL
  ),
  ranked AS (
    SELECT
      c.id AS professional_id,
      c.name AS professional_name,
      v.venue_type,
      v.id AS venue_id,
      v.name AS venue_name,
      ST_Distance(ST_SetSRID(ST_MakePoint(c.longitude::float8, c.latitude::float8), 4326)::geography, v.loc) / 1609.344 AS distance_miles,
      ROW_NUMBER() OVER (
        PARTITION BY c.id
        ORDER BY ST_SetSRID(ST_MakePoint(c.longitude::float8, c.latitude::float8), 4326)::geography <-> v.loc ASC
      ) AS rn
    FROM agent_cosmetologist_leads c
    JOIN venues v
      ON ST_DWithin(ST_SetSRID(ST_MakePoint(c.longitude::float8, c.latitude::float8), 4326)::geography, v.loc, 4828.032)
    WHERE c.latitude IS NOT NULL AND c.longitude IS NOT NULL
      AND c.name !~* shop_like_name_pattern
  ),
  upserted AS (
    INSERT INTO professional_employment_matches (
      professional_type, professional_id, professional_name,
      venue_type, venue_id, venue_name, distance_miles, confidence_score
    )
    SELECT
      'cosmetologist', professional_id, professional_name,
      venue_type, venue_id, venue_name, distance_miles,
      ROUND((100 * exp(-distance_miles / 1.2))::numeric, 1)
    FROM ranked WHERE rn = 1
    ON CONFLICT (professional_type, professional_id) DO UPDATE SET
      professional_name = EXCLUDED.professional_name,
      venue_type = EXCLUDED.venue_type,
      venue_id = EXCLUDED.venue_id,
      venue_name = EXCLUDED.venue_name,
      distance_miles = EXCLUDED.distance_miles,
      confidence_score = EXCLUDED.confidence_score,
      computed_at = now()
    RETURNING 1
  )
  SELECT count(*) INTO v_cosmetologist_count FROM upserted;

  RETURN QUERY SELECT 'barber'::text, v_barber_count::int
    UNION ALL SELECT 'cosmetologist'::text, v_cosmetologist_count::int;
END;
$$;
