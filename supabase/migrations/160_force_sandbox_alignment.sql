-- FINAL FIX: Force Sandbox Link for Test Portal
-- Overrides any previous mappings to ensure data isolation.

DO $$
DECLARE
    sandbox_id UUID;
    target_slug TEXT := 'test-barber-student';
BEGIN
    -- 1. Get the Sandbox ID
    SELECT id INTO sandbox_id 
    FROM public.barber_schools 
    WHERE name = 'ADI Sandbox Institute' 
    LIMIT 1;

    IF sandbox_id IS NOT NULL THEN
        -- 2. Force update the Project by SLUG (more reliable)
        UPDATE public.projects 
        SET school_id = sandbox_id 
        WHERE slug = target_slug;

        -- 3. Update all telemetry rows for this portal that were mis-mapped
        -- (Optional: cleanup mis-mapped data to Socorro or Capelli)
        UPDATE public.barber_exam_telemetry 
        SET school_id = sandbox_id 
        WHERE portal_slug = target_slug;

        RAISE NOTICE 'Project % and all related telemetry successfully forced to Sandbox %', target_slug, sandbox_id;
    ELSE
        RAISE EXCEPTION 'Sandbox Institute not found. Please run migration 159 first.';
    END IF;
END $$;
