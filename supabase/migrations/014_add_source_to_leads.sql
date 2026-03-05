-- ============================================================
-- Migration 014: Add Source to Leads
-- Inner G Complete Agency — Client Intelligence Portal
-- ============================================================

ALTER TABLE public.growth_audit_leads 
ADD COLUMN IF NOT EXISTS source TEXT;

COMMENT ON COLUMN public.growth_audit_leads.source IS 
  'The origin of the lead (e.g., website_cta, referral, etc.)';
