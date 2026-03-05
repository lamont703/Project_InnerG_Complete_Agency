-- ============================================================
-- Migration 008: Create Integrations Domain
-- Inner G Complete Agency — Client Intelligence Portal
-- ============================================================
-- Tables: ghl_contacts, social_accounts, integration_sync_log,
--         system_connections, client_db_connections
-- ============================================================

-- GHL CONTACTS (synced from Inner G's GHL CRM)
CREATE TABLE IF NOT EXISTS public.ghl_contacts (
  id                UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  project_id        UUID NOT NULL REFERENCES public.projects(id) ON DELETE CASCADE,
  ghl_contact_id    TEXT NOT NULL UNIQUE,
  email             TEXT,
  phone             TEXT,
  full_name         TEXT,
  synced_at         TIMESTAMPTZ NOT NULL DEFAULT now(),
  created_at        TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_ghl_contacts_project ON public.ghl_contacts(project_id);
CREATE INDEX IF NOT EXISTS idx_ghl_contacts_ghl_id ON public.ghl_contacts(ghl_contact_id);

-- SOCIAL ACCOUNTS (per-client connected social platforms)
CREATE TABLE IF NOT EXISTS public.social_accounts (
  id                      UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  project_id              UUID NOT NULL REFERENCES public.projects(id) ON DELETE CASCADE,
  platform                social_platform NOT NULL,
  handle                  TEXT NOT NULL,
  access_token_encrypted  TEXT NOT NULL,    -- AES-256 encrypted — server-side only
  token_expires_at        TIMESTAMPTZ,
  connected_at            TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE (project_id, platform)
);

CREATE INDEX IF NOT EXISTS idx_social_accounts_project ON public.social_accounts(project_id);

-- INTEGRATION SYNC LOG (audit trail of sync runs)
CREATE TABLE IF NOT EXISTS public.integration_sync_log (
  id                UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  project_id        UUID NOT NULL REFERENCES public.projects(id) ON DELETE CASCADE,
  integration       integration_source NOT NULL,
  status            sync_status NOT NULL,
  records_synced    INTEGER NOT NULL DEFAULT 0,
  error_message     TEXT,
  synced_at         TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_sync_log_project_time ON public.integration_sync_log(project_id, synced_at DESC);

-- SYSTEM CONNECTIONS (health status cards on dashboard)
CREATE TABLE IF NOT EXISTS public.system_connections (
  id            UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  project_id    UUID NOT NULL REFERENCES public.projects(id) ON DELETE CASCADE,
  label         TEXT NOT NULL,       -- e.g. "Database Connection"
  platform      TEXT NOT NULL,       -- e.g. "postgresql", "ghl", "instagram"
  status        connection_status NOT NULL DEFAULT 'active',
  latency_ms    INTEGER,
  checked_at    TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE (project_id, platform)
);

CREATE INDEX IF NOT EXISTS idx_system_connections_project ON public.system_connections(project_id);

-- CLIENT DB CONNECTIONS (KPI Aggregation — external client databases)
CREATE TABLE IF NOT EXISTS public.client_db_connections (
  id                          UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  project_id                  UUID NOT NULL REFERENCES public.projects(id) ON DELETE CASCADE,
  label                       TEXT NOT NULL,              -- e.g. "Kane's Production Postgres"
  db_type                     external_db_type NOT NULL,
  connection_url_encrypted    TEXT NOT NULL,              -- AES-256 encrypted via pgp_sym_encrypt
  aggregation_config          JSONB,                      -- JSON: which tables/columns to aggregate
  is_active                   BOOLEAN NOT NULL DEFAULT TRUE,
  created_at                  TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at                  TIMESTAMPTZ NOT NULL DEFAULT now()
);

DROP TRIGGER IF EXISTS client_db_connections_updated_at ON public.client_db_connections;
CREATE TRIGGER client_db_connections_updated_at
  BEFORE UPDATE ON public.client_db_connections
  FOR EACH ROW EXECUTE FUNCTION update_updated_at();

CREATE INDEX IF NOT EXISTS idx_client_db_connections_project ON public.client_db_connections(project_id);

COMMENT ON TABLE public.client_db_connections IS
  'External client database configuration for KPI Aggregation. Connection URLs are AES-256 encrypted and NEVER returned to the browser.';
COMMENT ON COLUMN public.client_db_connections.connection_url_encrypted IS
  'Encrypted via pgp_sym_encrypt(). Only decrypted server-side inside Edge Functions during scheduled aggregation runs.';
COMMENT ON COLUMN public.client_db_connections.aggregation_config IS
  'JSON config specifying which tables/metrics to pull from the external DB and map to campaign_metrics columns.';
