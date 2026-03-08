-- ============================================================
-- Migration 021: Add Phone to Growth Audit Leads
-- Inner G Complete Agency — Client Intelligence Portal
-- ============================================================

ALTER TABLE public.growth_audit_leads 
ADD COLUMN IF NOT EXISTS phone TEXT;

COMMENT ON COLUMN public.growth_audit_leads.phone IS 'User provided phone number from growth audit form.';
