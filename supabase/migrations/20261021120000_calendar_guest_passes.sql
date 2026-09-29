-- Guest passes: after a client proves their phone with one text code, their
-- AI assistant gets a short-lived pass (lib/calendar/client-booking.ts) so it
-- can list, reschedule, cancel or book without a fresh code for each step —
-- codes are single-use, and texting one per action would be both annoying
-- and costly. Hash only; the pass itself lives in the conversation.
--
-- RLS ON WITH NO POLICIES: service-role only.

create table if not exists public.calendar_guest_passes (
  token_hash text primary key,
  phone      text not null,
  expires_at timestamptz not null,
  created_at timestamptz not null default now()
);
create index if not exists idx_calendar_guest_passes_phone on public.calendar_guest_passes (phone, expires_at desc);

alter table public.calendar_guest_passes enable row level security;
