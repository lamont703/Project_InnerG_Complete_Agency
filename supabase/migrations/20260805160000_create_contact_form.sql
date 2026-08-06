-- ============================================================
-- contact_form — replaces growth_audit_leads
-- ============================================================
-- growth_audit_leads was built for the agency business: it required
-- budget_range, project_stage, project_type and project_url, which is a
-- qualification form for consulting work. The site now sells a compliance
-- binder to barber and cosmetology schools, and asking one of them for a
-- budget range before they have seen a single check is how a form gets
-- abandoned. It held one row in four months and that row was
-- testcase@test.com.
--
-- Nothing live depended on it. The homepage CtaSection that posted to it is
-- commented out in app/page.tsx (verified against production — none of its
-- fields render), and /contact never called it at all: that page's submit
-- handler awaited a 1500ms timer and showed a success message without
-- sending anything anywhere.
--
-- This table is deliberately small. Every field a form asks for costs
-- conversions, and the only things needed to start a conversation are who,
-- how to reach them, and what they want.
-- ============================================================

CREATE TABLE IF NOT EXISTS public.contact_form (
  id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name            TEXT NOT NULL,
  email           TEXT NOT NULL,
  -- Optional on purpose: a shop owner enquiring for themselves has no
  -- organisation to name, and a required field there loses them.
  business_name   TEXT,
  phone           TEXT,
  message         TEXT,
  -- Which page earned the submission. Mirrors the data-ig-click labels on
  -- the CTAs (binder, compliance, penalties, states, contact_page) so a lead
  -- can be traced back to the content that produced it without joining
  -- against pixel events.
  source          TEXT,
  status          lead_status NOT NULL DEFAULT 'new',
  ghl_contact_id  TEXT,
  ghl_synced      BOOLEAN NOT NULL DEFAULT FALSE,
  created_at      TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at      TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS contact_form_created_at_idx ON public.contact_form (created_at DESC);
CREATE INDEX IF NOT EXISTS contact_form_source_idx ON public.contact_form (source);

DROP TRIGGER IF EXISTS contact_form_updated_at ON public.contact_form;
CREATE TRIGGER contact_form_updated_at
  BEFORE UPDATE ON public.contact_form
  FOR EACH ROW EXECUTE FUNCTION update_updated_at();

-- RLS on, team-only, matching what growth_audit_leads had. Writes come from
-- /api/contact using the service role, which bypasses RLS — so the absence of
-- an INSERT policy for anon is the point, not an oversight. A submission
-- cannot be forged straight against PostgREST.
ALTER TABLE public.contact_form ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS contact_form_team_only ON public.contact_form;
CREATE POLICY contact_form_team_only ON public.contact_form
  FOR ALL USING (is_inner_g_team());

COMMENT ON TABLE public.contact_form IS
  'Website contact submissions. Written by /api/contact (service role) and mirrored to GHL. Replaced growth_audit_leads 2026-08-05.';

-- ============================================================
-- Retire growth_audit_leads
-- ============================================================
-- Dropped rather than left behind: an unused table with an RLS policy and a
-- formatter branch still pointing at it is a thing the next person has to
-- work out. Its one row was a test record.
--
-- The lead_status enum stays — contact_form above uses it.
DROP TABLE IF EXISTS public.growth_audit_leads;
