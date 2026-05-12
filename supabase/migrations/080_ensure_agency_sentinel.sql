-- Migration 080: Ensure Agency Sentinel Project
-- Final fail-safe for global metrics and chat resolution

DO $$
DECLARE
    v_client_id UUID := '00000000-0000-0000-0000-000000000000';
    v_project_id UUID := '00000000-0000-0000-0000-000000000001';
BEGIN
    -- 1. Ensure the Internal Agency Client exists
    INSERT INTO public.clients (id, name, industry, status, notes)
    VALUES (v_client_id, 'Inner G Complete Agency', 'other', 'active', 'Internal agency entity for global operations.')
    ON CONFLICT (id) DO UPDATE SET 
        name = EXCLUDED.name,
        status = EXCLUDED.status;

    -- 2. Ensure the Agency Sentinel Project exists
    INSERT INTO public.projects (id, client_id, name, slug, type, status)
    VALUES (
        v_project_id, 
        v_client_id, 
        'Agency Global Intelligence', 
        'agency-global', 
        'agency', 
        'active'
    )
    ON CONFLICT (id) DO UPDATE SET
        slug = EXCLUDED.slug,
        status = EXCLUDED.status;

    -- 3. Diagnostic: Check if row exists now
    IF EXISTS (SELECT 1 FROM public.projects WHERE slug = 'agency-global') THEN
        RAISE NOTICE 'Agency Sentinel verified: %, slug: agency-global', v_project_id;
    ELSE
        RAISE EXCEPTION 'Agency Sentinel insertion FAILED';
    END IF;
END $$;

-- 4. Open up READ access for 'agency-global' to all authenticated users
-- This prevents the "FAILED to resolve project" error for team members who might not be super_admins
DROP POLICY IF EXISTS projects_read_sentinel ON public.projects;
CREATE POLICY projects_read_sentinel 
  ON public.projects FOR SELECT 
  USING (slug = 'agency-global' AND auth.role() = 'authenticated');
