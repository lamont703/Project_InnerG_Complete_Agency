-- ============================================================
-- Migration 012: Row-Level Security (RLS) Policies
-- Inner G Complete Agency — Client Intelligence Portal
-- ============================================================
-- Enforces data isolation between clients, developers,
-- and the super_admin across all 20 tables.
-- ============================================================

-- Helper function: get current user's role
CREATE OR REPLACE FUNCTION auth_role()
RETURNS user_role AS $$
  SELECT role FROM public.users WHERE id = auth.uid()
$$ LANGUAGE SQL SECURITY DEFINER STABLE;

-- Helper function: check if current user is super_admin or developer
CREATE OR REPLACE FUNCTION is_inner_g_team()
RETURNS BOOLEAN AS $$
  SELECT auth_role() IN ('super_admin', 'developer')
$$ LANGUAGE SQL SECURITY DEFINER STABLE;

-- ── Enable RLS on all tables ──────────────────────────────────
ALTER TABLE public.users ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.clients ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.projects ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.developer_client_access ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.project_user_access ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.campaigns ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.campaign_metrics ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.funnel_stages ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.funnel_events ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.ai_signals ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.growth_audit_leads ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.activity_log ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.ghl_contacts ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.social_accounts ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.integration_sync_log ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.system_connections ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.client_db_connections ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.chat_sessions ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.chat_messages ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.document_embeddings ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.embedding_jobs ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.invite_links ENABLE ROW LEVEL SECURITY;

-- ── Policy Creation Helper ────────────────────────────────────
-- Since CREATE POLICY IF NOT EXISTS doesn't exist, we drop first.
-- ──────────────────────────────────────────────────────────────

-- USERS
DROP POLICY IF EXISTS users_self_read ON public.users;
CREATE POLICY users_self_read ON public.users FOR SELECT USING (id = auth.uid());
DROP POLICY IF EXISTS users_super_admin_read ON public.users;
CREATE POLICY users_super_admin_read ON public.users FOR SELECT USING (auth_role() = 'super_admin');
DROP POLICY IF EXISTS users_super_admin_write ON public.users;
CREATE POLICY users_super_admin_write ON public.users FOR ALL USING (auth_role() = 'super_admin');
DROP POLICY IF EXISTS users_self_update ON public.users;
CREATE POLICY users_self_update ON public.users FOR UPDATE USING (id = auth.uid());

-- CLIENTS
DROP POLICY IF EXISTS clients_super_admin ON public.clients;
CREATE POLICY clients_super_admin ON public.clients FOR ALL USING (auth_role() = 'super_admin');
DROP POLICY IF EXISTS clients_developer_read ON public.clients;
CREATE POLICY clients_developer_read ON public.clients FOR SELECT USING (auth_role() = 'developer' AND id IN (SELECT client_id FROM public.developer_client_access WHERE developer_id = auth.uid()));
DROP POLICY IF EXISTS clients_client_read ON public.clients;
CREATE POLICY clients_client_read ON public.clients FOR SELECT USING (auth_role() IN ('client_admin', 'client_viewer') AND id IN (SELECT c.id FROM public.clients c JOIN public.projects p ON p.client_id = c.id JOIN public.project_user_access pua ON pua.project_id = p.id WHERE pua.user_id = auth.uid()));

-- PROJECTS
DROP POLICY IF EXISTS projects_super_admin ON public.projects;
CREATE POLICY projects_super_admin ON public.projects FOR ALL USING (auth_role() = 'super_admin');
DROP POLICY IF EXISTS projects_developer_read ON public.projects;
CREATE POLICY projects_developer_read ON public.projects FOR SELECT USING (auth_role() = 'developer' AND client_id IN (SELECT client_id FROM public.developer_client_access WHERE developer_id = auth.uid()));
DROP POLICY IF EXISTS projects_client_read ON public.projects;
CREATE POLICY projects_client_read ON public.projects FOR SELECT USING (auth_role() IN ('client_admin', 'client_viewer') AND id IN (SELECT project_id FROM public.project_user_access WHERE user_id = auth.uid()));

