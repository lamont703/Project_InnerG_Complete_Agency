-- ============================================================
-- Migration 016: Create AI Agent Architecture
-- Inner G Complete Agency — Client Intelligence Portal
-- ============================================================
-- Phase 5: Two-agent system, knowledge CMS, per-project agent config,
--           token budgets, session summaries, connector templates.
-- ============================================================

-- ─────────────────────────────────────────────
-- TABLE: agency_knowledge
-- CMS for agency-level knowledge (services, methodology, SOPs)
-- No project_id — accessible to the Agency Agent only
-- ─────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS public.agency_knowledge (
  id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  title           TEXT NOT NULL,
  body            TEXT NOT NULL,
  tags            TEXT[] NOT NULL DEFAULT '{}',
  is_published    BOOLEAN NOT NULL DEFAULT TRUE,
  created_by      UUID NOT NULL REFERENCES public.users(id),
  created_at      TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at      TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_agency_knowledge_tags
  ON public.agency_knowledge USING GIN(tags);
CREATE INDEX IF NOT EXISTS idx_agency_knowledge_published
  ON public.agency_knowledge(is_published) WHERE is_published = TRUE;

COMMENT ON TABLE public.agency_knowledge IS
  'CMS for agency-level knowledge. Entries are embedded into the RAG pipeline without a project_id filter, making them accessible to the Agency Agent.';

-- ─────────────────────────────────────────────
-- TABLE: project_agent_config
-- Per-project data source toggles for the AI agent
-- ─────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS public.project_agent_config (
  id                          UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  project_id                  UUID NOT NULL REFERENCES public.projects(id) ON DELETE CASCADE,
  campaign_metrics_enabled    BOOLEAN NOT NULL DEFAULT TRUE,
  ai_signals_enabled          BOOLEAN NOT NULL DEFAULT TRUE,
  activity_log_enabled        BOOLEAN NOT NULL DEFAULT TRUE,
  ghl_contacts_enabled        BOOLEAN NOT NULL DEFAULT TRUE,
  funnel_data_enabled         BOOLEAN NOT NULL DEFAULT TRUE,
  integration_sync_enabled    BOOLEAN NOT NULL DEFAULT TRUE,
  system_connections_enabled  BOOLEAN NOT NULL DEFAULT TRUE,
  chat_history_enabled        BOOLEAN NOT NULL DEFAULT TRUE,
  created_at                  TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at                  TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE(project_id)
);

COMMENT ON TABLE public.project_agent_config IS
  'Per-project data source toggles for the AI agent. Super Admin configures which data sources feed each project agent. Defaults: all ON.';

-- Auto-creation trigger: auto-create config when a new project is created
CREATE OR REPLACE FUNCTION auto_create_agent_config()
RETURNS TRIGGER AS $$
BEGIN
  INSERT INTO public.project_agent_config (project_id)
  VALUES (NEW.id)
  ON CONFLICT (project_id) DO NOTHING;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

DROP TRIGGER IF EXISTS projects_auto_agent_config ON public.projects;
DROP TRIGGER IF EXISTS projects_auto_agent_config ON public.projects;
CREATE TRIGGER projects_auto_agent_config
  AFTER INSERT ON public.projects
  FOR EACH ROW EXECUTE FUNCTION auto_create_agent_config();

-- Backfill: create config for any existing projects that don't have one
INSERT INTO public.project_agent_config (project_id)
SELECT id FROM public.projects
WHERE id NOT IN (SELECT project_id FROM public.project_agent_config)
ON CONFLICT (project_id) DO NOTHING;

-- ─────────────────────────────────────────────
-- TABLE: token_usage_monthly
-- Monthly token budget tracking per project + user
-- ─────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS public.token_usage_monthly (
  id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  project_id      UUID NOT NULL REFERENCES public.projects(id) ON DELETE CASCADE,
  user_id         UUID NOT NULL REFERENCES public.users(id) ON DELETE CASCADE,
  month           DATE NOT NULL,
  input_tokens    BIGINT NOT NULL DEFAULT 0,
  output_tokens   BIGINT NOT NULL DEFAULT 0,
  total_tokens    BIGINT GENERATED ALWAYS AS (input_tokens + output_tokens) STORED,
  updated_at      TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE(project_id, user_id, month)
);

CREATE INDEX IF NOT EXISTS idx_token_usage_project_month
  ON public.token_usage_monthly(project_id, month);
CREATE INDEX IF NOT EXISTS idx_token_usage_user_month
  ON public.token_usage_monthly(user_id, month);

COMMENT ON TABLE public.token_usage_monthly IS
  'Monthly token usage aggregation per project + user. Used for budget enforcement (hard stop) and billing transparency across tiered plans.';

-- ─────────────────────────────────────────────
-- TABLE: session_summaries
-- Nightly-generated narrative summaries of chat sessions
-- ─────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS public.session_summaries (
  id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  session_id      UUID NOT NULL REFERENCES public.chat_sessions(id) ON DELETE CASCADE,
  project_id      UUID NOT NULL REFERENCES public.projects(id) ON DELETE CASCADE,
  user_id         UUID NOT NULL REFERENCES public.users(id) ON DELETE CASCADE,
  summary         TEXT NOT NULL,
  message_count   INTEGER NOT NULL,
  generated_at    TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE(session_id)
);

CREATE INDEX IF NOT EXISTS idx_session_summaries_user_project
  ON public.session_summaries(user_id, project_id);
CREATE INDEX IF NOT EXISTS idx_session_summaries_project
  ON public.session_summaries(project_id);

COMMENT ON TABLE public.session_summaries IS
  'Nightly batch-generated narrative summaries of chat sessions. Embedded into RAG for hybrid memory. User-scoped: agents search only the current user''s past session summaries.';

-- ─────────────────────────────────────────────
-- TABLE: connector_types
-- Library of reusable connector templates
-- ─────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS public.connector_types (
  id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name            TEXT NOT NULL UNIQUE,
  provider        TEXT NOT NULL,
  description     TEXT,
  config_schema   JSONB,
  is_active       BOOLEAN NOT NULL DEFAULT TRUE,
  created_at      TIMESTAMPTZ NOT NULL DEFAULT now()
);

COMMENT ON TABLE public.connector_types IS
  'Library of reusable connector templates. When onboarding a new project, pick a template and configure credentials.';

-- Seed default connector types
INSERT INTO public.connector_types (name, provider, description) VALUES
  ('Supabase Connector', 'supabase', 'Connect to an external Supabase project database.'),
  ('GoHighLevel Connector', 'ghl', 'Connect to a GoHighLevel CRM account via API.'),
  ('PostgreSQL Connector', 'postgres', 'Connect to a standard PostgreSQL database.'),
  ('MySQL Connector', 'mysql', 'Connect to a MySQL database.')
ON CONFLICT (name) DO NOTHING;

-- ─────────────────────────────────────────────
-- ALTER: client_db_connections
-- Add connector_type_id, client_id, is_shared
-- Make project_id nullable for shared connections
-- ─────────────────────────────────────────────
ALTER TABLE public.client_db_connections
  ADD COLUMN IF NOT EXISTS connector_type_id UUID REFERENCES public.connector_types(id),
  ADD COLUMN IF NOT EXISTS client_id UUID REFERENCES public.clients(id) ON DELETE CASCADE,
  ADD COLUMN IF NOT EXISTS is_shared BOOLEAN NOT NULL DEFAULT FALSE;

-- Make project_id nullable (shared connections belong to client, not project)
ALTER TABLE public.client_db_connections
  ALTER COLUMN project_id DROP NOT NULL;

COMMENT ON COLUMN public.client_db_connections.is_shared IS
  'If true, this connection can be used by multiple projects under the same client.';

-- ─────────────────────────────────────────────
-- RPC: match_documents_agency()
-- Agency-wide vector search — no project_id filter
-- ─────────────────────────────────────────────
CREATE OR REPLACE FUNCTION match_documents_agency(
  query_embedding vector(1536),
  match_threshold float DEFAULT 0.5,
  match_count int DEFAULT 10
)
RETURNS TABLE (
  id uuid,
  project_id uuid,
  source_table text,
  source_id uuid,
  content_chunk text,
  similarity float
)
LANGUAGE sql STABLE
AS $$
  SELECT
    d.id,
    d.project_id,
    d.source_table,
    d.source_id,
    d.content_chunk,
    1 - (d.embedding <=> query_embedding) AS similarity
  FROM document_embeddings d
  WHERE 1 - (d.embedding <=> query_embedding) > match_threshold
  ORDER BY d.embedding <=> query_embedding
  LIMIT match_count;
$$;

COMMENT ON FUNCTION match_documents_agency IS
  'Agency-wide vector search — searches ALL embeddings across all projects. Used by the Agency Agent for cross-project intelligence.';

-- ─────────────────────────────────────────────
-- UPDATED TRIGGER FUNCTION: queue_embedding_job()
-- Now handles more table types
-- ─────────────────────────────────────────────
CREATE OR REPLACE FUNCTION queue_embedding_job()
RETURNS TRIGGER AS $$
DECLARE
  v_project_id UUID;
BEGIN
  -- Determine project_id based on the source table
  CASE TG_TABLE_NAME
    WHEN 'campaign_metrics' THEN
      SELECT project_id INTO v_project_id FROM public.campaigns WHERE id = NEW.campaign_id;
    WHEN 'funnel_events' THEN
      SELECT c.project_id INTO v_project_id
      FROM public.funnel_stages fs
      JOIN public.campaigns c ON c.id = fs.campaign_id
      WHERE fs.id = NEW.funnel_stage_id;
    WHEN 'agency_knowledge' THEN
      -- Agency knowledge has no project_id — use a sentinel UUID or NULL
      v_project_id := '00000000-0000-0000-0000-000000000000'::UUID;
    ELSE
      -- Most tables have project_id directly
      v_project_id := NEW.project_id;
  END CASE;

  -- Only insert if we resolved a project_id
  IF v_project_id IS NOT NULL THEN
    INSERT INTO public.embedding_jobs (project_id, source_table, source_id)
    VALUES (v_project_id, TG_TABLE_NAME, NEW.id);
  END IF;

  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- ─────────────────────────────────────────────
-- NEW TRIGGERS: Extend embedding pipeline to more tables
-- ─────────────────────────────────────────────

-- Activity Log
DROP TRIGGER IF EXISTS activity_log_queue_embedding ON public.activity_log;
DROP TRIGGER IF EXISTS activity_log_queue_embedding ON public.activity_log;
CREATE TRIGGER activity_log_queue_embedding
  AFTER INSERT ON public.activity_log
  FOR EACH ROW EXECUTE FUNCTION queue_embedding_job();

-- GHL Contacts
DROP TRIGGER IF EXISTS ghl_contacts_queue_embedding ON public.ghl_contacts;
DROP TRIGGER IF EXISTS ghl_contacts_queue_embedding ON public.ghl_contacts;
CREATE TRIGGER ghl_contacts_queue_embedding
  AFTER INSERT ON public.ghl_contacts
  FOR EACH ROW EXECUTE FUNCTION queue_embedding_job();

-- Funnel Events
DROP TRIGGER IF EXISTS funnel_events_queue_embedding ON public.funnel_events;
DROP TRIGGER IF EXISTS funnel_events_queue_embedding ON public.funnel_events;
CREATE TRIGGER funnel_events_queue_embedding
  AFTER INSERT ON public.funnel_events
  FOR EACH ROW EXECUTE FUNCTION queue_embedding_job();

-- Agency Knowledge
DROP TRIGGER IF EXISTS agency_knowledge_queue_embedding ON public.agency_knowledge;
DROP TRIGGER IF EXISTS agency_knowledge_queue_embedding ON public.agency_knowledge;
CREATE TRIGGER agency_knowledge_queue_embedding
  AFTER INSERT OR UPDATE ON public.agency_knowledge
  FOR EACH ROW EXECUTE FUNCTION queue_embedding_job();

-- Session Summaries
DROP TRIGGER IF EXISTS session_summaries_queue_embedding ON public.session_summaries;
DROP TRIGGER IF EXISTS session_summaries_queue_embedding ON public.session_summaries;
CREATE TRIGGER session_summaries_queue_embedding
  AFTER INSERT ON public.session_summaries
  FOR EACH ROW EXECUTE FUNCTION queue_embedding_job();

-- ─────────────────────────────────────────────
-- RLS POLICIES for new tables
-- ─────────────────────────────────────────────

-- agency_knowledge: Super Admin only
ALTER TABLE public.agency_knowledge ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS agency_knowledge_select ON public.agency_knowledge;
CREATE POLICY agency_knowledge_select ON public.agency_knowledge
  FOR SELECT USING (
    EXISTS (SELECT 1 FROM public.users WHERE id = auth.uid() AND role = 'super_admin')
  );

DROP POLICY IF EXISTS agency_knowledge_insert ON public.agency_knowledge;
CREATE POLICY agency_knowledge_insert ON public.agency_knowledge
  FOR INSERT WITH CHECK (
    EXISTS (SELECT 1 FROM public.users WHERE id = auth.uid() AND role = 'super_admin')
  );

DROP POLICY IF EXISTS agency_knowledge_update ON public.agency_knowledge;
CREATE POLICY agency_knowledge_update ON public.agency_knowledge
  FOR UPDATE USING (
    EXISTS (SELECT 1 FROM public.users WHERE id = auth.uid() AND role = 'super_admin')
  );

DROP POLICY IF EXISTS agency_knowledge_delete ON public.agency_knowledge;
CREATE POLICY agency_knowledge_delete ON public.agency_knowledge
  FOR DELETE USING (
    EXISTS (SELECT 1 FROM public.users WHERE id = auth.uid() AND role = 'super_admin')
  );

-- project_agent_config: Super Admin can manage; project members can view
ALTER TABLE public.project_agent_config ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS project_agent_config_select ON public.project_agent_config;
CREATE POLICY project_agent_config_select ON public.project_agent_config
  FOR SELECT USING (
    EXISTS (SELECT 1 FROM public.users WHERE id = auth.uid() AND role = 'super_admin')
    OR EXISTS (
      SELECT 1 FROM public.project_user_access
      WHERE project_id = project_agent_config.project_id AND user_id = auth.uid()
    )
  );

DROP POLICY IF EXISTS project_agent_config_update ON public.project_agent_config;
CREATE POLICY project_agent_config_update ON public.project_agent_config
  FOR UPDATE USING (
    EXISTS (SELECT 1 FROM public.users WHERE id = auth.uid() AND role = 'super_admin')
  );

-- token_usage_monthly: Super Admin sees all; users see own rows
ALTER TABLE public.token_usage_monthly ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS token_usage_select ON public.token_usage_monthly;
CREATE POLICY token_usage_select ON public.token_usage_monthly
  FOR SELECT USING (
    user_id = auth.uid()
    OR EXISTS (SELECT 1 FROM public.users WHERE id = auth.uid() AND role = 'super_admin')
  );

-- session_summaries: Users see their own; Super Admin sees all
ALTER TABLE public.session_summaries ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS session_summaries_select ON public.session_summaries;
CREATE POLICY session_summaries_select ON public.session_summaries
  FOR SELECT USING (
    user_id = auth.uid()
    OR EXISTS (SELECT 1 FROM public.users WHERE id = auth.uid() AND role = 'super_admin')
  );

-- connector_types: Any authenticated user can read; Super Admin can manage
ALTER TABLE public.connector_types ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS connector_types_select ON public.connector_types;
CREATE POLICY connector_types_select ON public.connector_types
  FOR SELECT USING (auth.uid() IS NOT NULL);

DROP POLICY IF EXISTS connector_types_manage ON public.connector_types;
CREATE POLICY connector_types_manage ON public.connector_types
  FOR ALL USING (
    EXISTS (SELECT 1 FROM public.users WHERE id = auth.uid() AND role = 'super_admin')
  );

-- ─────────────────────────────────────────────
-- UPDATED TIMESTAMP TRIGGERS
-- ─────────────────────────────────────────────
-- Create the set_updated_at() helper if it doesn't already exist
CREATE OR REPLACE FUNCTION set_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS set_agency_knowledge_updated_at ON public.agency_knowledge;
CREATE TRIGGER set_agency_knowledge_updated_at
  BEFORE UPDATE ON public.agency_knowledge
  FOR EACH ROW EXECUTE FUNCTION set_updated_at();

DROP TRIGGER IF EXISTS set_project_agent_config_updated_at ON public.project_agent_config;
CREATE TRIGGER set_project_agent_config_updated_at
  BEFORE UPDATE ON public.project_agent_config
  FOR EACH ROW EXECUTE FUNCTION set_updated_at();

DROP TRIGGER IF EXISTS set_token_usage_updated_at ON public.token_usage_monthly;
CREATE TRIGGER set_token_usage_updated_at
  BEFORE UPDATE ON public.token_usage_monthly
  FOR EACH ROW EXECUTE FUNCTION set_updated_at();
