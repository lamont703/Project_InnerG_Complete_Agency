-- ============================================================
-- Migration 029: Unify Agency Sentinel Naming
-- Inner G Complete Agency — Client Intelligence Portal
-- ============================================================
-- Unifies the "God Mode" portal naming to 'innergcomplete'.
-- Previous migrations used 'agency-global', but the frontend
-- and business logic prefer 'innergcomplete'.
-- ============================================================

DO $$ 
DECLARE
    v_project_id UUID := '00000000-0000-0000-0000-000000000001';
BEGIN
    -- 1. If there's a project with slug 'innergcomplete' that is NOT our sentinel, move it out of the way
    UPDATE public.projects 
    SET slug = 'innergcomplete-old-' || substr(gen_random_uuid()::text, 1, 8)
    WHERE slug = 'innergcomplete' AND id <> v_project_id;

    -- 2. If there's a project with slug 'agency-global', move it to 'innergcomplete'
    -- This handles both cases: if ID matched or if only slug matched.
    UPDATE public.projects 
    SET 
        slug = 'innergcomplete',
        name = 'Inner G Complete Agency'
    WHERE id = v_project_id OR slug = 'agency-global';

    -- 3. Safety check: ensure the sentinel exists with correct info
    INSERT INTO public.projects (id, client_id, name, slug, type, status)
    VALUES (
        v_project_id, 
        '00000000-0000-0000-0000-000000000000', 
        'Inner G Complete Agency', 
        'innergcomplete', 
        'agency', 
        'active'
    )
    ON CONFLICT (id) DO UPDATE SET
        slug = 'innergcomplete',
        name = 'Inner G Complete Agency';

END $$;

COMMENT ON TABLE public.projects IS 'Unified agency sentinel at slug: innergcomplete';
