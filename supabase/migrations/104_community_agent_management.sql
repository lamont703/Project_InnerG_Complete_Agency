-- Migration 102: Community Agent Management
-- Universal Schema for AI personas that engage in group discussions, chat rooms, and communities.

-- 1. Create the Community Agents table
CREATE TABLE IF NOT EXISTS public.community_agents (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    project_id UUID NOT NULL REFERENCES public.projects(id) ON DELETE CASCADE,
    
    -- Persona Identity
    name TEXT NOT NULL,
    role TEXT NOT NULL DEFAULT 'Member', -- Scholar, Enthusiast, Skeptic, Moderator, Hype
    avatar_url TEXT,
    bio TEXT,
    
    -- AI Orchestration
    persona_prompt TEXT NOT NULL, -- The specific instructions for how this agent talks
    mood TEXT DEFAULT 'neutral', -- neutral, friendly, analytical, provocative, supportive
    knowledge_base_ids UUID[] DEFAULT '{}', -- Linked RAG knowledge items if needed
    
    -- Platform Configuration
    active_platforms TEXT[] NOT NULL DEFAULT '{book-reader}', -- book-reader, discord, slack, telegram
    platform_identities JSONB NOT NULL DEFAULT '{}', -- e.g. {"discord": "agent_user_123", "book-reader": "alice_reader"}
    
    -- Behavior Parameters
    engagement_frequency INTEGER DEFAULT 60, -- Attempt an engagement every X minutes
    is_active BOOLEAN NOT NULL DEFAULT true,
    last_active_at TIMESTAMPTZ,
    
    created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- 2. Create the Agent Interactions log table (for Community Monitor/Audit Trail)
CREATE TABLE IF NOT EXISTS public.community_agent_interactions (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    agent_id UUID NOT NULL REFERENCES public.community_agents(id) ON DELETE CASCADE,
    project_id UUID NOT NULL REFERENCES public.projects(id) ON DELETE CASCADE,
    
    platform TEXT NOT NULL, -- book-reader, discord, etc.
    room_id TEXT NOT NULL,
    
    message_type TEXT NOT NULL DEFAULT 'comment', -- comment, post, reply, react
    content TEXT NOT NULL,
    
    -- Metadata from external platform
    external_id TEXT, -- message_id in the other app
    parent_id TEXT, -- if it was a reply
    
    created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- 3. Indexes for scale
CREATE INDEX IF NOT EXISTS idx_community_agents_project ON public.community_agents(project_id);
CREATE INDEX IF NOT EXISTS idx_community_agents_active ON public.community_agents(is_active);
CREATE INDEX IF NOT EXISTS idx_community_interactions_agent ON public.community_agent_interactions(agent_id);
CREATE INDEX IF NOT EXISTS idx_community_interactions_project ON public.community_agent_interactions(project_id);

-- 4. Enable RLS
ALTER TABLE public.community_agent_interactions ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.community_agents ENABLE ROW LEVEL SECURITY;

-- 5. RLS Policies
-- Community Agents
DROP POLICY IF EXISTS "Users can view community agents for their projects" ON public.community_agents;
CREATE POLICY "Users can view community agents for their projects"
    ON public.community_agents FOR SELECT
    USING (project_id IN (SELECT project_id FROM public.project_user_access WHERE user_id = auth.uid()));

DROP POLICY IF EXISTS "Users can create community agents for their projects" ON public.community_agents;
CREATE POLICY "Users can create community agents for their projects"
    ON public.community_agents FOR INSERT
    WITH CHECK (project_id IN (SELECT project_id FROM public.project_user_access WHERE user_id = auth.uid()));

DROP POLICY IF EXISTS "Users can update community agents for their projects" ON public.community_agents;
CREATE POLICY "Users can update community agents for their projects"
    ON public.community_agents FOR UPDATE
    USING (project_id IN (SELECT project_id FROM public.project_user_access WHERE user_id = auth.uid()));

-- Interactions Audit
DROP POLICY IF EXISTS "Users can view community interactions for their projects" ON public.community_agent_interactions;
CREATE POLICY "Users can view community interactions for their projects"
    ON public.community_agent_interactions FOR SELECT
    USING (project_id IN (SELECT project_id FROM public.project_user_access WHERE user_id = auth.uid()));

-- 6. Add "Agent Management" feature flag to projects if not exists (to fulfill the toggle requirement)
ALTER TABLE public.projects 
ADD COLUMN IF NOT EXISTS settings JSONB DEFAULT '{ "features": { "community_agents": false } }'::jsonb;

-- Comment for metadata
COMMENT ON TABLE public.community_agents IS 'Stores AI-driven personas designed for community discussion and engagement.';
COMMENT ON TABLE public.community_agent_interactions IS 'Audit trail of all messages sent by community agents to external platforms.';

-- Grant Super Admins permission to update project settings (for feature flags)
DROP POLICY IF EXISTS "Super admins can update projects" ON public.projects;
CREATE POLICY "Super admins can update projects"
ON public.projects
FOR UPDATE
TO authenticated
USING (
  EXISTS (
    SELECT 1 FROM public.users
    WHERE id = auth.uid()
    AND role = 'super_admin'
  )
)
WITH CHECK (
  EXISTS (
    SELECT 1 FROM public.users
    WHERE id = auth.uid()
    AND role = 'super_admin'
  )
);
