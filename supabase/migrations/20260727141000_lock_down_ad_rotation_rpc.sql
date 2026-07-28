-- Lock down claim_ad_rotation_slot. Granting EXECUTE to service_role in
-- 20260727140000 was not enough: Postgres grants EXECUTE on a new function to
-- PUBLIC by default, so anon/authenticated could call it too — and because it's
-- SECURITY DEFINER, a visitor could spin a placement's cursor (skewing whose ad
-- shows) or write arbitrary cursor rows straight past the table's RLS. Verified
-- against the live database with the anon key before this fix.
--
-- Ads are only ever served by the service-role admin client, so nothing else
-- needs to call this.

REVOKE ALL ON FUNCTION public.claim_ad_rotation_slot(text, text, uuid[], integer) FROM PUBLIC;
REVOKE ALL ON FUNCTION public.claim_ad_rotation_slot(text, text, uuid[], integer) FROM anon;
REVOKE ALL ON FUNCTION public.claim_ad_rotation_slot(text, text, uuid[], integer) FROM authenticated;
GRANT EXECUTE ON FUNCTION public.claim_ad_rotation_slot(text, text, uuid[], integer) TO service_role;

-- Clear anything written through that window before it was closed (cursor rows
-- are pure serving state — dropping one just restarts that pool's cycle).
DELETE FROM public.ad_rotation_cursors
WHERE rotation_key NOT LIKE '%:%';
