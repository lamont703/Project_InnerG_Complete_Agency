-- One row per Confirm button pressed in the site chat (lib/chat/account-tools.ts).
-- The primary key is the action's one-time nonce, so a double-tap on "Book"
-- can't run the booking twice. Kept as a record of what members approved.
create table if not exists public.chat_confirmed_actions (
  nonce               text primary key,
  community_member_id uuid not null references public.community_members(id) on delete cascade,
  tool                text not null,
  created_at          timestamptz not null default now()
);
create index if not exists idx_chat_confirmed_actions_member on public.chat_confirmed_actions (community_member_id, created_at desc);
alter table public.chat_confirmed_actions enable row level security;
