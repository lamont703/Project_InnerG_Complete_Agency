-- ============================================================
-- Migration 019: Token Budget Enforcement
-- Inner G Complete Agency — Client Intelligence Portal
-- ============================================================
-- Adds AI tier to projects, tier budget limits, and helper
-- functions for token budget enforcement.
-- ============================================================

-- ─────────────────────────────────────────────
-- Add ai_tier column to projects
-- ─────────────────────────────────────────────
DO $$ BEGIN
    CREATE TYPE ai_tier AS ENUM ('starter', 'growth', 'enterprise');
EXCEPTION
    WHEN duplicate_object THEN null;
END $$;

ALTER TABLE public.projects
  ADD COLUMN IF NOT EXISTS ai_tier ai_tier NOT NULL DEFAULT 'growth';

COMMENT ON COLUMN public.projects.ai_tier IS
  'Token budget tier: starter=100K/mo, growth=500K/mo, enterprise=2M/mo. Controls AI usage limits.';

-- ─────────────────────────────────────────────
-- Token budget limits per tier
-- ─────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS public.ai_tier_limits (
  tier            ai_tier PRIMARY KEY,
  monthly_tokens  BIGINT NOT NULL,
  description     TEXT
);

INSERT INTO public.ai_tier_limits (tier, monthly_tokens, description) VALUES
  ('starter',    100000,  'Basic AI access — answer questions only, basic memory. 100K tokens/month.'),
  ('growth',     500000,  'Full AI access — signal creation, CTA recommendations, full data analysis. 500K tokens/month.'),
  ('enterprise', 2000000, 'Unlimited-class AI — all features, priority model access, extended memory. 2M tokens/month.')
ON CONFLICT (tier) DO UPDATE SET
  monthly_tokens = EXCLUDED.monthly_tokens,
  description = EXCLUDED.description;

-- ─────────────────────────────────────────────
-- RPC: check_token_budget
-- Returns budget status for a project in the current month
-- ─────────────────────────────────────────────
CREATE OR REPLACE FUNCTION public.check_token_budget(
  p_project_id uuid
)
RETURNS TABLE (
  tier ai_tier,
  monthly_limit bigint,
  tokens_used bigint,
  tokens_remaining bigint,
  is_over_budget boolean,
  usage_percent numeric
)
LANGUAGE sql STABLE
AS $$
  SELECT
    p.ai_tier AS tier,
    tl.monthly_tokens AS monthly_limit,
    COALESCE(SUM(tu.total_tokens), 0)::bigint AS tokens_used,
    GREATEST(tl.monthly_tokens - COALESCE(SUM(tu.total_tokens), 0), 0)::bigint AS tokens_remaining,
    COALESCE(SUM(tu.total_tokens), 0) >= tl.monthly_tokens AS is_over_budget,
    CASE WHEN tl.monthly_tokens > 0
      THEN ROUND(COALESCE(SUM(tu.total_tokens), 0)::numeric / tl.monthly_tokens * 100, 1)
      ELSE 0
    END AS usage_percent
  FROM public.projects p
  JOIN public.ai_tier_limits tl ON tl.tier = p.ai_tier
  LEFT JOIN public.token_usage_monthly tu
    ON tu.project_id = p.id
    AND tu.month = date_trunc('month', CURRENT_DATE)::date
  WHERE p.id = p_project_id
  GROUP BY p.ai_tier, tl.monthly_tokens;
$$;

COMMENT ON FUNCTION public.check_token_budget IS
  'Returns the current month token budget status for a project — tier, limit, used, remaining, and whether over budget.';

-- ─────────────────────────────────────────────
-- RPC: increment_token_usage
-- Atomic upsert: increment token counters for the current month
-- ─────────────────────────────────────────────
CREATE OR REPLACE FUNCTION public.increment_token_usage(
  p_project_id uuid,
  p_user_id uuid,
  p_input_tokens bigint,
  p_output_tokens bigint
)
RETURNS void
LANGUAGE plpgsql
AS $$
BEGIN
  INSERT INTO public.token_usage_monthly (project_id, user_id, month, input_tokens, output_tokens)
  VALUES (p_project_id, p_user_id, date_trunc('month', CURRENT_DATE)::date, p_input_tokens, p_output_tokens)
  ON CONFLICT (project_id, user_id, month)
  DO UPDATE SET
    input_tokens = token_usage_monthly.input_tokens + p_input_tokens,
    output_tokens = token_usage_monthly.output_tokens + p_output_tokens,
    updated_at = now();
END;
$$;

COMMENT ON FUNCTION public.increment_token_usage IS
  'Atomically increments token usage for a project+user in the current month. Uses INSERT ON CONFLICT for safe concurrent updates.';

-- ─────────────────────────────────────────────
-- RPC: get_token_usage_summary
-- For the admin dashboard — usage across all projects
-- ─────────────────────────────────────────────
CREATE OR REPLACE FUNCTION public.get_token_usage_summary(
  p_month date DEFAULT date_trunc('month', CURRENT_DATE)::date
)
RETURNS TABLE (
  project_id uuid,
  project_name text,
  project_slug text,
  tier ai_tier,
  monthly_limit bigint,
  tokens_used bigint,
  usage_percent numeric,
  is_over_budget boolean
)
LANGUAGE sql STABLE
AS $$
  SELECT
    p.id AS project_id,
    p.name AS project_name,
    p.slug AS project_slug,
    p.ai_tier AS tier,
    tl.monthly_tokens AS monthly_limit,
    COALESCE(SUM(tu.total_tokens), 0)::bigint AS tokens_used,
    CASE WHEN tl.monthly_tokens > 0
      THEN ROUND(COALESCE(SUM(tu.total_tokens), 0)::numeric / tl.monthly_tokens * 100, 1)
      ELSE 0
    END AS usage_percent,
    COALESCE(SUM(tu.total_tokens), 0) >= tl.monthly_tokens AS is_over_budget
  FROM public.projects p
  JOIN public.ai_tier_limits tl ON tl.tier = p.ai_tier
  LEFT JOIN public.token_usage_monthly tu
    ON tu.project_id = p.id
    AND tu.month = p_month
  GROUP BY p.id, p.name, p.slug, p.ai_tier, tl.monthly_tokens
  ORDER BY tokens_used DESC;
$$;

COMMENT ON FUNCTION public.get_token_usage_summary IS
  'Returns token usage summary for all projects for a given month. Used by the Super Admin token dashboard.';
