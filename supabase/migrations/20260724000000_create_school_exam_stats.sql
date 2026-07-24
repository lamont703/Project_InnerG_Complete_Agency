-- Normalized per-school licensing-exam outcomes across states, regulators,
-- years, and reporting periods. This is the successor to the state-specific,
-- year-suffixed pass-rate columns on agent_barber_school_leads /
-- agent_cosmetology_school_leads (written_pass_rate_2026, etc.), which
-- conflate incompatible methodologies the moment a second state with different
-- reporting is added.
--
-- Texas (TDLR): per-student rosters aggregated to annual written + practical
-- rates, on both a first-attempt and ever-passed basis.
-- California (BBC): per-school aggregates published quarterly, written exam,
-- first-time test-takers only.
--
-- Both land here without being blended, because the exact shape of each stat
-- is fully described by (state, test_type, attempt_basis, license_type,
-- period_label) — so a CA first-time-written-quarterly number is never
-- mistaken for a TX ever-passed-annual number.
CREATE TABLE IF NOT EXISTS public.school_exam_stats (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),

  -- Link to our own school entity. Nullable = a school the regulator publishes
  -- results for that we don't track as an entity yet (a stub-seed candidate).
  -- Polymorphic across the two school tables, same pattern as
  -- agent_barber_student_leads.matched_school_id / matched_school_type.
  school_id UUID,
  school_type TEXT CHECK (school_type IN ('barber', 'cosmetology')),
  match_confidence TEXT, -- 'exact' | 'fuzzy' | 'unmatched'

  -- Provenance + scope of this stat.
  state TEXT NOT NULL,                            -- 'TX' | 'CA'
  regulator TEXT,                                 -- 'TDLR' | 'BBC'
  exam_year INTEGER NOT NULL,
  period_label TEXT NOT NULL,                     -- 'Full Year 2026' | 'Q1 2026'
  test_type TEXT NOT NULL,                        -- 'written' | 'practical'
  attempt_basis TEXT NOT NULL,                    -- 'first_time' | 'first_attempt' | 'ever_passed'
  program_path TEXT NOT NULL DEFAULT 'school',    -- 'school' | 'apprentice'
  license_type TEXT NOT NULL,                     -- 'cosmetology' | 'barber' | 'combined' | 'esthetics' | 'manicuring'

  -- The numbers.
  pass_count INTEGER,
  fail_count INTEGER,
  test_takers INTEGER,
  pass_rate NUMERIC, -- 0..1

  -- Raw roster identity — drives entity matching and re-ingest idempotency.
  -- source_city defaults to '' (not NULL) so the unique key below dedups
  -- correctly for files that carry no city column (the apprentice roster).
  source_school_name TEXT NOT NULL,
  source_city TEXT NOT NULL DEFAULT '',
  source_pdf TEXT,

  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),

  -- A published roster row is uniquely identified by its scope + raw school
  -- name/city, so re-running an import upserts in place instead of duplicating.
  CONSTRAINT school_exam_stats_natural_key UNIQUE
    (state, license_type, program_path, test_type, attempt_basis, period_label, source_school_name, source_city)
);

CREATE INDEX IF NOT EXISTS school_exam_stats_school_idx
  ON public.school_exam_stats (school_id, school_type);
CREATE INDEX IF NOT EXISTS school_exam_stats_scope_idx
  ON public.school_exam_stats (state, period_label, license_type);
CREATE INDEX IF NOT EXISTS school_exam_stats_source_name_idx
  ON public.school_exam_stats (source_school_name);

ALTER TABLE public.school_exam_stats ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Allow public read access to school_exam_stats"
  ON public.school_exam_stats FOR SELECT USING (true);

CREATE POLICY "Allow service role full access to school_exam_stats"
  ON public.school_exam_stats FOR ALL TO service_role USING (true) WITH CHECK (true);
