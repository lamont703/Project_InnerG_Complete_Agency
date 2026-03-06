-- ============================================================
-- Migration 015: Fix RLS Policy Recursion and Missing Policies
-- Inner G Complete Agency — Client Intelligence Portal
-- ============================================================

-- 1. Redefine auth_role() to be more robust and explicitly bypass RLS
-- Using SECURITY DEFINER ensures it runs with the privileges of the owner (postgres)
-- and thus bypasses RLS on the users table.
CREATE OR REPLACE FUNCTION auth_role()
RETURNS user_role AS $$
DECLARE
  v_role user_role;
BEGIN
  SELECT role INTO v_role FROM public.users WHERE id = auth.uid();
  RETURN v_role;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = public STABLE;

-- 2. Fix recursion in public.clients policy
-- Removed the redundant JOIN to public.clients itself which caused the infinite loop.
DROP POLICY IF EXISTS clients_client_read ON public.clients;
CREATE POLICY clients_client_read ON public.clients FOR SELECT USING (
  auth_role() IN ('client_admin', 'client_viewer') AND 
  id IN (
    SELECT client_id 
    FROM public.projects p 
    JOIN public.project_user_access pua ON pua.project_id = p.id 
    WHERE pua.user_id = auth.uid()
  )
);

-- 3. Add missing policies for access tables (developer_client_access)
DROP POLICY IF EXISTS developer_client_access_read ON public.developer_client_access;
CREATE POLICY developer_client_access_read ON public.developer_client_access FOR SELECT USING (
  auth_role() = 'super_admin' OR developer_id = auth.uid()
);

DROP POLICY IF EXISTS developer_client_access_write ON public.developer_client_access;
CREATE POLICY developer_client_access_write ON public.developer_client_access FOR ALL USING (
  auth_role() = 'super_admin'
);

-- 4. Add missing policies for access tables (project_user_access)
DROP POLICY IF EXISTS project_user_access_read ON public.project_user_access;
CREATE POLICY project_user_access_read ON public.project_user_access FOR SELECT USING (
  auth_role() = 'super_admin' OR user_id = auth.uid()
);

DROP POLICY IF EXISTS project_user_access_write ON public.project_user_access;
CREATE POLICY project_user_access_write ON public.project_user_access FOR ALL USING (
  auth_role() IN ('super_admin', 'client_admin')
);
