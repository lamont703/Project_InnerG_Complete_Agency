-- 087_add_facebook_agent_config.sql
-- Adds Facebook toggle to project agent config

-- 1. Add Facebook Column
ALTER TABLE public.project_agent_config 
ADD COLUMN IF NOT EXISTS facebook_data_enabled BOOLEAN NOT NULL DEFAULT TRUE;

COMMENT ON COLUMN public.project_agent_config.facebook_data_enabled IS 
'Whether the AI agent should include Facebook Page metrics and performance data in its RAG context.';

-- 2. Default to TRUE
UPDATE public.project_agent_config SET facebook_data_enabled = TRUE;
