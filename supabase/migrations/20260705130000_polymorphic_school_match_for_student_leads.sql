-- Some schools in the TDLR barber exam roster turn out to already be tracked
-- in agent_cosmetology_school_leads (dual-licensed barber+cosmetology
-- schools), not agent_barber_school_leads. matched_school_id needs to be
-- able to point at either table, which a single FK constraint can't express,
-- so we drop the FK and add matched_school_type to disambiguate.
ALTER TABLE public.agent_barber_student_leads
  DROP CONSTRAINT IF EXISTS agent_barber_student_leads_matched_school_id_fkey;

ALTER TABLE public.agent_barber_student_leads
  ADD COLUMN IF NOT EXISTS matched_school_type TEXT CHECK (matched_school_type IN ('barber', 'cosmetology'));
