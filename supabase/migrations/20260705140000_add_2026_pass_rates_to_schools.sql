-- 2026 written/practical pass rates computed from the TDLR exam roster
-- (agent_barber_student_leads), per school, per test type. Rates are based
-- on each student's latest attempt (their ultimate outcome), not every
-- individual attempt, so a school isn't penalized for students who
-- eventually passed after a retake.
ALTER TABLE public.agent_barber_school_leads
ADD COLUMN IF NOT EXISTS written_pass_rate_2026 NUMERIC,
ADD COLUMN IF NOT EXISTS written_test_takers_2026 INTEGER,
ADD COLUMN IF NOT EXISTS practical_pass_rate_2026 NUMERIC,
ADD COLUMN IF NOT EXISTS practical_test_takers_2026 INTEGER,
ADD COLUMN IF NOT EXISTS pass_rates_2026_updated_at TIMESTAMPTZ;

ALTER TABLE public.agent_cosmetology_school_leads
ADD COLUMN IF NOT EXISTS written_pass_rate_2026 NUMERIC,
ADD COLUMN IF NOT EXISTS written_test_takers_2026 INTEGER,
ADD COLUMN IF NOT EXISTS practical_pass_rate_2026 NUMERIC,
ADD COLUMN IF NOT EXISTS practical_test_takers_2026 INTEGER,
ADD COLUMN IF NOT EXISTS pass_rates_2026_updated_at TIMESTAMPTZ;
