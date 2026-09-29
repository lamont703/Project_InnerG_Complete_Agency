-- Supabase security advisor, 2026-09-29: three public tables without RLS.
--
-- pinterest_pins and llm_bot_requests: every reader and writer uses the
-- service-role key, which bypasses RLS —
--   pinterest_pins: scripts/generate_pinterest_pins.js,
--     scripts/post_pinterest_pins.ts, app/pinterest-queue/actions.ts
--     (service role; its anon fallback is exactly what this now blocks)
--   llm_bot_requests: read only by app/pixel-analytics/actions.ts (service
--     role); nothing writes it any more (agent_requests replaced it)
-- so RLS with NO policies closes them to the public anon key without
-- changing anything the app does.
alter table public.pinterest_pins   enable row level security;
alter table public.llm_bot_requests enable row level security;

-- spatial_ref_sys belongs to the PostGIS extension, not to this app, and
-- ALTER on it fails with "must be owner of table" under the migration role
-- (found 2026-07-08, see 20260708030000_fix_unrestricted_tables.sql). PostGIS
-- is in use (the employment-matching distance search), so dropping or moving
-- the extension isn't safe. It holds only public coordinate-system
-- definitions — nothing of ours — so the real risk is the API roles WRITING to
-- it. Take their write access away where we're allowed to; if we're not, say
-- so and carry on rather than failing the whole push.
do $$
begin
  revoke insert, update, delete, truncate on table public.spatial_ref_sys from anon, authenticated;
  raise notice 'spatial_ref_sys: write access removed from anon and authenticated';
exception when insufficient_privilege then
  raise notice 'spatial_ref_sys: not owner, left as is — needs Supabase to relocate PostGIS';
end $$;
