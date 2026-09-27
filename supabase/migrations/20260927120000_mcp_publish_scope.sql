-- Let an owner publish to their own Google Business Profile from Claude.
--
-- THIS REVERSES A RULE WRITTEN FIVE DAYS AGO, ON PURPOSE. 20260922210000 said a
-- connection key could never publish: drafts would wait for approval on
-- shearquery.com. On 2026-09-27 the owner of this product decided approval
-- happens INSIDE Claude instead, because barbers live in Claude and will not
-- come to the website to click Approve — a draft queue nobody visits publishes
-- nothing.
--
-- What replaces the website approval, all in lib/gbp-changes.ts:
--   * Drafting and publishing are separate MCP tools. publish_change is
--     annotated destructive, so Claude asks the owner before each one.
--   * 'publish' is only on keys the owner minted with publishing switched on.
--     Existing keys are NOT upgraded here: widening a credential the owner
--     already pasted somewhere, without asking them, is the wrong default.
--   * A draft expires after 24 hours, publishes are capped per day, and every
--     publish emails the owner with the change and how to revoke the key.
--   * Every publish goes through lib/gbp-write.ts, which snapshots first, so
--     most surfaces can be undone.
--
-- The remaining exposure, stated plainly: the key lives in the connection URL,
-- so anyone holding a publish-enabled URL can publish. The email is how the
-- owner finds out; revoking at /account/claude is how they stop it. OAuth in
-- place of the URL key is the proper fix and is on the plan.

alter table public.mcp_connection_keys
  drop constraint if exists mcp_connection_keys_scopes_check;

alter table public.mcp_connection_keys
  add constraint mcp_connection_keys_scopes_check
    check (scopes <@ array['read','propose','publish'] and array_length(scopes, 1) >= 1);

comment on table public.mcp_connection_keys is
  'Per-owner credentials for the MCP server at /mcp. Only the SHA-256 hash is stored; the key lives in the connection URL the owner pastes into Claude. Scopes: read, propose, and publish only when the owner switched publishing on when creating the key.';

-- 'reverted': a published change that was undone from its snapshot. Kept as
-- its own status rather than folded into 'applied', because "this was live and
-- then taken back" is exactly what an owner reviewing their history needs.
alter table public.gbp_change_requests
  drop constraint if exists gbp_change_requests_status_check;

alter table public.gbp_change_requests
  add constraint gbp_change_requests_status_check
    check (status in ('pending', 'approved', 'applied', 'failed', 'rejected', 'reverted'));
