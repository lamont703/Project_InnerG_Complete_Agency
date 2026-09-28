-- One-time photo upload sessions for the MCP connector.
--
-- WHY THIS EXISTS. A photo an owner drops into a Claude chat never reaches a
-- connector's tool: MCP has no way to send a file from the user's device, and
-- our JSON-RPC bodies are capped at 32KB anyway. So upload_photo opens a
-- session instead. Its token is carried two ways, and both lead to the same
-- endpoint (/api/mcp-upload/<token>):
--
--   * the upload box, an MCP App rendered inside the chat, which POSTs the
--     file directly to shearquery.com
--   * a plain link to /upload/<token>, for hosts that do not render MCP Apps
--     or that block the box from reaching our domain
--
-- The token is the credential, so: only its hash is stored, it lasts 30
-- minutes, it is good for ONE photo, and it can only create a DRAFT — the
-- photo still goes live only through publish_change and the owner's OK.

create table if not exists public.mcp_upload_sessions (
  token_hash          text primary key,
  community_member_id uuid not null references public.community_members(id) on delete cascade,
  -- The connection that opened it, recorded on the draft as claude:<prefix>
  -- so the change history can name it and offer to revoke it.
  key_prefix          text not null,
  -- Whether that connection may publish, so the draft's closing instruction
  -- tells the truth about what happens next.
  can_publish         boolean not null default false,
  -- Suggested by Claude when it opened the session; the owner can change it.
  category            text,
  expires_at          timestamptz not null,
  used_at             timestamptz,
  change_id           uuid references public.gbp_change_requests(id) on delete set null,
  created_at          timestamptz not null default now()
);

create index if not exists idx_mcp_upload_sessions_member
  on public.mcp_upload_sessions (community_member_id, created_at desc);

alter table public.mcp_upload_sessions enable row level security;
