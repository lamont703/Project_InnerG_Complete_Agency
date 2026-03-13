-- Migration 050: Fix LinkedIn RLS Policies
-- Ensuring Super Admins and Developers can view LinkedIn data across projects.
-- The previous policies in 043 were too restrictive.

DROP POLICY IF EXISTS "Users can view their project's linkedin pages" ON public.linkedin_pages;
CREATE POLICY "Users can view their project's linkedin pages" 
    ON public.linkedin_pages FOR SELECT 
    USING (can_access_project(project_id));

DROP POLICY IF EXISTS "Users can view their project's linkedin posts" ON public.linkedin_posts;
CREATE POLICY "Users can view their project's linkedin posts" 
    ON public.linkedin_posts FOR SELECT 
    USING (can_access_project(project_id));

-- Add write access for team members (needed for sync if using authenticated client)
DROP POLICY IF EXISTS "Team can manage linkedin pages" ON public.linkedin_pages;
CREATE POLICY "Team can manage linkedin pages" 
    ON public.linkedin_pages FOR ALL 
    USING (is_inner_g_team());

DROP POLICY IF EXISTS "Team can manage linkedin posts" ON public.linkedin_posts;
CREATE POLICY "Team can manage linkedin posts" 
    ON public.linkedin_posts FOR ALL 
    USING (is_inner_g_team());
