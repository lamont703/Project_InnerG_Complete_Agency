-- Support messages (lib/support.ts): any signed-in member, of any account
-- type, can message ShearQuery from Claude or the /search chat. Every message
-- is kept here first, then emailed to info@innergcomplete.com and texted to
-- the owner, so a failed send never loses one.
--
-- Decided with the product owner 2026-10-01.

create table if not exists public.support_messages (
  id               uuid primary key default gen_random_uuid(),
  member_id        uuid references public.community_members(id) on delete set null,
  -- A snapshot of who sent it, so the message still reads if the member changes or goes.
  member_name      text,
  member_email     text,
  member_phone     text,
  audience         text,
  topic            text not null default 'other' check (topic in ('bug', 'account', 'billing', 'booking', 'question', 'other')),
  message          text not null check (char_length(message) between 1 and 4000),
  -- 'claude' (the connector) or 'site' (the /search chat).
  door             text not null default 'claude' check (door in ('claude', 'site')),
  status           text not null default 'new' check (status in ('new', 'replied', 'closed')),
  email_sent_at    timestamptz,
  sms_sent_at      timestamptz,
  notify_error     text,
  created_at       timestamptz not null default now()
);
create index if not exists idx_support_messages_member on public.support_messages (member_id, created_at desc);
create index if not exists idx_support_messages_new on public.support_messages (status, created_at desc);

alter table public.support_messages enable row level security;
