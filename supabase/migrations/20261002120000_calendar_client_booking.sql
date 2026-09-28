-- Client booking for the ShearQuery calendar: clients book real times on a
-- pro's calendar, from the listing's Book button or from their own Claude.
--
-- WHO A CLIENT IS. A phone number proven by a text code. Not a name — anyone
-- can type any name — and not a login alone, because a client booking from
-- the website has no account. The same verified phone links a client's web
-- bookings and Claude bookings into one record on the pro's calendar.
--
-- Everything is still limited to calendars whose owner is on the calendar
-- allowlist (lib/calendar/access.ts).
--
-- RLS ON WITH NO POLICIES: service-role only.

-- A client record can belong to a ShearQuery member, when they booked while
-- signed in (from Claude). Lets "my bookings" find them across pros.
alter table public.calendar_clients
  add column if not exists community_member_id uuid references public.community_members(id) on delete set null;
create index if not exists idx_calendar_clients_member on public.calendar_clients (community_member_id);

alter table public.calendar_appointments
  -- The one-time link texted to the client to view or cancel. Hash only.
  add column if not exists manage_token_hash text,
  add column if not exists booked_by_member_id uuid references public.community_members(id) on delete set null,
  add column if not exists client_notified_at timestamptz,
  add column if not exists pro_notified_at timestamptz,
  add column if not exists reminder_sent_at timestamptz,
  add column if not exists notify_error text,
  add column if not exists cancelled_by text;
create unique index if not exists uq_calendar_appointments_manage_token
  on public.calendar_appointments (manage_token_hash) where manage_token_hash is not null;
-- The reminder cron's scan: live appointments not yet reminded.
create index if not exists idx_calendar_appointments_reminders
  on public.calendar_appointments (starts_at) where reminder_sent_at is null and status in ('booked', 'confirmed');

-- Text codes proving a phone. One row per code sent; the hash only.
create table if not exists public.calendar_phone_codes (
  id          uuid primary key default gen_random_uuid(),
  phone       text not null,
  code_hash   text not null,
  -- Who asked: a member (Claude) or an IP (website), for rate limiting.
  community_member_id uuid references public.community_members(id) on delete cascade,
  requester_ip text,
  attempts    int not null default 0,
  expires_at  timestamptz not null,
  verified_at timestamptz,
  created_at  timestamptz not null default now()
);
create index if not exists idx_calendar_phone_codes_phone on public.calendar_phone_codes (phone, created_at desc);
create index if not exists idx_calendar_phone_codes_ip on public.calendar_phone_codes (requester_ip, created_at desc);

-- A member's proven phone, for booking from Claude without a code every time.
create table if not exists public.member_verified_phones (
  community_member_id uuid primary key references public.community_members(id) on delete cascade,
  phone       text not null,
  verified_at timestamptz not null default now()
);

alter table public.calendar_phone_codes   enable row level security;
alter table public.member_verified_phones enable row level security;
