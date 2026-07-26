-- Ad copy for the entity_bottom_banner placement — the dismissible bottom CTA
-- banner shown on entity pages. Unlike image banners (banner_image_url), this
-- placement is a compact text CTA, so it carries its own short copy.
ALTER TABLE public.ad_campaigns
  ADD COLUMN IF NOT EXISTS ad_eyebrow text,    -- small uppercase label
  ADD COLUMN IF NOT EXISTS ad_headline text,   -- the pitch (1–2 short sentences)
  ADD COLUMN IF NOT EXISTS ad_cta_label text;  -- button text
