-- Per-member Instagram connections, so an owner's Claude can read their own
-- Instagram stats through ShearQuery.
--
-- NOT instagram_connection. That table is a single row holding SHEARQUERY'S
-- OWN account token, which the publisher and the comment/DM agents use. A
-- member's token must never land there: one member connecting would replace
-- the platform's credentials. This table is one row per member.
--
-- PRIVATE TESTING FIRST. Serving Instagram accounts we do not own needs Meta's
-- Advanced Access (App Review). Until then the connect route and the MCP tools
-- are limited to an allowlist in lib/instagram-member.ts.
--
-- The token is a 60-day Instagram Login token, refreshed before it lapses by
-- the weekly instagram-token-refresh cron and on use. An expired one cannot be
-- refreshed (Meta), so status 'expired' means the owner must reconnect.
--
-- RLS ON WITH NO POLICIES: service-role only, same as gbp_connections.

create table if not exists public.member_instagram_connections (
  community_member_id uuid primary key references public.community_members(id) on delete cascade,
  access_token        text not null,
  ig_user_id          text,
  username            text,
  account_type        text,
  scopes              text[] not null default '{}',
  expires_at          timestamptz,
  last_refreshed_at   timestamptz,
  last_refresh_error  text,
  status              text not null default 'connected',
  created_at          timestamptz not null default now(),
  updated_at          timestamptz not null default now(),
  constraint member_instagram_connections_status_check
    check (status in ('connected', 'expired', 'error'))
);

alter table public.member_instagram_connections enable row level security;

comment on table public.member_instagram_connections is
  'One Instagram Login token per member, for reading their own Instagram insights over MCP. Never the platform account — that is instagram_connection.';
