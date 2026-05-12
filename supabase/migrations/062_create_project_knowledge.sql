-- ============================================================
-- Migration 062: Create Project Knowledge CMS
-- Inner G Complete Agency — Client Intelligence Portal
-- ============================================================
-- Enables clients to upload custom knowledge, SOPs, and context
-- specifically for their project's AI agent.
-- ============================================================

-- 1. Create project_knowledge table
CREATE TABLE IF NOT EXISTS public.project_knowledge (
  id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  project_id      UUID NOT NULL REFERENCES public.projects(id) ON DELETE CASCADE,
  title           TEXT NOT NULL,
  body            TEXT NOT NULL,
  tags            TEXT[] NOT NULL DEFAULT '{}',
  is_published    BOOLEAN NOT NULL DEFAULT TRUE,
  created_by      UUID NOT NULL REFERENCES public.users(id),
  created_at      TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at      TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- 2. Indexes
CREATE INDEX IF NOT EXISTS idx_project_knowledge_project ON public.project_knowledge(project_id);
CREATE INDEX IF NOT EXISTS idx_project_knowledge_tags ON public.project_knowledge USING GIN(tags);

-- 3. RLS
ALTER TABLE public.project_knowledge ENABLE ROW LEVEL SECURITY;

-- Super Admin can do everything
DROP POLICY IF EXISTS project_knowledge_super_admin ON public.project_knowledge;
CREATE POLICY project_knowledge_super_admin ON public.project_knowledge
  FOR ALL USING (auth_role() = 'super_admin');

-- Authorized project members can manage their own project knowledge
DROP POLICY IF EXISTS project_knowledge_client_manage ON public.project_knowledge;
CREATE POLICY project_knowledge_client_manage ON public.project_knowledge
  FOR ALL USING (can_access_project(project_id));

-- 4. Automatically queue embedding jobs for RAG
DROP TRIGGER IF EXISTS project_knowledge_queue_embedding ON public.project_knowledge;
CREATE TRIGGER project_knowledge_queue_embedding
  AFTER INSERT OR UPDATE ON public.project_knowledge
  FOR EACH ROW EXECUTE FUNCTION queue_embedding_job();

-- 5. Updated At Trigger
DROP TRIGGER IF EXISTS set_project_knowledge_updated_at ON public.project_knowledge;
CREATE TRIGGER set_project_knowledge_updated_at
  BEFORE UPDATE ON public.project_knowledge
  FOR EACH ROW EXECUTE FUNCTION set_updated_at();

COMMENT ON TABLE public.project_knowledge IS
  'Custom knowledge base for specific projects. Uploaded by clients or agency admins to provide project-specific context to the AI agent.';

-- 6. Add to agent config
ALTER TABLE public.project_agent_config
  ADD COLUMN IF NOT EXISTS project_knowledge_enabled BOOLEAN NOT NULL DEFAULT TRUE;

COMMENT ON COLUMN public.project_agent_config.project_knowledge_enabled IS
  'If true, the project agent will search the project_knowledge table for RAG context.';
