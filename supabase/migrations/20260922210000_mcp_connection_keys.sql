-- Per-owner connection keys for the MCP server at /mcp.
--
-- WHY A KEY AND NOT OAUTH, STATED PLAINLY SO IT CAN BE REVISITED. The MCP
-- authorization spec (draft, fetched 2026-09-22) makes authorization OPTIONAL,
-- and where a server does implement it, it must act as an OAuth 2.1 resource
-- server: protected resource metadata, an authorization server, PKCE, resource
-- indicators. That is the right destination. It is not the right first step,
-- because of what the CLIENT side accepts today:
--
--   * Claude Code accepts a static header
--       (`claude mcp add --transport http … --header "Authorization: Bearer …"`)
--   * claude.ai / Desktop / mobile custom connectors accept a URL, plus an
--     OPTIONAL OAuth client id and secret under Advanced settings — and no
--     custom headers at all.
--
-- Our owner is a barber on claude.ai, not a developer at a terminal. The only
-- credential that audience can actually supply is one embedded in the URL they
-- paste, which is why the connection URL carries the key:
--
--       https://shearquery.com/mcp/k/<key>
--
-- THAT MAKES THE URL A BEARER CREDENTIAL, and every property of this table
-- follows from taking that seriously:
--
--  1. Only the SHA-256 hash is stored. A leaked database dump does not yield a
--     working connection URL. The key is shown once, at the moment it is minted,
--     and never again — there is no "reveal" endpoint to write later.
--  2. key_prefix exists so the owner can tell two keys apart in the UI without
--     us holding the secret. It is the first 10 characters, which is not enough
--     to guess the remaining entropy.
--  3. Revocation is a column, not a delete. "This key was used, then revoked on
--     the 3rd" is a fact worth keeping; a deleted row answers nothing.
--  4. last_used_at is the only way an owner can notice a key being used by
--     something they do not recognise. It is written on every resolve.
--  5. scopes NEVER contains a write scope. See the constraint below — that is
--     the load-bearing line in this file.
--
-- WHAT THE KEY CANNOT DO. It identifies the owner to the MCP server; it does
-- not authorise publishing anything to Google. A change proposed through MCP
-- lands in gbp_change_requests as 'pending' and is applied only after the owner
-- approves it on shearquery.com, outside the model's reach. So the worst case
-- for a leaked key is disclosure of that owner's own listing data plus a queue
-- of drafts they did not ask for — bad, revocable, and not the same kind of
-- event as a stranger rewriting their live profile.
--
-- RLS ON WITH NO POLICIES, matching gbp_connections and gbp_write_snapshots:
-- reached only through our server routes on the service-role key.

create table if not exists public.mcp_connection_keys (
  id                  uuid primary key default gen_random_uuid(),
  community_member_id uuid not null references public.community_members(id) on delete cascade,

  -- SHA-256 hex of the full key. Unique so a mint collision fails loudly
  -- instead of silently pointing one key at two owners.
  key_hash            text not null unique,
  -- First 10 characters of the key, for display only.
  key_prefix          text not null,

  -- The owner's own words for where it is installed: "my laptop Claude",
  -- "front desk iPad". Helps them decide which one to revoke.
  label               text,

  -- read    → this owner's own listing, audit, reviews, photos, change history
  -- propose → write a PENDING row to gbp_change_requests; touches nothing live
  --
  -- There is deliberately no 'write' or 'publish' scope. Adding one would mean
  -- a key alone could change a live business profile, which is the exact thing
  -- the approval step exists to prevent. If a future flow needs unattended
  -- publishing, it gets its own table and its own consent record — not a third
  -- string in this array.
  scopes              text[] not null default array['read','propose'],

  created_at          timestamptz not null default now(),
  last_used_at        timestamptz,
  revoked_at          timestamptz,

  constraint mcp_connection_keys_scopes_check
    check (scopes <@ array['read','propose'] and array_length(scopes, 1) >= 1)
);

-- The hot path: resolve a key on every single MCP request. Partial on the
-- live keys because a revoked key must never resolve, so it need not be found.
create index if not exists idx_mcp_connection_keys_live
  on public.mcp_connection_keys (key_hash)
  where revoked_at is null;

create index if not exists idx_mcp_connection_keys_member
  on public.mcp_connection_keys (community_member_id, created_at desc);

alter table public.mcp_connection_keys enable row level security;

comment on table public.mcp_connection_keys is
  'Per-owner credentials for the MCP server at /mcp. Only the SHA-256 hash is stored; the key lives in the connection URL the owner pastes into Claude. Scopes are read and propose only — a key can never publish to Google.';
