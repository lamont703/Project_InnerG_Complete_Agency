-- Geo-targeting for on-profile ads: restrict a campaign to specific states
-- and/or cities. A profile ad only serves when the viewed entity's location
-- matches (empty arrays = no restriction, i.e. every location). Banners already
-- carry a single `scope`, and search ads target by filter tab, so this applies
-- to the profile placements (shop / salon / supply-store).
ALTER TABLE public.ad_campaigns
  ADD COLUMN IF NOT EXISTS target_states text[] NOT NULL DEFAULT '{}',
  ADD COLUMN IF NOT EXISTS target_cities text[] NOT NULL DEFAULT '{}';
