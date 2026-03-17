-- Migration 081: Rename Sentinel Slug
-- Synchronize database with codebase fallback 'innergcomplete'

UPDATE public.projects 
SET slug = 'innergcomplete' 
WHERE id = '00000000-0000-0000-0000-000000000001'
OR slug = 'agency-global';

-- Update RLS policy to allow the new slug
DROP POLICY IF EXISTS projects_read_sentinel ON public.projects;
CREATE POLICY projects_read_sentinel 
  ON public.projects FOR SELECT 
  USING (slug IN ('innergcomplete', 'agency-global') AND auth.role() = 'authenticated');
