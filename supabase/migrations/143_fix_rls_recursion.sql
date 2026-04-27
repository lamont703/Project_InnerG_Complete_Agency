-- ============================================================
-- Migration 143: Fix RLS Recursion in Clients Table
-- ============================================================

-- 1. Redefine CLIENTS policy to avoid self-referencing joins (breaks recursion)
DROP POLICY IF EXISTS clients_client_read ON public.clients;
CREATE POLICY clients_client_read ON public.clients 
  FOR SELECT USING (
    EXISTS (
      SELECT 1 FROM public.projects p
      JOIN public.project_user_access pua ON pua.project_id = p.id
      WHERE p.client_id = public.clients.id -- Reference the outer table id directly
      AND pua.user_id = auth.uid()
    )
  );

-- 2. Verify PROJECTS policy (already safe, but confirming linear path)
DROP POLICY IF EXISTS projects_client_read ON public.projects;
CREATE POLICY projects_client_read ON public.projects 
  FOR SELECT USING (
    EXISTS (
      SELECT 1 FROM public.project_user_access pua 
      WHERE pua.project_id = public.projects.id 
      AND pua.user_id = auth.uid()
    )
    OR auth_role() IN ('super_admin', 'developer')
  );
