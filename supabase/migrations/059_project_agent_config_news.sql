
-- Migration 059: Add news_intelligence_enabled to project_agent_config
-- Inner G Complete Agency — Client Intelligence Portal
-- Allows users/admins to toggle the AI's visibility into the trending news dataset.

ALTER TABLE public.project_agent_config
ADD COLUMN news_intelligence_enabled BOOLEAN DEFAULT TRUE;

COMMENT ON COLUMN public.project_agent_config.news_intelligence_enabled IS 'Controls whether the AI growth assistant can retrieve data from the news_intelligence table.';

-- Ensure existing projects have it enabled by default
UPDATE public.project_agent_config SET news_intelligence_enabled = TRUE WHERE news_intelligence_enabled IS NULL;
