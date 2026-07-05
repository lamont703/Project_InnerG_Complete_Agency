-- Geo-enrichment columns for pricing/community-intelligence features:
-- census tract + block group (for demographic/income context, kept out of
-- the UI per design — backend-only signal for AI grounding and future
-- pricing algorithms) and school district (surfaced in the UI as a
-- community/cultural anchor, e.g. "Located in Katy ISD").
--
-- Scoped to the four entity types where pricing and community identity
-- actually matter (barbershops, salons, barbers, cosmetologists) — schools
-- and supply stores were left out for now, easy to extend later.

DO $$
DECLARE
  t text;
BEGIN
  FOREACH t IN ARRAY ARRAY['agent_barbershop_leads', 'agent_salon_leads', 'agent_barber_leads', 'agent_cosmetologist_leads']
  LOOP
    EXECUTE format('ALTER TABLE %I ADD COLUMN IF NOT EXISTS census_tract_geoid text', t);
    EXECUTE format('ALTER TABLE %I ADD COLUMN IF NOT EXISTS census_block_group_geoid text', t);
    EXECUTE format('ALTER TABLE %I ADD COLUMN IF NOT EXISTS census_median_household_income integer', t);
    EXECUTE format('ALTER TABLE %I ADD COLUMN IF NOT EXISTS census_population integer', t);
    EXECUTE format('ALTER TABLE %I ADD COLUMN IF NOT EXISTS census_data_updated_at timestamptz', t);
    EXECUTE format('ALTER TABLE %I ADD COLUMN IF NOT EXISTS school_district_name text', t);
    EXECUTE format('ALTER TABLE %I ADD COLUMN IF NOT EXISTS school_district_geoid text', t);
    EXECUTE format('ALTER TABLE %I ADD COLUMN IF NOT EXISTS school_district_updated_at timestamptz', t);
    EXECUTE format('CREATE INDEX IF NOT EXISTS idx_%s_census_tract ON %I (census_tract_geoid)', t, t);
    EXECUTE format('CREATE INDEX IF NOT EXISTS idx_%s_school_district ON %I (school_district_name)', t, t);
  END LOOP;
END $$;
