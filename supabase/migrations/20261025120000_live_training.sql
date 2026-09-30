-- AI Barber Beauty Business Training — the weekly LIVE event (lib/live-training/).
-- Mondays 3:00 PM Eastern on Google Meet, hosted by the ShearQuery Cosmetology
-- & Barber Board. Registration closes 48 hours before; after that a sign-up
-- goes to the following Monday. Decided with the product owner 2026-09-29.

-- One row of settings the admin page edits, so nothing needs a redeploy.
create table if not exists public.live_training_config (
  id                 int primary key default 1 check (id = 1),
  -- The recurring Google Meet link. A session can override it.
  default_meet_url   text,
  -- The first Wednesday the 12-week member campaign goes out. Null = not started.
  campaign_start     date,
  -- CAN-SPAM: every promotional email shows a physical address. The campaign
  -- will not send until this is set.
  mailing_address    text,
  updated_at         timestamptz not null default now()
);
insert into public.live_training_config (id) values (1) on conflict (id) do nothing;

-- A session is a Monday (its date in Eastern time). Only needed to override the link.
create table if not exists public.live_training_sessions (
  session_date  date primary key,
  meet_url      text,
  created_at    timestamptz not null default now()
);

create table if not exists public.live_training_registrations (
  id                  uuid primary key default gen_random_uuid(),
  session_date        date not null,
  first_name          text not null,
  email               text not null,
  phone               text,
  -- Texts only with this ticked, and the exact words they agreed to, when and from where.
  sms_consent         boolean not null default false,
  sms_consent_text    text,
  consent_ip          text,
  consent_user_agent  text,
  audience            text,
  source              text,
  community_member_id uuid references public.community_members(id) on delete set null,
  created_at          timestamptz not null default now(),
  cancelled_at        timestamptz,
  constraint live_training_email_lower check (email = lower(email))
);
create unique index if not exists idx_live_training_one_per_session on public.live_training_registrations (session_date, email);
create index if not exists idx_live_training_session on public.live_training_registrations (session_date) where cancelled_at is null;

-- Each reminder once per registration per channel, so overlapping cron runs can't send twice.
create table if not exists public.live_training_sends (
  registration_id uuid not null references public.live_training_registrations(id) on delete cascade,
  step            text not null,
  channel         text not null check (channel in ('email', 'sms')),
  sent_at         timestamptz not null default now(),
  error           text,
  primary key (registration_id, step, channel)
);

-- The weekly member campaign: each week's email once per address.
create table if not exists public.live_training_campaign_sends (
  week     int not null check (week between 1 and 12),
  email    text not null,
  sent_at  timestamptz not null default now(),
  error    text,
  primary key (week, email)
);

-- Marketing opt-outs. Honored by the campaign and by the event reminders.
create table if not exists public.email_suppressions (
  email       text primary key check (email = lower(email)),
  reason      text not null default 'unsubscribed',
  created_at  timestamptz not null default now()
);

alter table public.live_training_config          enable row level security;
alter table public.live_training_sessions        enable row level security;
alter table public.live_training_registrations   enable row level security;
alter table public.live_training_sends           enable row level security;
alter table public.live_training_campaign_sends  enable row level security;
alter table public.email_suppressions            enable row level security;
