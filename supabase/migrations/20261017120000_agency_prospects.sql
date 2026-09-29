-- Agency prospecting (lib/prospecting.ts): an agency's saved pipeline of
-- businesses it's pitching, and its live Google checks (capped per day).
--
-- No reservations: saving a prospect doesn't stop another agency pitching the
-- same business — credit still goes to whoever gets them signed up first.
-- Emails are never exposed to agencies; phone and website only.
--
-- RLS ON WITH NO POLICIES: service-role only.

create table if not exists public.agency_prospects (
  id               uuid primary key default gen_random_uuid(),
  agency_member_id uuid not null references public.community_members(id) on delete cascade,
  -- A key of PUBLIC_ENTITY_TYPES (shop, salon, barber_school, …) and that table's row.
  entity_type      text not null,
  entity_id        uuid not null,
  slug             text not null,
  business_name    text not null,
  city             text,
  status           text not null default 'to_contact'
    check (status in ('to_contact', 'contacted', 'interested', 'invited', 'joined', 'not_interested')),
  note             text,
  created_at       timestamptz not null default now(),
  updated_at       timestamptz not null default now(),
  unique (agency_member_id, entity_type, entity_id)
);
create index if not exists idx_agency_prospects_agency on public.agency_prospects (agency_member_id, updated_at desc);

-- Each live Google check, so the daily cap can be counted.
create table if not exists public.agency_live_checks (
  id               uuid primary key default gen_random_uuid(),
  agency_member_id uuid not null references public.community_members(id) on delete cascade,
  entity_type      text not null,
  entity_id        uuid not null,
  created_at       timestamptz not null default now()
);
create index if not exists idx_agency_live_checks_agency on public.agency_live_checks (agency_member_id, created_at desc);

alter table public.agency_prospects   enable row level security;
alter table public.agency_live_checks enable row level security;
