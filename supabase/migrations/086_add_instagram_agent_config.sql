-- 086_add_instagram_agent_config.sql
-- Adds Instagram and Metrics toggles to project agent config

-- 1. Add Instagram Column
ALTER TABLE public.project_agent_config 
ADD COLUMN IF NOT EXISTS instagram_data_enabled BOOLEAN NOT NULL DEFAULT TRUE;

COMMENT ON COLUMN public.project_agent_config.instagram_data_enabled IS 
'Whether the AI agent should include Instagram account and media performance data in its RAG context.';

-- 2. Add Metrics Snippets Column (Snapshots)
ALTER TABLE public.project_agent_config 
ADD COLUMN IF NOT EXISTS project_metrics_enabled BOOLEAN NOT NULL DEFAULT TRUE;

COMMENT ON COLUMN public.project_agent_config.project_metrics_enabled IS 
'Whether the AI agent should include historical daily metrics snapshots (snapshots table) in its RAG context.';

-- 3. Default to TRUE
UPDATE public.project_agent_config 
SET instagram_data_enabled = TRUE, 
    project_metrics_enabled = TRUE;
