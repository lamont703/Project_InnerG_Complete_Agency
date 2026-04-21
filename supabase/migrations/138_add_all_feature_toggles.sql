-- ============================================================
-- Migration 138: Expand Master Feature Orchestration
-- Inner G Complete Agency — Total Sovereignty Layer
-- ============================================================

-- MASTER SWITCHES: Programmatically enable/disable remaining architecture modules
ALTER TABLE public.projects 
ADD COLUMN agent_enabled BOOLEAN NOT NULL DEFAULT true,
ADD COLUMN community_enabled BOOLEAN NOT NULL DEFAULT true,
ADD COLUMN social_enabled BOOLEAN NOT NULL DEFAULT true,
ADD COLUMN crypto_enabled BOOLEAN NOT NULL DEFAULT true,
ADD COLUMN cognitive_enabled BOOLEAN NOT NULL DEFAULT true,
ADD COLUMN metrics_enabled BOOLEAN NOT NULL DEFAULT true;

-- COMMENTS: Governance metadata for feature masking
COMMENT ON COLUMN public.projects.agent_enabled IS 'Master visibility toggle for AI Autonomous Agent configuration.';
COMMENT ON COLUMN public.projects.community_enabled IS 'Master visibility toggle for Community Agent management.';
COMMENT ON COLUMN public.projects.social_enabled IS 'Master visibility toggle for the Social Scheduling Planner.';
COMMENT ON COLUMN public.projects.crypto_enabled IS 'Master visibility toggle for Crypto Trading Intelligence.';
COMMENT ON COLUMN public.projects.cognitive_enabled IS 'Master visibility toggle for Cognitive Management & SOPs.';
COMMENT ON COLUMN public.projects.metrics_enabled IS 'Master visibility toggle for Metrics & Ports analytics.';
