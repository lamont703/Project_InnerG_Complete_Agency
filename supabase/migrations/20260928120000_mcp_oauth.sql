-- OAuth sign-in for the MCP server, replacing the key-in-the-URL as the way an
-- owner connects Claude.
--
-- WHY. A connection key lives in the URL the owner pastes, so the URL is the
-- credential: it leaks into screenshots and chats, and with publishing on, a
-- leaked URL can change a live Google profile. With OAuth the owner signs in to
-- ShearQuery and taps Allow; Claude receives a token directly and never shows
-- it. Access tokens last an hour, refresh tokens rotate on every use.
--
-- Read before changing any of this (fetched 2026-09-28):
--   https://modelcontextprotocol.io/specification/2026-07-28/basic/authorization
--   https://claude.com/docs/connectors/building/authentication
--   https://claude.com/docs/connectors/building/lazy-authentication
--
-- Clients identify themselves with a Client ID Metadata Document (an https URL
-- as client_id), so there is no clients table: nothing is registered ahead of
-- time. Dynamic Client Registration is deprecated in the current spec and not
-- offered.
--
-- ONLY HASHES ARE STORED, same rule as mcp_connection_keys. A database dump
-- yields no working code or token.
--
-- RLS ON WITH NO POLICIES: reached only through server routes on the
-- service-role key.

-- One row per owner-and-app the owner has allowed. This is what the owner sees
-- and revokes on /account/claude; every token hangs off it.
create table if not exists public.mcp_oauth_grants (
  id                  uuid primary key default gen_random_uuid(),
  community_member_id uuid not null references public.community_members(id) on delete cascade,
  client_id           text not null,
  -- The HOST of client_id, which is what the consent screen showed. The
  -- document's own client_name is self-asserted and is not trusted for display.
  client_host         text not null,
  -- Same vocabulary as mcp_connection_keys.scopes, so the MCP server treats a
  -- grant and a key identically once resolved.
  scopes              text[] not null,
  created_at          timestamptz not null default now(),
  last_used_at        timestamptz,
  revoked_at          timestamptz,
  constraint mcp_oauth_grants_scopes_check
    check (scopes <@ array['read','propose','publish'] and array_length(scopes, 1) >= 1)
);

create index if not exists idx_mcp_oauth_grants_member
  on public.mcp_oauth_grants (community_member_id, created_at desc);

-- Authorization codes: single use, minutes long, bound to the PKCE challenge,
-- the redirect URI and the resource they were issued for.
create table if not exists public.mcp_oauth_codes (
  code_hash       text primary key,
  grant_id        uuid not null references public.mcp_oauth_grants(id) on delete cascade,
  client_id       text not null,
  redirect_uri    text not null,
  code_challenge  text not null,
  resource        text not null,
  scopes          text[] not null,
  expires_at      timestamptz not null,
  used_at         timestamptz,
  created_at      timestamptz not null default now()
);

-- Access and refresh tokens. A refresh token is rotated on use: the old one is
-- marked used and a new one issued. A USED refresh token presented again means
-- it was copied, so the whole grant is revoked (OAuth 2.1 reuse detection).
create table if not exists public.mcp_oauth_tokens (
  token_hash  text primary key,
  grant_id    uuid not null references public.mcp_oauth_grants(id) on delete cascade,
  kind        text not null,
  resource    text not null,
  scopes      text[] not null,
  expires_at  timestamptz not null,
  used_at     timestamptz,
  created_at  timestamptz not null default now(),
  constraint mcp_oauth_tokens_kind_check check (kind in ('access', 'refresh'))
);

create index if not exists idx_mcp_oauth_tokens_grant on public.mcp_oauth_tokens (grant_id);

alter table public.mcp_oauth_grants enable row level security;
alter table public.mcp_oauth_codes  enable row level security;
alter table public.mcp_oauth_tokens enable row level security;

comment on table public.mcp_oauth_grants is
  'An owner''s permission for one MCP client (e.g. Claude) to act on their ShearQuery account. Revoking it kills every token issued under it.';
