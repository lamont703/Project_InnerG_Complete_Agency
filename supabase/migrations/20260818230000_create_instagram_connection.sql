-- The platform's own Instagram connection.
--
-- WHY A TABLE AND NOT AN ENV VAR. The token was in INSTAGRAM_ACCESS_TOKEN, and
-- that is precisely why it died: a long-lived Instagram token lasts 60 days and
-- must be refreshed before it lapses, but a refresh job cannot write to an
-- environment variable at runtime. A credential that has to rotate cannot live
-- somewhere that cannot be rotated. The stored token expired on 2026-05-23 and,
-- per Meta, an expired token can no longer be refreshed at all — the only route
-- back is a fresh OAuth authorisation.
--
-- ONE ROW. This is ShearQuery's own account, not a per-member connection like
-- gbp_connections. The singleton constraint makes that explicit rather than
-- leaving a table that silently accumulates three tokens and uses whichever
-- sorts first.
--
-- expires_at IS THE POINT OF THE WHOLE TABLE. It is what the refresh cron reads
-- and what a health check can alarm on. Without it, "is our Instagram working?"
-- is only answerable by making an API call and seeing it fail — which is how
-- three months went by.

create table if not exists public.instagram_connection (
  id int primary key default 1,
  constraint instagram_connection_singleton check (id = 1),

  -- "instagram_login" (graph.instagram.com, IGAA... tokens) or
  -- "facebook_login" (graph.facebook.com, via a Page). They are different APIs
  -- with different hosts and different scope names, and confusing them cost a
  -- debugging session: an audit script written for one reports "cannot parse
  -- access token" against the other, which reads as an expired credential.
  token_type text not null default 'instagram_login'
    check (token_type in ('instagram_login', 'facebook_login')),

  access_token text not null,
  -- Instagram Login tokens are refreshed in place rather than exchanged, so
  -- there is no separate refresh token to keep.
  expires_at timestamptz,

  ig_user_id text,
  username text,
  account_type text,

  -- Which scopes the authorisation actually granted. Instagram Login tokens do
  -- not enumerate their grants, so this records what was REQUESTED at connect
  -- time; treat it as a claim to verify, not a fact.
  scopes text[],

  last_refreshed_at timestamptz,
  last_refresh_error text,

  status text not null default 'connected'
    check (status in ('connected', 'expired', 'error', 'revoked')),

  updated_at timestamptz not null default now()
);

alter table public.instagram_connection enable row level security;

comment on table public.instagram_connection is
  'ShearQuery own Instagram account token. Single row. Lives here rather than in an env var because a 60-day token must be refreshable by a cron, and env vars are not writable at runtime.';
