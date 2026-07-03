-- Supports the 2026 Texas Barber & Cosmetology School Leaderboard, which
-- replaces the old multi-year historical-performance/benchmarking tools.
-- These are inferred metrics computed from our own agent_barber_student_leads
-- data (not available from Google or the raw TDLR roster):
--   - written_first_attempt_pass_rate_2026: % of a school's written-exam
--     students who passed on their very first try (a stronger "how well do
--     they prepare people" signal than the ultimate pass rate, which retakes
--     can inflate).
--   - written_avg_attempts_to_pass_2026: among students who did pass, how
--     many tries it typically took (retest burden).
--   - school_leaderboard_score_2026: single blended 0-100 score used as the
--     leaderboard's default sort.
ALTER TABLE public.agent_barber_school_leads
ADD COLUMN IF NOT EXISTS written_first_attempt_pass_rate_2026 NUMERIC,
ADD COLUMN IF NOT EXISTS written_avg_attempts_to_pass_2026 NUMERIC,
ADD COLUMN IF NOT EXISTS school_leaderboard_score_2026 NUMERIC;

ALTER TABLE public.agent_cosmetology_school_leads
ADD COLUMN IF NOT EXISTS written_first_attempt_pass_rate_2026 NUMERIC,
ADD COLUMN IF NOT EXISTS written_avg_attempts_to_pass_2026 NUMERIC,
ADD COLUMN IF NOT EXISTS school_leaderboard_score_2026 NUMERIC;
