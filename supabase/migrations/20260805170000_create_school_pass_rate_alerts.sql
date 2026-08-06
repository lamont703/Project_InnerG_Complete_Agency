-- ============================================================
-- school_pass_rate_alerts
-- ============================================================
-- Capture at the moment the directory succeeds, not before it.
--
-- In 90 days, 474 visitors clicked through from an entity page to the
-- business's own site or phone. Three of them ever came back. 243 of those
-- clicks were on school pages — students and parents about to contact a
-- school, leaving with the one thing we hold and they cannot get anywhere
-- else: whether that school's students actually pass the state exam.
--
-- So this fires AFTER the outbound click, never before it. Gating a phone
-- number behind an email would buy a few addresses and destroy the reason
-- anyone trusts the listings.
--
-- school_id is the point of the table. A generic newsletter signup would
-- lose which school they care about, which is the only thing that makes the
-- follow-up worth sending.
-- ============================================================

CREATE TABLE IF NOT EXISTS public.school_pass_rate_alerts (
  id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  email           TEXT NOT NULL,
  -- Not a foreign key on purpose: schools live across two tables
  -- (barber_cosmetology_schools and the cosmetology set), and a constraint
  -- against one of them would reject half the directory.
  school_id       UUID NOT NULL,
  school_name     TEXT,
  school_slug     TEXT,
  -- TX or CA. Decides which board's results they get when those publish.
  exam_state      TEXT,
  source          TEXT DEFAULT 'school_outbound',
  ghl_contact_id  TEXT,
  ghl_synced      BOOLEAN NOT NULL DEFAULT FALSE,
  created_at      TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- One person, one school, once. Re-submitting is a no-op rather than a
-- duplicate send later.
CREATE UNIQUE INDEX IF NOT EXISTS school_pass_rate_alerts_email_school_idx
  ON public.school_pass_rate_alerts (lower(email), school_id);

CREATE INDEX IF NOT EXISTS school_pass_rate_alerts_school_idx
  ON public.school_pass_rate_alerts (school_id);
CREATE INDEX IF NOT EXISTS school_pass_rate_alerts_created_idx
  ON public.school_pass_rate_alerts (created_at DESC);

-- RLS on with no public INSERT policy. Writes come from /api/school-alerts
-- using the service role, which bypasses RLS. The older
-- cosmetology_prep_waitlist granted `TO public ... WITH CHECK (true)`, which
-- lets anyone POST straight at PostgREST and fill the table; this does not
-- repeat that.
ALTER TABLE public.school_pass_rate_alerts ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS school_pass_rate_alerts_team_only ON public.school_pass_rate_alerts;
CREATE POLICY school_pass_rate_alerts_team_only ON public.school_pass_rate_alerts
  FOR ALL USING (is_inner_g_team());

COMMENT ON TABLE public.school_pass_rate_alerts IS
  'Students who asked to be told when a specific school''s next-year exam pass rates publish. Captured after an outbound click on a school page. Written by /api/school-alerts (service role) and mirrored to GHL.';
