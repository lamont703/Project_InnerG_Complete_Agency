-- Which entity PAGE types the entity_bottom_banner shows on (route keys:
-- shop | salons | barbers | cosmetologists | schools | stores). Empty = every
-- entity page type. Distinct from `entity_type`, which is the banner's DESTINATION
-- entity — this controls where it appears, not what it links to.
ALTER TABLE public.ad_campaigns
  ADD COLUMN IF NOT EXISTS banner_page_types text[] NOT NULL DEFAULT '{}';
