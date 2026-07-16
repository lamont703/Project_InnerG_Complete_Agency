-- Makes the auditor-confirmed category visible directly on the live row —
-- both for display (this is what we actually verified the business as on
-- Google Maps) and as a real, queryable signal of gate completeness: any
-- row with a NULL google_category was published before this requirement
-- existed, and is a candidate for the completeness-backfill pass rather
-- than removal (see project discussion — pulling live, possibly-indexed
-- rows off the site to "fix" a missing column is worse than updating them
-- in place).
ALTER TABLE agent_barbershop_leads ADD COLUMN google_category TEXT;
ALTER TABLE agent_salon_leads ADD COLUMN google_category TEXT;
ALTER TABLE agent_barber_school_leads ADD COLUMN google_category TEXT;
ALTER TABLE agent_cosmetology_school_leads ADD COLUMN google_category TEXT;
ALTER TABLE agent_barber_supply_store_leads ADD COLUMN google_category TEXT;
ALTER TABLE agent_beauty_supply_store_leads ADD COLUMN google_category TEXT;
