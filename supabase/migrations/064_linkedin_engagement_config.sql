-- Migration 064: Enhance Project Agent for LinkedIn Engagement
-- Inner G Complete Agency — Client Intelligence Portal

-- 1. Add engagement controls to project_agent_config
ALTER TABLE public.project_agent_config
  ADD COLUMN IF NOT EXISTS linkedin_engagement_enabled BOOLEAN NOT NULL DEFAULT FALSE,
  ADD COLUMN IF NOT EXISTS agency_persona TEXT;

COMMENT ON COLUMN public.project_agent_config.linkedin_engagement_enabled IS
  'If true, the AI agent will automatically respond to comments on LinkedIn posts synced to this project.';

COMMENT ON COLUMN public.project_agent_config.agency_persona IS
  'Custom persona instructions for the engagement agent (e.g. "Speak with a friendly, high-tech vibe").';

-- 2. Add processed_at to linkedin_comments to track AI engagement runs
ALTER TABLE public.linkedin_comments
  ADD COLUMN IF NOT EXISTS ai_processed_at TIMESTAMP WITH TIME ZONE;

CREATE INDEX IF NOT EXISTS idx_linkedin_comments_ai_pending 
  ON public.linkedin_comments (project_id, ai_processed_at) 
  WHERE ai_processed_at IS NULL;
