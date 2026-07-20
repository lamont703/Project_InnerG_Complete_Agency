-- Owner-entered amenities/tags for the manage-listing form — kept
-- separate from place_types (Google's own scraped category data, still
-- read elsewhere — see lib/public-columns.ts) rather than overwriting it,
-- same "new column, don't touch the legacy scraped field" pattern as the
-- 20260721000000 structured-address migration. The Amenities & Tags
-- section on the entity pages merges both sources together.
ALTER TABLE public.agent_barbershop_leads ADD COLUMN IF NOT EXISTS custom_amenities TEXT[];
ALTER TABLE public.agent_salon_leads ADD COLUMN IF NOT EXISTS custom_amenities TEXT[];
