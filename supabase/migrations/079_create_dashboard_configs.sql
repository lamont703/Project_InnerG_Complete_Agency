-- Migration 079: Create User Dashboard Configs Table
-- Inner G Complete Agency — Client Intelligence Portal

CREATE TABLE IF NOT EXISTS public.user_dashboard_configs (
  id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id         UUID NOT NULL REFERENCES public.users(id) ON DELETE CASCADE,
  project_id      UUID NOT NULL REFERENCES public.projects(id) ON DELETE CASCADE,
  slot_ids        JSONB NOT NULL DEFAULT '[]'::jsonb,
  updated_at      TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE (user_id, project_id)
);

-- Enable RLS
ALTER TABLE public.user_dashboard_configs ENABLE ROW LEVEL SECURITY;

-- Policies
DROP POLICY IF EXISTS "Users can manage their own dashboard configs" ON public.user_dashboard_configs;
CREATE POLICY "Users can manage their own dashboard configs"
  ON public.user_dashboard_configs FOR ALL
  USING (auth.uid() = user_id);

-- Trigger for updated_at
DROP TRIGGER IF EXISTS user_dashboard_configs_updated_at ON public.user_dashboard_configs;
CREATE TRIGGER user_dashboard_configs_updated_at
  BEFORE UPDATE ON public.user_dashboard_configs
  FOR EACH ROW EXECUTE FUNCTION update_updated_at();

COMMENT ON TABLE public.user_dashboard_configs IS 'Persists user-specific dashboard layouts (selected metric slots) per project.';
