-- Temporary diagnostic helper to find exactly which public tables are
-- exposed via the API without RLS enabled (Supabase's "RLS Disabled in
-- Public" advisory). Read-only, service_role only, dropped once the audit
-- is done — not meant to stick around as permanent infrastructure.
CREATE OR REPLACE FUNCTION _audit_rls_status()
RETURNS TABLE (table_name text, rls_enabled boolean, row_estimate bigint)
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT
    c.relname::text,
    c.relrowsecurity,
    c.reltuples::bigint
  FROM pg_class c
  JOIN pg_namespace n ON n.oid = c.relnamespace
  WHERE n.nspname = 'public'
    AND c.relkind = 'r'
  ORDER BY c.relrowsecurity ASC, c.relname ASC;
$$;
