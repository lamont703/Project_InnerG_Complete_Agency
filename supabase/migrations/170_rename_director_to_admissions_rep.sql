-- supabase/migrations/170_rename_director_to_admissions_rep.sql
-- Rename director_name to admissions_rep_name in agent_barber_school_leads

ALTER TABLE public.agent_barber_school_leads
  RENAME COLUMN director_name TO admissions_rep_name;
