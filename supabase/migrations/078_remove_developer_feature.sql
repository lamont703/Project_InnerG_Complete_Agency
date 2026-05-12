-- Migration 078: Remove Developer Feature and Obsolete Tables
-- Inner G Complete Agency — Client Intelligence Portal

-- 1. Drop the obsolete table
DROP TABLE IF EXISTS public.developer_client_access CASCADE;

-- 2. Revise is_inner_g_team() to only include super_admin
CREATE OR REPLACE FUNCTION is_inner_g_team()
RETURNS BOOLEAN AS $$
  SELECT auth_role() IN ('super_admin')
$$ LANGUAGE SQL SECURITY DEFINER STABLE;

-- 3. Revise can_access_project() to remove developer check
CREATE OR REPLACE FUNCTION can_access_project(p_project_id UUID)
RETURNS BOOLEAN AS $$
  SELECT CASE auth_role()
    WHEN 'super_admin' THEN TRUE
    -- Developer branch is removed as part of feature deletion
    ELSE  -- client_admin, client_viewer
      EXISTS (
        SELECT 1 FROM public.project_user_access pua
        WHERE pua.project_id = p_project_id AND pua.user_id = auth.uid()
      )
  END
$$ LANGUAGE SQL SECURITY DEFINER STABLE;

-- 4. Update existing RLS policies that used developer role
-- (Most already use is_inner_g_team() or can_access_project())

-- Update developers_read policy on clients and projects if they exist
DROP POLICY IF EXISTS clients_developer_read ON public.clients;
DROP POLICY IF EXISTS projects_developer_read ON public.projects;

-- Note: We are keeping the 'developer' role in the user_role enum for now
-- to avoid breaking existing user records, but it will no longer grant
-- access to anything specifically via developer_client_access.
