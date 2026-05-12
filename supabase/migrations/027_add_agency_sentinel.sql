-- ============================================================
-- Migration 027: Add Agency Sentinel Project
-- Inner G Complete Agency — Client Intelligence Portal
-- ============================================================
-- Creates the sentinel client and project used for agency-wide
-- chat sessions, token tracking, and global signals.
-- ============================================================

DO $$
DECLARE
    v_client_id UUID := '00000000-0000-0000-0000-000000000000';
    v_project_id UUID := '00000000-0000-0000-0000-000000000001';
BEGIN
    -- 1. Create the Internal Agency Client if not exists
    INSERT INTO public.clients (id, name, industry, status, notes)
    VALUES (v_client_id, 'Inner G Complete Agency', 'other', 'active', 'Internal agency entity for global operations.')
    ON CONFLICT (id) DO NOTHING;

    -- 2. Create the Agency Sentinel Project if not exists
    INSERT INTO public.projects (id, client_id, name, slug, type, status)
    VALUES (
        v_project_id, 
        v_client_id, 
        'Agency Global Intelligence', 
        'agency-global', 
        'agency', 
        'active'
    )
    ON CONFLICT (id) DO NOTHING;

    RAISE NOTICE 'Agency Sentinel initialized: %', v_project_id;
END $$;
