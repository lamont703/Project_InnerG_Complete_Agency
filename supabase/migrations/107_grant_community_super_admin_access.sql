-- ============================================================
-- Migration 107: Grant Super Admin Global Community Access
-- Fixes RLS violation for Agency Admins managing client community infrastructure.
-- ============================================================

-- 1. COMMUNITY AGENTS
DROP POLICY IF EXISTS "Super admins can manage agents globally" ON public.community_agents;
CREATE POLICY "Super admins can manage agents globally"
    ON public.community_agents FOR ALL
    TO authenticated
    USING (EXISTS (SELECT 1 FROM public.users WHERE id = auth.uid() AND role = 'super_admin'))
    WITH CHECK (EXISTS (SELECT 1 FROM public.users WHERE id = auth.uid() AND role = 'super_admin'));

-- 2. COMMUNITY CHANNELS
DROP POLICY IF EXISTS "Super admins can manage channels globally" ON public.community_channels;
CREATE POLICY "Super admins can manage channels globally"
    ON public.community_channels FOR ALL
    TO authenticated
    USING (EXISTS (SELECT 1 FROM public.users WHERE id = auth.uid() AND role = 'super_admin'))
    WITH CHECK (EXISTS (SELECT 1 FROM public.users WHERE id = auth.uid() AND role = 'super_admin'));

-- 3. COMMUNITY AGENT DEPLOYMENTS
DROP POLICY IF EXISTS "Super admins can manage deployments globally" ON public.community_agent_deployments;
CREATE POLICY "Super admins can manage deployments globally"
    ON public.community_agent_deployments FOR ALL
    TO authenticated
    USING (EXISTS (SELECT 1 FROM public.users WHERE id = auth.uid() AND role = 'super_admin'))
    WITH CHECK (EXISTS (SELECT 1 FROM public.users WHERE id = auth.uid() AND role = 'super_admin'));

-- 4. COMMUNITY INTERACTIONS
DROP POLICY IF EXISTS "Super admins can view interactions globally" ON public.community_agent_interactions;
CREATE POLICY "Super admins can view interactions globally"
    ON public.community_agent_interactions FOR SELECT
    TO authenticated
    USING (EXISTS (SELECT 1 FROM public.users WHERE id = auth.uid() AND role = 'super_admin'));
