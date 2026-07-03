-- Texas barber student exam records (TDLR Pass/Fail rosters), one row per
-- test attempt. Barbers must pass two separate exams (Written + Practical),
-- and students commonly retake either one, so attempts are stored
-- individually rather than collapsed to a single "student" row. A student
-- is really the (school_code, last_name, first_name) tuple, identified here
-- via student_key, with attempt_number/is_latest_attempt derived per
-- (student, test_type). matched_school_id links each record to our own
-- agent_barber_school_leads table where a confident name match was found,
-- forming the backbone of the student<->school relationship graph.
CREATE TABLE IF NOT EXISTS public.agent_barber_student_leads (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),

    -- Source identity (from the TDLR roster)
    school_code TEXT NOT NULL,
    school_name TEXT NOT NULL,
    last_name TEXT NOT NULL,
    first_name TEXT NOT NULL,
    student_key TEXT NOT NULL, -- normalized school_code|last_name|first_name, groups a student's attempts

    -- Relationship graph link
    matched_school_id UUID REFERENCES public.agent_barber_school_leads(id),
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

    CONSTRAINT unique_student_attempt UNIQUE (school_code, last_name, first_name, test_type, test_date, score)
);

ALTER TABLE public.agent_barber_student_leads ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Allow public read access to agent_barber_student_leads"
  ON public.agent_barber_student_leads FOR SELECT USING (true);

CREATE POLICY "Allow service role full access to agent_barber_student_leads"
  ON public.agent_barber_student_leads FOR ALL TO service_role USING (true) WITH CHECK (true);

CREATE INDEX IF NOT EXISTS agent_barber_student_leads_embedding_idx
  ON public.agent_barber_student_leads
  USING hnsw (embedding vector_cosine_ops);

CREATE INDEX IF NOT EXISTS agent_barber_student_leads_school_code_idx
  ON public.agent_barber_student_leads (school_code);

CREATE INDEX IF NOT EXISTS agent_barber_student_leads_matched_school_idx
  ON public.agent_barber_student_leads (matched_school_id);

CREATE INDEX IF NOT EXISTS agent_barber_student_leads_student_key_idx
  ON public.agent_barber_student_leads (student_key);
