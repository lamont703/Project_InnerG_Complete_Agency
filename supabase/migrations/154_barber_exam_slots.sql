-- Migration 098: Seed Barber Exam Slot Entitlements
-- Aligns the student portal metrics with the official exam outline.

DO $$
DECLARE
    project_rec RECORD;
BEGIN
    -- Loop through ALL projects of type 'barber_student'
    FOR project_rec IN 
        SELECT id FROM public.projects WHERE type = 'barber_student'
    LOOP
        -- 1. Remove old legacy slots
        DELETE FROM public.project_slot_entitlements 
        WHERE project_id = project_rec.id 
        AND slot_id IN (
            'chemical_services_mastery', 
            'infection_control_mastery', 
            'anatomy_physiology_mastery', 
            'state_law_regulation_mastery'
        );

        -- 2. Provision the full high-fidelity diagnostic bundle
        INSERT INTO public.project_slot_entitlements (project_id, slot_id)
        VALUES
            (project_rec.id, 'board_readiness_index'),
            (project_rec.id, 'pass_probability'),
            (project_rec.id, 'protected_career_wages'),
            (project_rec.id, 'syntax_mastery_accuracy'),
            (project_rec.id, 'naccas_compliance_buffer'),
            (project_rec.id, 'barber_licensing_mastery'),
            (project_rec.id, 'barber_health_safety_mastery'),
            (project_rec.id, 'barber_hair_scalp_care_mastery'),
            (project_rec.id, 'barber_haircutting_styling_mastery'),
            (project_rec.id, 'barber_haircoloring_mastery'),
            (project_rec.id, 'barber_chemical_texture_mastery'),
            (project_rec.id, 'barber_nail_skin_care_mastery'),
            (project_rec.id, 'barber_shaving_mastery')
        ON CONFLICT (project_id, slot_id) DO NOTHING;
    END LOOP;
END $$;
