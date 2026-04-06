-- Migration 124: Update Community Interactions with Channel Links
-- Adds channel_id to link interactions directly to community channels for precise tracking in the matrix.

-- 1. Add channel_id column if not exists
ALTER TABLE public.community_agent_interactions 
ADD COLUMN IF NOT EXISTS channel_id UUID REFERENCES public.community_channels(id) ON DELETE SET NULL;

-- 2. Create index for performance
CREATE INDEX IF NOT EXISTS idx_community_interactions_channel ON public.community_agent_interactions(channel_id);

-- 3. Update existing records if they have a platform/project match (best effort)
-- This is hard to do perfectly without a join, but better than nothing.
-- If the table is fresh, this is no-op.

-- 4. Add comment
COMMENT ON COLUMN public.community_agent_interactions.channel_id IS 'Link to the specific community channel/platform where this interaction occurred.';

-- 5. Add INSERT policy (required for the dashboard fallback and agent tracking)
DROP POLICY IF EXISTS "Users can insert community interactions for their projects" ON public.community_agent_interactions;
CREATE POLICY "Users can insert community interactions for their projects"
    ON public.community_agent_interactions FOR INSERT
    WITH CHECK (project_id IN (SELECT project_id FROM public.project_user_access WHERE user_id = auth.uid()));
