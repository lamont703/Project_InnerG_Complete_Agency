-- Migration 048: Standardize Social Content RLS
-- Inner G Complete Agency — Client Intelligence Portal
-- Aligns social_content_plan policies with the rest of the architecture.

-- 1. Selection Policy (Read)
DROP POLICY IF EXISTS "Users can view content plans for their projects" ON public.social_content_plan;
CREATE POLICY "social_content_plan_read"
    ON public.social_content_plan FOR SELECT
    USING (can_access_project(project_id));

-- 2. Team Policy (Full Access for Team members)
DROP POLICY IF EXISTS "Users can create content plans for their projects" ON public.social_content_plan;
DROP POLICY IF EXISTS "Users can update content plans for their projects" ON public.social_content_plan;

CREATE POLICY "social_content_plan_team_write"
    ON public.social_content_plan FOR ALL
    USING (is_inner_g_team());

-- 3. Comment update
COMMENT ON TABLE public.social_content_plan IS 'Stores AI-generated social media drafts. Super admins have full visibility.';