-- SENSITIVE TABLES
DROP POLICY IF EXISTS client_db_connections_team_only ON public.client_db_connections;
CREATE POLICY client_db_connections_team_only ON public.client_db_connections FOR ALL USING (is_inner_g_team());
DROP POLICY IF EXISTS invite_links_creator ON public.invite_links;
CREATE POLICY invite_links_creator ON public.invite_links FOR SELECT USING (auth_role() = 'super_admin' OR invited_by = auth.uid());
DROP POLICY IF EXISTS invite_links_super_admin_write ON public.invite_links;
CREATE POLICY invite_links_super_admin_write ON public.invite_links FOR ALL USING (auth_role() = 'super_admin');
DROP POLICY IF EXISTS growth_audit_leads_team_only ON public.growth_audit_leads;
CREATE POLICY growth_audit_leads_team_only ON public.growth_audit_leads FOR ALL USING (is_inner_g_team());
DROP POLICY IF EXISTS document_embeddings_team_only ON public.document_embeddings;
CREATE POLICY document_embeddings_team_only ON public.document_embeddings FOR ALL USING (is_inner_g_team());
DROP POLICY IF EXISTS embedding_jobs_team_only ON public.embedding_jobs;
CREATE POLICY embedding_jobs_team_only ON public.embedding_jobs FOR ALL USING (is_inner_g_team());

-- PROJECT-SCOPED HELPER
CREATE OR REPLACE FUNCTION can_access_project(p_project_id UUID)
RETURNS BOOLEAN AS $$
  SELECT CASE auth_role()
    WHEN 'super_admin' THEN TRUE
    WHEN 'developer' THEN
      EXISTS (
        SELECT 1 FROM public.projects pr
        JOIN public.developer_client_access dca ON dca.client_id = pr.client_id
        WHERE pr.id = p_project_id AND dca.developer_id = auth.uid()
      )
    ELSE  -- client_admin, client_viewer
      EXISTS (
        SELECT 1 FROM public.project_user_access pua
        WHERE pua.project_id = p_project_id AND pua.user_id = auth.uid()
      )
  END
$$ LANGUAGE SQL SECURITY DEFINER STABLE;

-- PROJECT-SCOPED POLICIES
DROP POLICY IF EXISTS ai_signals_read ON public.ai_signals;
CREATE POLICY ai_signals_read ON public.ai_signals FOR SELECT USING (can_access_project(project_id));
DROP POLICY IF EXISTS ai_signals_team_write ON public.ai_signals;
CREATE POLICY ai_signals_team_write ON public.ai_signals FOR ALL USING (is_inner_g_team());
DROP POLICY IF EXISTS campaigns_read ON public.campaigns;
CREATE POLICY campaigns_read ON public.campaigns FOR SELECT USING (can_access_project(project_id));
DROP POLICY IF EXISTS campaigns_team_write ON public.campaigns;
CREATE POLICY campaigns_team_write ON public.campaigns FOR ALL USING (is_inner_g_team());
DROP POLICY IF EXISTS campaign_metrics_read ON public.campaign_metrics;
CREATE POLICY campaign_metrics_read ON public.campaign_metrics FOR SELECT USING (can_access_project((SELECT project_id FROM public.campaigns WHERE id = campaign_id)));
DROP POLICY IF EXISTS campaign_metrics_team_write ON public.campaign_metrics;
CREATE POLICY campaign_metrics_team_write ON public.campaign_metrics FOR ALL USING (is_inner_g_team());
DROP POLICY IF EXISTS activity_log_read ON public.activity_log;
CREATE POLICY activity_log_read ON public.activity_log FOR SELECT USING (can_access_project(project_id));
DROP POLICY IF EXISTS activity_log_team_write ON public.activity_log;
CREATE POLICY activity_log_team_write ON public.activity_log FOR INSERT WITH CHECK (is_inner_g_team());
DROP POLICY IF EXISTS system_connections_read ON public.system_connections;
CREATE POLICY system_connections_read ON public.system_connections FOR SELECT USING (can_access_project(project_id));
DROP POLICY IF EXISTS system_connections_team_write ON public.system_connections;
CREATE POLICY system_connections_team_write ON public.system_connections FOR ALL USING (is_inner_g_team());
DROP POLICY IF EXISTS chat_sessions_own ON public.chat_sessions;
CREATE POLICY chat_sessions_own ON public.chat_sessions FOR ALL USING (user_id = auth.uid());
DROP POLICY IF EXISTS chat_messages_own ON public.chat_messages;
CREATE POLICY chat_messages_own ON public.chat_messages FOR ALL USING (session_id IN (SELECT id FROM public.chat_sessions WHERE user_id = auth.uid()));
