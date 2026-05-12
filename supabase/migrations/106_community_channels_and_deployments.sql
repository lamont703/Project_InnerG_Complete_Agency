-- ============================================================
-- Migration 106: Community Channels & Platform Deployments
-- Decouples AI Personas from specific platforms for 1-to-Many scale.
-- ============================================================

-- 1. Community Channels (The Connection Instance)
CREATE TABLE IF NOT EXISTS public.community_channels (
    id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    project_id      UUID NOT NULL REFERENCES public.projects(id) ON DELETE CASCADE,
    name            TEXT NOT NULL, -- e.g. "Science Fiction Forum"
    platform        TEXT NOT NULL, -- 'discord', 'book_reader', 'slack', 'telegram'
    config          JSONB DEFAULT '{}'::jsonb, -- Credentials, Webhook URLs, API Keys
    is_active       BOOLEAN DEFAULT true,
    created_at      TIMESTAMPTZ NOT NULL DEFAULT now(),
    updated_at      TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_community_channels_project ON public.community_channels(project_id);

-- 2. Agent Deployments (Join Table: Personas -> Channels)
CREATE TABLE IF NOT EXISTS public.community_agent_deployments (
    id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    agent_id        UUID NOT NULL REFERENCES public.community_agents(id) ON DELETE CASCADE,
    channel_id      UUID NOT NULL REFERENCES public.community_channels(id) ON DELETE CASCADE,
    deployment_id   TEXT, -- The ID of the agent ON the target platform (e.g. Discord Member ID)
    stats           JSONB DEFAULT '{ "messages_sent": 0, "conversions_tracked": 0 }'::jsonb,
    is_active       BOOLEAN DEFAULT true,
    created_at      TIMESTAMPTZ NOT NULL DEFAULT now(),
    UNIQUE(agent_id, channel_id)
);

-- 3. Update community_agents to support Knowledge Base links
ALTER TABLE public.community_agents
ADD COLUMN IF NOT EXISTS knowledge_ids UUID[] DEFAULT '{}', -- Array of knowledge base entries the agent has access to
ADD COLUMN IF NOT EXISTS mission_objective TEXT; -- The primary goal (Revenue, Awareness, Education)

-- 4. RLS POLICIES

-- Channels
ALTER TABLE public.community_channels ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view channels for their projects"
    ON public.community_channels FOR SELECT
    USING (project_id IN (SELECT project_id FROM public.project_user_access WHERE user_id = auth.uid()));

CREATE POLICY "Users can manage channels for their projects"
    ON public.community_channels FOR ALL
    USING (project_id IN (SELECT project_id FROM public.project_user_access WHERE user_id = auth.uid()));

-- Deployments
ALTER TABLE public.community_agent_deployments ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can manage deployments for their projects"
    ON public.community_agent_deployments FOR ALL
    USING (
        agent_id IN (SELECT id FROM public.community_agents WHERE project_id IN (SELECT project_id FROM public.project_user_access WHERE user_id = auth.uid()))
    );

-- Trigger for updated_at
DROP TRIGGER IF EXISTS community_channels_updated_at ON public.community_channels;
CREATE TRIGGER community_channels_updated_at
    BEFORE UPDATE ON public.community_channels
    FOR EACH ROW EXECUTE FUNCTION update_updated_at();
