-- Migration 157: Add school_id to projects
-- Ensures the student's portal architecture is directly linked to their institution.

ALTER TABLE public.projects 
ADD COLUMN IF NOT EXISTS school_id UUID REFERENCES public.barber_schools(id);

CREATE INDEX IF NOT EXISTS idx_projects_school_id ON public.projects(school_id);
