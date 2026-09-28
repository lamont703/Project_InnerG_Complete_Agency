-- ShearQuery's own appointment calendar, managed from Claude.
--
-- WHY OUR OWN. The Book Appointment button (booking_requests) only REQUESTS:
-- nothing reserves a time, because no business maintains availability with
-- us. A pro who manages their book from Claude needs a real calendar, and the
-- tools can only write to one we own — Booksy, Square and Vagaro have no
-- write access for us.
--
-- PRIVATE TESTING. lib/calendar/access.ts limits every surface (the account
-- page and the MCP tools) to an allowlist until it has been tested.
--
-- ONE PROVIDER PER PERSON, EVEN IN A SHOP. A provider is the person whose time
-- is booked, not the business. A four-chair shop is four providers pointing at
-- the same entity; nothing here assumes one chair, even though the first
-- screens do.
--
-- TIMES: every instant is timestamptz (UTC). Weekly hours are wall-clock
-- minutes in the provider's IANA time zone, because "9am" means 9am on both
-- sides of a daylight-saving change. lib/calendar/time.ts converts.
--
-- RLS ON WITH NO POLICIES: service-role only, like every owner table here.

create extension if not exists btree_gist;

create table if not exists public.calendar_providers (
  id                  uuid primary key default gen_random_uuid(),
  community_member_id uuid not null unique references public.community_members(id) on delete cascade,
  -- The claimed listing this person's book belongs to, when there is one.
  entity_type         text,
  entity_id           uuid,
  display_name        text not null,
  timezone            text not null default 'America/Chicago',
  -- Offer a start time every N minutes.
  slot_step_minutes   int not null default 15 check (slot_step_minutes in (5, 10, 15, 20, 30, 60)),
  -- How soon and how far ahead clients may book (the pro can always book anything).
  min_notice_minutes  int not null default 120 check (min_notice_minutes between 0 and 10080),
  booking_window_days int not null default 60 check (booking_window_days between 1 and 365),
  active              boolean not null default true,
  created_at          timestamptz not null default now(),
  updated_at          timestamptz not null default now()
);

-- Weekly hours. Several rows on one weekday = a split shift. No row = closed.
create table if not exists public.calendar_hours (
  id           uuid primary key default gen_random_uuid(),
  provider_id  uuid not null references public.calendar_providers(id) on delete cascade,
  weekday      int not null check (weekday between 0 and 6),   -- 0 = Sunday
  start_minute int not null check (start_minute between 0 and 1439),
  end_minute   int not null check (end_minute between 1 and 1440),
  constraint calendar_hours_order check (end_minute > start_minute)
);
create index if not exists idx_calendar_hours_provider on public.calendar_hours (provider_id, weekday);

create table if not exists public.calendar_time_off (
  id          uuid primary key default gen_random_uuid(),
  provider_id uuid not null references public.calendar_providers(id) on delete cascade,
  starts_at   timestamptz not null,
  ends_at     timestamptz not null,
  reason      text,
  created_at  timestamptz not null default now(),
  constraint calendar_time_off_order check (ends_at > starts_at)
);
create index if not exists idx_calendar_time_off_provider on public.calendar_time_off (provider_id, starts_at);

create table if not exists public.calendar_services (
  id               uuid primary key default gen_random_uuid(),
  provider_id      uuid not null references public.calendar_providers(id) on delete cascade,
  name             text not null,
  duration_minutes int not null check (duration_minutes between 5 and 600),
  price_cents      int check (price_cents is null or price_cents >= 0),
  -- Clean-up after the service, kept free before the next booking.
  buffer_minutes   int not null default 0 check (buffer_minutes between 0 and 120),
  active           boolean not null default true,
  sort             int not null default 0,
  created_at       timestamptz not null default now()
);
create index if not exists idx_calendar_services_provider on public.calendar_services (provider_id, active);

create table if not exists public.calendar_clients (
  id          uuid primary key default gen_random_uuid(),
  provider_id uuid not null references public.calendar_providers(id) on delete cascade,
  name        text not null,
  -- E.164 when known. Unique per provider so "book Marcus again" finds one Marcus.
  phone       text,
  email       text,
  notes       text,
  created_at  timestamptz not null default now(),
  updated_at  timestamptz not null default now()
);
create unique index if not exists uq_calendar_clients_phone
  on public.calendar_clients (provider_id, phone) where phone is not null;
create index if not exists idx_calendar_clients_name on public.calendar_clients (provider_id, lower(name));

create table if not exists public.calendar_appointments (
  id            uuid primary key default gen_random_uuid(),
  provider_id   uuid not null references public.calendar_providers(id) on delete cascade,
  client_id     uuid references public.calendar_clients(id) on delete set null,
  service_id    uuid references public.calendar_services(id) on delete set null,
  -- Snapshots: renaming or repricing a service must not rewrite history.
  service_name  text not null,
  price_cents   int,
  starts_at     timestamptz not null,
  ends_at       timestamptz not null,
  -- ends_at plus the service's buffer: what the slot actually occupies.
  blocks_until  timestamptz not null,
  status        text not null default 'booked',
  source        text not null default 'claude',
  notes         text,
  cancel_reason text,
  cancelled_at  timestamptz,
  created_at    timestamptz not null default now(),
  updated_at    timestamptz not null default now(),
  constraint calendar_appointments_order check (ends_at > starts_at and blocks_until >= ends_at),
  constraint calendar_appointments_status check (status in ('booked', 'confirmed', 'completed', 'cancelled', 'no_show')),
  constraint calendar_appointments_source check (source in ('claude', 'web', 'walk_in', 'client_claude')),
  -- THE DOUBLE-BOOKING GUARD, in the database rather than the app: two live
  -- appointments for one provider may not overlap, so two bookings racing
  -- for the same slot cannot both commit. Cancelled and no-show rows free
  -- the time; completed ones keep it (they happened).
  constraint calendar_appointments_no_overlap exclude using gist (
    provider_id with =,
    tstzrange(starts_at, blocks_until, '[)') with &&
  ) where (status in ('booked', 'confirmed', 'completed'))
);
create index if not exists idx_calendar_appointments_provider_time on public.calendar_appointments (provider_id, starts_at);
create index if not exists idx_calendar_appointments_client on public.calendar_appointments (client_id, starts_at desc);

alter table public.calendar_providers    enable row level security;
alter table public.calendar_hours        enable row level security;
alter table public.calendar_time_off     enable row level security;
alter table public.calendar_services     enable row level security;
alter table public.calendar_clients      enable row level security;
alter table public.calendar_appointments enable row level security;

comment on table public.calendar_appointments is
  'Real appointments on a ShearQuery calendar. Overlap for one provider is refused by calendar_appointments_no_overlap.';
