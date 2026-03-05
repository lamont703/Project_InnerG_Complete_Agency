-- ============================================================
-- Migration 006: Create Leads Domain
-- Inner G Complete Agency — Client Intelligence Portal
-- ============================================================
-- Table: growth_audit_leads
-- Sourced from: /functions/v1/submit-growth-audit-lead (the contact form)
-- ============================================================

CREATE TABLE IF NOT EXISTS public.growth_audit_leads (
  id                  UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  full_name           TEXT NOT NULL,
  email               TEXT NOT NULL,
  company_name        TEXT NOT NULL,
  challenge           TEXT,               -- Optional free-text field
  status              lead_status NOT NULL DEFAULT 'new',
  ghl_contact_id      TEXT,               -- Populated after GHL sync
  assigned_to         UUID REFERENCES public.users(id),  -- Inner G team member
  submitted_at        TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at          TIMESTAMPTZ NOT NULL DEFAULT now()
);

DROP TRIGGER IF EXISTS growth_audit_leads_updated_at ON public.growth_audit_leads;
CREATE TRIGGER growth_audit_leads_updated_at
  BEFORE UPDATE ON public.growth_audit_leads
  FOR EACH ROW EXECUTE FUNCTION update_updated_at();

CREATE INDEX IF NOT EXISTS idx_growth_audit_leads_status ON public.growth_audit_leads(status, submitted_at DESC);
CREATE INDEX IF NOT EXISTS idx_growth_audit_leads_email ON public.growth_audit_leads(email);

COMMENT ON TABLE public.growth_audit_leads IS
  'Inbound leads from the marketing site Growth Audit contact form. Synced to GHL as contacts.';
COMMENT ON COLUMN public.growth_audit_leads.ghl_contact_id IS
  'Populated by submit-growth-audit-lead Edge Function after successful GHL contact creation.';
