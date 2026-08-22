-- TIKTOK THROUGH GOHIGHLEVEL, WHILE THE NATIVE APP WAITS ON AUDIT.
--
-- lib/tiktok-publish.ts is finished and unusable. Until TikTok audits the app,
-- their rule is that "all content posted by unaudited clients will be
-- restricted to private viewing mode" — the post would succeed and nobody would
-- see it. GHL's TikTok integration is already audited and already connected to
-- this location, and has published 15 posts from it. So there are two routes to
-- one account, and this adds the second.
--
-- THEY MUST NEVER BOTH FIRE. Two enabled routes to the same TikTok account is
-- two copies of every video. lib/admin/publisher-targets.ts enforces the rule in
-- one place: when native 'tiktok' is enabled, 'tiktok_ghl' stands down and says
-- so in its outcome. That is deliberately a runtime rule rather than a database
-- constraint, because the switchover should be one flag flip — enable native and
-- the bridge retires itself — not a migration on approval day.
--
-- Seeded ENABLED, unlike native tiktok. This route works today; that is the
-- entire reason it exists.

alter table public.publisher_connections
  drop constraint if exists publisher_connections_platform_check;

alter table public.publisher_connections
  add constraint publisher_connections_platform_check
  check (platform in ('linkedin', 'x', 'gbp', 'tiktok', 'tiktok_ghl'));

insert into public.publisher_connections (platform, enabled, status, account_label)
values (
  'tiktok_ghl',
  true,
  'connected',
  'TikTok via GoHighLevel'
)
on conflict (platform) do nothing;

comment on constraint publisher_connections_platform_check on public.publisher_connections is
  'tiktok = the native TikTok API app, blocked on audit. tiktok_ghl = the same account reached through GoHighLevel, which is already audited. Enabling native automatically stands the GHL route down - see lib/admin/publisher-targets.ts.';
