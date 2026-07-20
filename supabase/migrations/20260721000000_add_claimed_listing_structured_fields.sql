-- Structured fields for the /account/manage-listing self-edit form,
-- scoped specifically to claimed shops/salons — see the conversation
-- decision: formatted_address and owner_name are read by ~45 files
-- (city-hub aggregation, extractZip, market-readiness/Google Ads/
-- traffic-optimization agents, JSON-LD, etc.), almost all via regex or
-- substring matching against those single flat strings. Rather than
-- restructure those columns directly (a much larger, riskier migration
-- across the whole scraped dataset), these new columns are additive:
-- the manage-listing form writes to them, the API route re-derives
-- formatted_address/owner_name from them on every save so every existing
-- consumer keeps working unchanged, and the entity pages additionally use
-- these structured fields to emit a properly split PostalAddress in
-- JSON-LD instead of dumping the whole string into streetAddress.
ALTER TABLE public.agent_barbershop_leads
  ADD COLUMN IF NOT EXISTS owner_first_name TEXT,
  ADD COLUMN IF NOT EXISTS owner_last_name TEXT,
  ADD COLUMN IF NOT EXISTS street_address TEXT,
  ADD COLUMN IF NOT EXISTS address_city TEXT,
  ADD COLUMN IF NOT EXISTS address_state TEXT,
  ADD COLUMN IF NOT EXISTS address_zip TEXT;

ALTER TABLE public.agent_salon_leads
  ADD COLUMN IF NOT EXISTS owner_first_name TEXT,
  ADD COLUMN IF NOT EXISTS owner_last_name TEXT,
  ADD COLUMN IF NOT EXISTS street_address TEXT,
  ADD COLUMN IF NOT EXISTS address_city TEXT,
  ADD COLUMN IF NOT EXISTS address_state TEXT,
  ADD COLUMN IF NOT EXISTS address_zip TEXT;
