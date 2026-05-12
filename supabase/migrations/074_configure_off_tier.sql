-- ============================================================
-- Migration 074: Configure 'off' AI Tier
-- Inner G Complete Agency — Client Intelligence Portal
-- ============================================================
-- Inserts the tier limit and sets the default for the 'off' tier
-- added in migration 073.
-- ============================================================

-- 1. Insert limit for 'off' tier
INSERT INTO public.ai_tier_limits (tier, monthly_tokens, description)
VALUES ('off', 0, 'AI access disabled — user can access the portal but cannot use the AI growth assistant.')
ON CONFLICT (tier) DO UPDATE SET 
  monthly_tokens = EXCLUDED.monthly_tokens,
  description = EXCLUDED.description;

-- 2. Set default tier for new projects to 'off'
ALTER TABLE public.projects 
  ALTER COLUMN ai_tier SET DEFAULT 'off';
