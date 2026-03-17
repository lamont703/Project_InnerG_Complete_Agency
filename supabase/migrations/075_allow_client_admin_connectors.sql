-- ============================================================
-- Migration 075: Allow Client Admin to Manage Connectors
-- Inner G Complete Agency — Client Intelligence Portal
-- ============================================================
-- Updates RLS on client_db_connections to allow client_admin 
-- to create and manage data bridges for their own projects.
-- ============================================================

-- 1. Remove the restrictive team-only policy
DROP POLICY IF EXISTS client_db_connections_team_only ON public.client_db_connections;

-- 2. Create Super Admin / Developer Policy (Full Access)
CREATE POLICY client_db_connections_team_manage ON public.client_db_connections
  FOR ALL USING (is_inner_g_team());

-- 3. Create Client Admin Policy (Project-Scoped Access)
-- Allowing SELECT, INSERT, UPDATE, and DELETE for their own projects
CREATE POLICY client_db_connections_admin_manage ON public.client_db_connections
  FOR ALL USING (
    auth_role() = 'client_admin' 
    AND (
      project_id IN (SELECT project_id FROM public.project_user_access WHERE user_id = auth.uid())
      OR client_id IN (
        SELECT p.client_id 
        FROM public.projects p 
        JOIN public.project_user_access pua ON pua.project_id = p.id 
        WHERE pua.user_id = auth.uid()
      )
    )
  );

-- 4. Create Client Viewer Policy (Read-Only)
CREATE POLICY client_db_connections_viewer_read ON public.client_db_connections
  FOR SELECT USING (
    auth_role() = 'client_viewer'
    AND project_id IN (SELECT project_id FROM public.project_user_access WHERE user_id = auth.uid())
  );
