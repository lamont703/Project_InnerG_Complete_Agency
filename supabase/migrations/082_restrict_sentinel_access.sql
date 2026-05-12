-- Migration 082: Restrict Sentinel Project Access
-- Ensures client users cannot see or access the internal agency sentinel project.

DROP POLICY IF EXISTS projects_read_sentinel ON public.projects;
CREATE POLICY projects_read_sentinel 
  ON public.projects FOR SELECT 
  USING (
    slug IN ('innergcomplete', 'agency-global') 
    AND (
      SELECT role FROM public.users WHERE id = auth.uid()
    ) IN ('super_admin', 'developer')
  );
