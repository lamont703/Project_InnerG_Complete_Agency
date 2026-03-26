-- ============================================================
-- Migration 108: Schema Cleanup & Constraint Relaxation
-- Relaxes constraints on community_agents to accommodate the 
-- new decoupled 'Channels & Deployments' model from migration 106.
-- ============================================================

-- 1. Relax NOT NULL constraints on deprecated columns
-- These are now managed via community_agent_deployments.
ALTER TABLE public.community_agents
    ALTER COLUMN active_platforms DROP NOT NULL,
    ALTER COLUMN platform_identities DROP NOT NULL;

-- 2. Consolidate knowledge item columns
-- Migration 104 used knowledge_base_ids (TEXT[]), 106 used knowledge_ids (UUID[]).
-- We'll standardize on knowledge_ids (UUID[]).

-- Copy data if any exists (rare during early dev)
UPDATE public.community_agents
SET knowledge_ids = COALESCE(knowledge_ids, '{}'::uuid[]) || COALESCE(knowledge_base_ids::uuid[], '{}'::uuid[])
WHERE knowledge_base_ids IS NOT NULL;

-- Remove the old column
ALTER TABLE public.community_agents DROP COLUMN IF EXISTS knowledge_base_ids;

-- 3. Enhance RLS for creation (Ensuring project ownership)
DROP POLICY IF EXISTS "Users can create community agents for their projects" ON public.community_agents;
CREATE POLICY "Users can create community agents for their projects"
    ON public.community_agents FOR INSERT
    WITH CHECK (
        EXISTS (
            SELECT 1 FROM public.users
            WHERE id = auth.uid() AND role = 'super_admin'
        ) OR (
            project_id IN (SELECT project_id FROM public.project_user_access WHERE user_id = auth.uid())
        )
    );

-- 4. Final Cleanup of Indexes
CREATE INDEX IF NOT EXISTS idx_community_agents_knowledge ON public.community_agents USING GIN (knowledge_ids);
