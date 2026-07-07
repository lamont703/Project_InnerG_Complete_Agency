-- Tracks the matched U.S. Dept. of Education College Scorecard institution id
-- (their `id` field, an integer Unit ID / OPEID-adjacent identifier) per school
-- so re-syncs can hit the Scorecard API directly by id instead of re-running
-- fuzzy name+zip matching every time (cheaper, and immune to name-match drift
-- if a school's DBA name changes slightly in our own table).

ALTER TABLE public.agent_barber_school_leads
ADD COLUMN IF NOT EXISTS college_scorecard_id INTEGER,
ADD COLUMN IF NOT EXISTS college_scorecard_matched_at TIMESTAMPTZ;

ALTER TABLE public.agent_cosmetology_school_leads
ADD COLUMN IF NOT EXISTS college_scorecard_id INTEGER,
ADD COLUMN IF NOT EXISTS college_scorecard_matched_at TIMESTAMPTZ;

CREATE INDEX IF NOT EXISTS agent_barber_school_leads_scorecard_id_idx
  ON public.agent_barber_school_leads (college_scorecard_id);

CREATE INDEX IF NOT EXISTS agent_cosmetology_school_leads_scorecard_id_idx
  ON public.agent_cosmetology_school_leads (college_scorecard_id);
