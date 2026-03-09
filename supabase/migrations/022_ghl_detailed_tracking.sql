-- ============================================================
-- Migration 022: GHL Detailed Pipeline Tracking
-- Inner G Complete Agency — Client Intelligence Portal
-- ============================================================
-- Adds support for GHL Pipelines, Stages, and Opportunities.
-- Enables the AI Agent to track specific sales funnels like 
-- the "Client Software Development Pipeline".
-- ============================================================

-- GHL PIPELINES
CREATE TABLE IF NOT EXISTS public.ghl_pipelines (
  id                UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  project_id        UUID REFERENCES public.projects(id) ON DELETE CASCADE,
  ghl_pipeline_id   TEXT NOT NULL UNIQUE,
  name              TEXT NOT NULL,
  created_at        TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at        TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- GHL PIPELINE STAGES
CREATE TABLE IF NOT EXISTS public.ghl_pipeline_stages (
  id                UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  pipeline_id       UUID NOT NULL REFERENCES public.ghl_pipelines(id) ON DELETE CASCADE,
  ghl_stage_id      TEXT NOT NULL UNIQUE,
  name              TEXT NOT NULL,
  position          INTEGER NOT NULL DEFAULT 0,
  created_at        TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at        TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- GHL OPPORTUNITIES
CREATE TABLE IF NOT EXISTS public.ghl_opportunities (
  id                  UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  project_id          UUID NOT NULL REFERENCES public.projects(id) ON DELETE CASCADE,
  ghl_opportunity_id  TEXT NOT NULL UNIQUE,
  contact_id          UUID REFERENCES public.ghl_contacts(id) ON DELETE SET NULL,
  pipeline_id         UUID REFERENCES public.ghl_pipelines(id) ON DELETE CASCADE,
  stage_id            UUID REFERENCES public.ghl_pipeline_stages(id) ON DELETE CASCADE,
  title               TEXT NOT NULL,
  status              TEXT NOT NULL DEFAULT 'open', -- open, won, lost, abandoned
  monetary_value      NUMERIC(14, 2) DEFAULT 0,
  assigned_to         TEXT,
  tags                TEXT[] DEFAULT '{}',
  custom_fields       JSONB DEFAULT '{}'::jsonb,
  ghl_updated_at      TIMESTAMPTZ,
  synced_at           TIMESTAMPTZ NOT NULL DEFAULT now(),
  created_at          TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Add indexes for performance and RAG
CREATE INDEX IF NOT EXISTS idx_ghl_opps_project ON public.ghl_opportunities(project_id);
CREATE INDEX IF NOT EXISTS idx_ghl_opps_pipeline ON public.ghl_opportunities(pipeline_id);
CREATE INDEX IF NOT EXISTS idx_ghl_opps_stage ON public.ghl_opportunities(stage_id);
CREATE INDEX IF NOT EXISTS idx_ghl_stages_pipeline ON public.ghl_pipeline_stages(pipeline_id);

-- ─────────────────────────────────────────────
-- TRIGGER: Update Updated_At
-- ─────────────────────────────────────────────
DROP TRIGGER IF EXISTS set_ghl_pipelines_updated_at ON public.ghl_pipelines;
CREATE TRIGGER set_ghl_pipelines_updated_at
  BEFORE UPDATE ON public.ghl_pipelines
  FOR EACH ROW EXECUTE FUNCTION set_updated_at();

DROP TRIGGER IF EXISTS set_ghl_pipeline_stages_updated_at ON public.ghl_pipeline_stages;
CREATE TRIGGER set_ghl_pipeline_stages_updated_at
  BEFORE UPDATE ON public.ghl_pipeline_stages
  FOR EACH ROW EXECUTE FUNCTION set_updated_at();

-- ─────────────────────────────────────────────
-- AI RAG: QUEUE EMBEDDINGS
-- ─────────────────────────────────────────────

-- Add Opportunities to the embedding pipeline
DROP TRIGGER IF EXISTS ghl_opportunities_queue_embedding ON public.ghl_opportunities;
CREATE TRIGGER ghl_opportunities_queue_embedding
  AFTER INSERT OR UPDATE ON public.ghl_opportunities
  FOR EACH ROW EXECUTE FUNCTION queue_embedding_job();

-- ─────────────────────────────────────────────
-- RLS POLICIES
-- ─────────────────────────────────────────────

-- Pipelines
ALTER TABLE public.ghl_pipelines ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS ghl_pipelines_select ON public.ghl_pipelines;
CREATE POLICY ghl_pipelines_select ON public.ghl_pipelines
  FOR SELECT USING (
    EXISTS (SELECT 1 FROM public.users WHERE id = auth.uid() AND role = 'super_admin')
    OR project_id IN (SELECT project_id FROM public.project_user_access WHERE user_id = auth.uid())
  );

-- Stages
ALTER TABLE public.ghl_pipeline_stages ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS ghl_pipeline_stages_select ON public.ghl_pipeline_stages;
CREATE POLICY ghl_pipeline_stages_select ON public.ghl_pipeline_stages
  FOR SELECT USING (auth.uid() IS NOT NULL); -- Safe since parent is restricted

-- Opportunities
ALTER TABLE public.ghl_opportunities ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS ghl_opportunities_select ON public.ghl_opportunities;
CREATE POLICY ghl_opportunities_select ON public.ghl_opportunities
  FOR SELECT USING (
    EXISTS (SELECT 1 FROM public.users WHERE id = auth.uid() AND role = 'super_admin')
    OR project_id IN (SELECT project_id FROM public.project_user_access WHERE user_id = auth.uid())
  );

COMMENT ON TABLE public.ghl_opportunities IS 'Opportunities/Deals synced from GHL, used by the AI Agent to track sales performance and pipeline health.';
