-- Places API-based discovery (the only source of a real Google place_id for
-- these 3 tables) is going dormant in favor of browser-only Maps scraping,
-- which can't produce one. place_id/contact_id are never read or displayed
-- anywhere in the app (confirmed via full-repo grep) — purely a backend
-- uniqueness key, and dedup already works on name+city alone for every
-- sibling table in this family. Direct precedent for this exact relaxation
-- already exists: 20260521_add_outreach_telemetry.sql dropped NOT NULL on
-- agent_barbershop_leads.contact_id for the same kind of sourcing-method
-- transition. UNIQUE stays intact — Postgres allows unlimited NULLs under a
-- plain UNIQUE constraint, already proven live on agent_salon_leads today.
ALTER TABLE agent_barber_supply_store_leads ALTER COLUMN place_id DROP NOT NULL;
ALTER TABLE agent_beauty_supply_store_leads ALTER COLUMN place_id DROP NOT NULL;
ALTER TABLE agent_barber_school_leads ALTER COLUMN contact_id DROP NOT NULL;
