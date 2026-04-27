-- ============================================================
-- Migration 142: Expand RLS for Barbering Personas
-- ============================================================

-- 1. Update PROJECTS policy to include barbering roles
DROP POLICY IF EXISTS projects_client_read ON public.projects;
CREATE POLICY projects_client_read ON public.projects 
  FOR SELECT USING (
    auth_role() IN ('client_admin', 'client_viewer', 'student', 'instructor', 'owner') 
    AND id IN (SELECT project_id FROM public.project_user_access WHERE user_id = auth.uid())
  );

-- 2. Update CLIENTS policy to include barbering roles
DROP POLICY IF EXISTS clients_client_read ON public.clients;
CREATE POLICY clients_client_read ON public.clients 
  FOR SELECT USING (
    auth_role() IN ('client_admin', 'client_viewer', 'student', 'instructor', 'owner') 
    AND id IN (
      SELECT c.id FROM public.clients c 
      JOIN public.projects p ON p.client_id = c.id 
      JOIN public.project_user_access pua ON pua.project_id = p.id 
      WHERE pua.user_id = auth.uid()
    )
  );

-- 3. Ensure users can read their own profiles (covers student/instructor roles)
DROP POLICY IF EXISTS users_self_read ON public.users;
CREATE POLICY users_self_read ON public.users 
  FOR SELECT USING (id = auth.uid());
