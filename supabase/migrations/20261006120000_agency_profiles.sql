-- Agency accounts: who the agency is, collected at onboarding.
--
-- "agency" became a live account type on 2026-09-28. The partner program
-- (managing clients' businesses, referral commission) is still being built;
-- what an agency gets today is ShearQuery in their own Claude and a demo shop
-- set up by an admin. This row is what the admin reads to decide, and what the
-- partner program will build on. One per member.
--
-- demo_ready_at is stamped when an admin sets up their demo shop
-- (/admin/agencies), so the agency's page can say it is ready.
--
-- RLS ON WITH NO POLICIES: service-role only.

create table if not exists public.agency_profiles (
  community_member_id uuid primary key references public.community_members(id) on delete cascade,
  agency_name   text not null,
  website       text,
  -- What they build for the trade: AI agents, receptionists, marketing, ...
  what_they_build text,
  -- Roughly how many barber / salon / school clients they serve now.
  client_count  int check (client_count is null or client_count between 0 and 100000),
  -- Cities or states they work in.
  markets       text,
  demo_ready_at timestamptz,
  created_at    timestamptz not null default now(),
  updated_at    timestamptz not null default now()
);

alter table public.agency_profiles enable row level security;
