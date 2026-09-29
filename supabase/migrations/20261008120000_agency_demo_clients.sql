-- Sample clients every agency account starts with: a barber, a salon and a
-- school, each at a different stage of setup, so an empty client list isn't
-- the first thing an agency sees and they can show a prospect what tracking
-- looks like. Decided 2026-09-28: created at signup, before approval.
--
-- A SEPARATE TABLE ON PURPOSE, not community_members + agency_referrals.
-- A fake member would be one missed filter away from the public directory,
-- the admin counts, or — worst — commission, which will be computed from
-- agency_referrals. Nothing here can be credited, because nothing here is
-- a person.
--
-- RLS ON WITH NO POLICIES: service-role only.

create table if not exists public.agency_demo_clients (
  agency_member_id uuid not null references public.community_members(id) on delete cascade,
  business_type    text not null check (business_type in ('barber', 'salon', 'school')),
  name             text not null,
  source           text not null check (source in ('link', 'code', 'invite')),
  joined_at        timestamptz not null,
  claimed_listing  boolean not null default false,
  google_connected boolean not null default false,
  calendar_live    boolean not null default false,
  audit_score      int,
  primary key (agency_member_id, business_type)
);

alter table public.agency_demo_clients enable row level security;
