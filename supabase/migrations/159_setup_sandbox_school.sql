-- Migration 159: Create Dummy School for Testing
-- Prevents test telemetry from distorting real institutional analytics.

DO $$
DECLARE
    dummy_school_id UUID;
    target_project_id UUID := 'e782837d-102d-49ad-becf-0bd928cbdcb9';
BEGIN
    -- 1. Create the Dummy School if it doesn't exist
    INSERT INTO public.barber_schools (name, city, failure_rate_institutional, is_red_zone)
    VALUES ('ADI Sandbox Institute', 'CYBERSPACE', 0.00, false)
    ON CONFLICT (name, city) DO UPDATE SET last_sync_at = now()
    RETURNING id INTO dummy_school_id;

    -- 2. Link the Test Project to the Dummy School
    UPDATE public.projects 
    SET school_id = dummy_school_id 
    WHERE id = target_project_id;

    -- 3. Update any corresponding Registrations
    UPDATE public.barber_registrations 
    SET school_id = dummy_school_id 
    WHERE project_id = target_project_id;

    RAISE NOTICE 'Test Project % successfully redirected to Sandbox School % (ADI Sandbox Institute)', target_project_id, dummy_school_id;
END $$;
