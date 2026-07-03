-- Texas Cosmetology Operator student exam records (TDLR Pass/Fail rosters),
-- mirroring agent_barber_student_leads exactly, but for the "TX Operator"
-- exam rather than "TX Class A Barber". Kept as a separate table (rather
-- than merging into agent_barber_student_leads with an exam-type column)
-- because it's a genuinely different license/exam, and dual-licensed
-- schools need both populations tracked independently — see
-- matched_school_type below for the same dual-table linkage barber uses.
--
-- One row per test attempt. matched_school_id has no FK constraint since it
-- can point at either agent_cosmetology_school_leads or
-- agent_barber_school_leads (matched_school_type disambiguates which).
CREATE TABLE IF NOT EXISTS public.agent_cosmetology_student_leads (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),

    -- Source identity (from the TDLR roster)
    school_code TEXT NOT NULL,
    school_name TEXT NOT NULL,
    last_name TEXT NOT NULL,
    first_name TEXT NOT NULL,
    student_key TEXT NOT NULL, -- normalized school_code|last_name|first_name, groups a student's attempts

    -- Relationship graph link (polymorphic — see comment above)
    matched_school_id UUID,
    matched_school_type TEXT CHECK (matched_school_type IN ('barber', 'cosmetology')),
    school_match_confidence TEXT, -- 'exact' | 'fuzzy' | 'unmatched'

    -- Exam attempt details
    test_type TEXT NOT NULL CHECK (test_type IN ('Written', 'Practical')),
    exam_year INTEGER NOT NULL DEFAULT 2026,
    test_date DATE NOT NULL,
    result TEXT NOT NULL CHECK (result IN ('PASS', 'FAIL')),
    score NUMERIC NOT NULL,
    attempt_number INTEGER NOT NULL DEFAULT 1,
    is_latest_attempt BOOLEAN NOT NULL DEFAULT TRUE,

    source_pdf TEXT,

    -- Semantic search / relationship-graph querying
    embedding vector(768),

    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW(),

    CONSTRAINT unique_cosmetology_student_attempt UNIQUE (school_code, last_name, first_name, test_type, test_date, score)
);

ALTER TABLE public.agent_cosmetology_student_leads ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Allow public read access to agent_cosmetology_student_leads"
  ON public.agent_cosmetology_student_leads FOR SELECT USING (true);

CREATE POLICY "Allow service role full access to agent_cosmetology_student_leads"
  ON public.agent_cosmetology_student_leads FOR ALL TO service_role USING (true) WITH CHECK (true);

CREATE INDEX IF NOT EXISTS agent_cosmetology_student_leads_embedding_idx
  ON public.agent_cosmetology_student_leads
  USING hnsw (embedding vector_cosine_ops);

CREATE INDEX IF NOT EXISTS agent_cosmetology_student_leads_school_code_idx
  ON public.agent_cosmetology_student_leads (school_code);

CREATE INDEX IF NOT EXISTS agent_cosmetology_student_leads_matched_school_idx
  ON public.agent_cosmetology_student_leads (matched_school_id);

CREATE INDEX IF NOT EXISTS agent_cosmetology_student_leads_student_key_idx
  ON public.agent_cosmetology_student_leads (student_key);

-- Distinct "Cosmetology Operator" exam pass-rate/leaderboard columns on both
-- school tables — kept separate from the existing written_pass_rate_2026 /
-- practical_pass_rate_2026 / school_leaderboard_score_2026 columns (which
-- are Barber-exam-specific) so a dual-licensed school's two exam
-- populations don't overwrite or blend into one misleading number.
ALTER TABLE public.agent_barber_school_leads
ADD COLUMN IF NOT EXISTS cosmetology_written_pass_rate_2026 NUMERIC,
ADD COLUMN IF NOT EXISTS cosmetology_written_test_takers_2026 INTEGER,
ADD COLUMN IF NOT EXISTS cosmetology_practical_pass_rate_2026 NUMERIC,
ADD COLUMN IF NOT EXISTS cosmetology_practical_test_takers_2026 INTEGER,
ADD COLUMN IF NOT EXISTS cosmetology_written_first_attempt_pass_rate_2026 NUMERIC,
ADD COLUMN IF NOT EXISTS cosmetology_written_avg_attempts_to_pass_2026 NUMERIC,
ADD COLUMN IF NOT EXISTS cosmetology_school_leaderboard_score_2026 NUMERIC,
ADD COLUMN IF NOT EXISTS cosmetology_pass_rates_2026_updated_at TIMESTAMPTZ;

ALTER TABLE public.agent_cosmetology_school_leads
ADD COLUMN IF NOT EXISTS cosmetology_written_pass_rate_2026 NUMERIC,
ADD COLUMN IF NOT EXISTS cosmetology_written_test_takers_2026 INTEGER,
ADD COLUMN IF NOT EXISTS cosmetology_practical_pass_rate_2026 NUMERIC,
ADD COLUMN IF NOT EXISTS cosmetology_practical_test_takers_2026 INTEGER,
ADD COLUMN IF NOT EXISTS cosmetology_written_first_attempt_pass_rate_2026 NUMERIC,
ADD COLUMN IF NOT EXISTS cosmetology_written_avg_attempts_to_pass_2026 NUMERIC,
ADD COLUMN IF NOT EXISTS cosmetology_school_leaderboard_score_2026 NUMERIC,
ADD COLUMN IF NOT EXISTS cosmetology_pass_rates_2026_updated_at TIMESTAMPTZ;
