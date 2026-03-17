-- Migration 077: Enhance Agency Profile with Appearance and UX Settings
-- Inner G Complete Agency — Client Intelligence Portal

ALTER TABLE public.agency_profile
  ADD COLUMN IF NOT EXISTS theme_preference TEXT DEFAULT 'system',
  ADD COLUMN IF NOT EXISTS brand_colors JSONB DEFAULT '{
    "primary": "#C8FF00",
    "accent": "#8B5CF6",
    "background": "dynamic"
  }'::jsonb;

COMMENT ON COLUMN public.agency_profile.theme_preference IS 'Default theme for the agency dashboard: light, dark, or system.';
COMMENT ON COLUMN public.agency_profile.brand_colors IS 'JSON object containing brand color configuration (primary, accent, background).';
