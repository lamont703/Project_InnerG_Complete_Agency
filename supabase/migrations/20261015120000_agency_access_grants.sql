-- A business owner letting the agency that brought them in see their account,
-- read-only, to help (lib/agency-support.ts). The owner switches it on and off;
-- the agency can only ask. One row per client: the grant is always to the
-- agency credited in agency_referrals, never any other.
--
-- What the agency sees is operational status — what's connected, stuck or
-- failing — never the client's customers (no appointment names or phone
-- numbers, no review text).
--
-- RLS ON WITH NO POLICIES: service-role only.

create table if not exists public.agency_access_grants (
  client_member_id uuid primary key references public.community_members(id) on delete cascade,
  agency_member_id uuid not null references public.community_members(id) on delete cascade,
  granted_at       timestamptz not null default now(),
  revoked_at       timestamptz,
  -- The last time the agency asked, so a request can't be sent every hour.
  requested_at     timestamptz
);

alter table public.agency_access_grants enable row level security;
