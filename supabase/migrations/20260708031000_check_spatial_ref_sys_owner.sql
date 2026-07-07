CREATE OR REPLACE FUNCTION _check_spatial_owner()
RETURNS TABLE (table_name text, owner text, current_role_name text)
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT c.relname::text, pg_get_userbyid(c.relowner)::text, current_user::text
  FROM pg_class c
  JOIN pg_namespace n ON n.oid = c.relnamespace
  WHERE n.nspname = 'public' AND c.relname = 'spatial_ref_sys';
$$;
