-- Make ad campaigns granular enough to actually serve an ad:
--   entity_type  — which table the advertised entity lives in (shop, salon,
--                  store, barber, cosmetologist, school, event). With
--                  `creative` (the entity slug) this identifies the exact
--                  entity being advertised, and lets us link the ad to that
--                  entity's profile page.
--   filter_tabs  — for search_results placements, which search filter tabs the
--                  ad appears on (e.g. {All, Barbershops}). Empty = all tabs.

ALTER TABLE public.ad_campaigns
  ADD COLUMN IF NOT EXISTS entity_type text,
  ADD COLUMN IF NOT EXISTS filter_tabs text[] NOT NULL DEFAULT '{}';
