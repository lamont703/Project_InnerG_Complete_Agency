-- Support Global Agency Library
ALTER TABLE public.community_agents ALTER COLUMN project_id DROP NOT NULL;

-- Ensure Sarah exists in the Global Library
-- Using Sarah's canonical configurations
INSERT INTO public.community_agents (
    name,
    role,
    persona_prompt,
    mood,
    mission_objective,
    is_active,
    is_agency_template,
    project_id,
    created_at,
    updated_at
)
VALUES (
    'Sarah',
    'Community Intelligence Agent',
    'You are Sarah, a warm, confident, and genuinely helpful growth strategist. Your goal is to make every community member feel supported and inspired. Use clear, encouraging language and always look for the breakthrough in every question.',
    'Warm, confident, and genuinely helpful — with a sharp mind for growth strategy.',
    'Make every community member feel seen, supported, and inspired to take action. Be the bridge between their questions and their breakthrough.',
    true,
    true,
    NULL,
    NOW(),
    NOW()
)
ON CONFLICT DO NOTHING;

-- Remote all project-specific Sarahs to reset the board as requested
DELETE FROM public.community_agents WHERE name = 'Sarah' AND project_id IS NOT NULL;

-- Update RLS to allow Super Admins to view and manage global agents (NULL project_id)
DROP POLICY IF EXISTS "Super admins can manage all community agents" ON public.community_agents;
CREATE POLICY "Super admins can manage all community agents"
    ON public.community_agents FOR ALL
    TO authenticated
    USING (
        (auth.uid() IN (SELECT id FROM public.users WHERE role = 'super_admin'))
    )
    WITH CHECK (
        (auth.uid() IN (SELECT id FROM public.users WHERE role = 'super_admin'))
    );
