-- Supabase security advisor flagged 4 public tables as exposed via the
-- API with RLS disabled. Verified with the anon key directly: all 4 were
-- genuinely readable by anyone holding the public anon key (which is
-- embedded in the client bundle, so trivially obtainable) — not just a
-- theoretical lint warning.
--
-- spatial_ref_sys (the 4th flagged table, a PostGIS system table) is
-- handled separately — ALTER on it fails with "must be owner of table"
-- under the migration role, since it's owned by the extension, not
-- application code. See the follow-up migration/manual step for that one.
--
-- connector_sync_log: internal agency-dashboard sync log (connector_id,
-- error messages, project_id) — only ever read/written from
-- _shared/lib/db/operations/connectors.ts (an edge function, service_role).
-- No legitimate anon/authenticated access exists today, so RLS with zero
-- public policies matches current real usage exactly.
ALTER TABLE public.connector_sync_log ENABLE ROW LEVEL SECURITY;

-- pixel_analytics_settings: the reset_at singleton this session's pixel
-- analytics work reads. Only ever read via SECURITY DEFINER functions
-- (which bypass RLS regardless) or the admin dashboard's service_role
-- client — no anon/authenticated access needed.
ALTER TABLE public.pixel_analytics_settings ENABLE ROW LEVEL SECURITY;

-- ai_tier_limits: plan-tier reference data (token limits + marketing
-- descriptions), no client-specific or secret data. check_token_budget/
-- get_token_usage_summary (019_token_budget_enforcement.sql) join this
-- table and are NOT security definer, and are called from the AI chat
-- agent running as the authenticated user — so a public SELECT policy is
-- required for those budget checks to keep working, not just permissible.
-- Writes stay service_role-only (no write policy).
ALTER TABLE public.ai_tier_limits ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Anyone can read tier limits" ON public.ai_tier_limits
  FOR SELECT TO anon, authenticated USING (true);

-- Diagnostic-only, not meant to stick around as permanent infrastructure.
DROP FUNCTION IF EXISTS _audit_rls_status();
