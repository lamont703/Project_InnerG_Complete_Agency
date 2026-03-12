-- Migration 041: Add YouTube toggle to project agent config
-- Allows admins to enable/disable YouTube data for the AI agent per project.

-- 1. Add the column
ALTER TABLE public.project_agent_config 
ADD COLUMN IF NOT EXISTS youtube_data_enabled BOOLEAN NOT NULL DEFAULT TRUE;

COMMENT ON COLUMN public.project_agent_config.youtube_data_enabled IS 
'Whether the AI agent should include YouTube channel and video data in its RAG context.';

-- 2. Update existing entries to ensure they have the default (if any somehow missed it)
UPDATE public.project_agent_config SET youtube_data_enabled = TRUE WHERE youtube_data_enabled IS NULL;
