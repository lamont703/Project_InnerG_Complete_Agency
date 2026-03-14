-- ============================================================
-- Migration 061: Allow Clients to Read Assigned Connectors
-- Inner G Complete Agency — Client Intelligence Portal
-- ============================================================
-- Enables clients to view the status and configuration (non-sensitive)
-- of the data bridges assigned to their project.
-- ============================================================

-- Add SELECT policy for clients on client_db_connections
-- This uses the can_access_project() helper to ensure they only see
-- connections assigned to projects they are authorized to view.

DROP POLICY IF EXISTS client_db_connections_read ON public.client_db_connections;
CREATE POLICY client_db_connections_read ON public.client_db_connections
  FOR SELECT USING (
    can_access_project(project_id)
  );

-- Note: The existing 'client_db_connections_team_only' policy remains 
-- for ALL (Insert/Update/Delete), which keeps bridge management
-- restricted to super_admin and developer roles.
