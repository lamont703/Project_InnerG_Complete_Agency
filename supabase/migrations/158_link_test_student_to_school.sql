-- Update Script: Link Test Barber Student to Socorro High School
-- Aligns the test portal with the El Paso "Red Zone" for telemetry testing.

DO $$
DECLARE
    target_school_id UUID;
    target_project_id UUID := 'e782837d-102d-49ad-becf-0bd928cbdcb9';
BEGIN
    -- 1. Get the ID for Socorro High School
    SELECT id INTO target_school_id 
    FROM public.barber_schools 
    WHERE name = 'Socorro High School' 
    LIMIT 1;

    IF target_school_id IS NOT NULL THEN
        -- 2. Update the Project
        UPDATE public.projects 
        SET school_id = target_school_id 
        WHERE id = target_project_id;

        -- 3. Update any corresponding Registrations (optional but good for consistency)
        UPDATE public.barber_registrations 
        SET school_id = target_school_id 
        WHERE project_id = target_project_id;

        RAISE NOTICE 'Project % successfully linked to School % (Socorro High School)', target_project_id, target_school_id;
    ELSE
        RAISE EXCEPTION 'Socorro High School not found in barber_schools table. Please ensure migration 156 has been applied.';
    END IF;
END $$;
