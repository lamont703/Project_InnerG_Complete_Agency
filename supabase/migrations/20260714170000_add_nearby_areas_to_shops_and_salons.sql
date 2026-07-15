-- Reusable "areas served" concept for entity profile pages — lets a real
-- entity's page/JSON-LD honestly reference well-known nearby neighborhoods
-- it's genuinely close to (computed from real lat/long, not claimed),
-- e.g. a Drybar in Uptown Park (~1.9mi from River Oaks) legitimately
-- serving River Oaks searches without being physically located there.
-- Nullable + no backfill in this migration — computed and populated by
-- scripts/backfill_nearby_areas.js, then kept current going forward by
-- the publish paths (auto_publish_audited_entities.js and
-- publishDiscoveredBusiness()) computing it at insert time for new rows.
ALTER TABLE agent_barbershop_leads ADD COLUMN IF NOT EXISTS nearby_areas text[];
ALTER TABLE agent_salon_leads ADD COLUMN IF NOT EXISTS nearby_areas text[];
