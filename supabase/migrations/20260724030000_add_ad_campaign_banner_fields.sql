-- Banner ad campaigns (state_hub_banner / city_hub_banner) carry their own
-- uploaded creative and an optional external click destination:
--   banner_image_url — the uploaded banner image (public URL in the
--                      'ad-creatives' storage bucket). ~24:7, e.g. 1200x350.
--   click_url        — optional external URL. When set, clicking the banner
--                      goes here INSTEAD of the advertised entity's profile.
ALTER TABLE public.ad_campaigns
  ADD COLUMN IF NOT EXISTS banner_image_url text,
  ADD COLUMN IF NOT EXISTS click_url text;
