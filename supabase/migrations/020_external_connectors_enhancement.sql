-- ============================================================
-- Migration 020: External Connectors Enhancement
-- Inner G Complete Agency — Client Intelligence Portal
-- ============================================================
-- Enhances connector_types with config_schema for each provider,
-- adds sync-related columns to client_db_connections, and creates
-- a connector_sync_log table for audit trails.
-- ============================================================

-- ─────────────────────────────────────────────
-- Update connector_types with config schemas
-- ─────────────────────────────────────────────
UPDATE public.connector_types
SET config_schema = '{
  "required": ["supabase_url", "supabase_service_role_key"],
  "properties": {
    "supabase_url": { "type": "string", "label": "Supabase URL", "placeholder": "https://xxxx.supabase.co" },
    "supabase_service_role_key": { "type": "string", "label": "Service Role Key", "placeholder": "eyJ...", "sensitive": true },
    "tables_to_sync": { "type": "array", "label": "Tables to Sync", "items": { "type": "string" }, "default": ["users", "orders", "products"] }
  }
}'::jsonb
WHERE provider = 'supabase';

UPDATE public.connector_types
SET config_schema = '{
  "required": ["api_key", "location_id"],
  "properties": {
    "api_key": { "type": "string", "label": "GHL API Key", "placeholder": "Your GHL API Key", "sensitive": true },
    "location_id": { "type": "string", "label": "Location ID", "placeholder": "GHL Location ID" },
    "sync_contacts": { "type": "boolean", "label": "Sync Contacts", "default": true },
    "sync_opportunities": { "type": "boolean", "label": "Sync Opportunities", "default": true },
    "sync_pipelines": { "type": "boolean", "label": "Sync Pipelines", "default": false }
  }
}'::jsonb
WHERE provider = 'ghl';

UPDATE public.connector_types
SET config_schema = '{
  "required": ["connection_url"],
  "properties": {
    "connection_url": { "type": "string", "label": "Connection URL", "placeholder": "postgres://user:pass@host:5432/db", "sensitive": true },
    "tables_to_sync": { "type": "array", "label": "Tables to Sync", "items": { "type": "string" } }
  }
}'::jsonb
WHERE provider = 'postgres';

-- ─────────────────────────────────────────────
-- Add sync-related columns to client_db_connections
-- ─────────────────────────────────────────────
ALTER TABLE public.client_db_connections
  ADD COLUMN IF NOT EXISTS sync_schedule TEXT DEFAULT 'daily',
  ADD COLUMN IF NOT EXISTS last_synced_at TIMESTAMPTZ,
  ADD COLUMN IF NOT EXISTS sync_config JSONB DEFAULT '{}'::jsonb,
  ADD COLUMN IF NOT EXISTS sync_status TEXT DEFAULT 'pending';

COMMENT ON COLUMN public.client_db_connections.sync_schedule IS
  'How often to sync: daily, hourly, manual. Used by the scheduled sync handler.';
COMMENT ON COLUMN public.client_db_connections.sync_config IS
  'Provider-specific configuration (credentials, tables, etc). Encrypted fields stored here.';
COMMENT ON COLUMN public.client_db_connections.sync_status IS
  'Current status: pending, syncing, success, error.';

-- ─────────────────────────────────────────────
-- TABLE: connector_sync_log
-- Detailed audit trail for connector sync runs
-- ─────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS public.connector_sync_log (
  id                UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  connection_id     UUID NOT NULL REFERENCES public.client_db_connections(id) ON DELETE CASCADE,
  project_id        UUID REFERENCES public.projects(id) ON DELETE CASCADE,
  connector_type    TEXT NOT NULL,
  status            TEXT NOT NULL DEFAULT 'running',
  records_synced    INTEGER NOT NULL DEFAULT 0,
  tables_synced     TEXT[],
  duration_ms       INTEGER,
  error_message     TEXT,
  started_at        TIMESTAMPTZ NOT NULL DEFAULT now(),
  completed_at      TIMESTAMPTZ
);

CREATE INDEX IF NOT EXISTS idx_connector_sync_log_connection
  ON public.connector_sync_log(connection_id, started_at DESC);
CREATE INDEX IF NOT EXISTS idx_connector_sync_log_project
  ON public.connector_sync_log(project_id, started_at DESC);

COMMENT ON TABLE public.connector_sync_log IS
  'Detailed audit trail of each connector sync run — tracks records synced, duration, errors, and which tables were processed.';
