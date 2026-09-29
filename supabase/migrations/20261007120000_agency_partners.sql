-- Agency partners: approval, referral codes, email invites, and credit for the
-- businesses an agency brings to ShearQuery.
--
-- Decided 2026-09-28 by the product owner: agencies must be APPROVED before
-- their referrals count, and invites are EMAIL ONLY for now (texting waits on
-- A2P 10DLC). Commission itself needs billing and is not here; this is the
-- credit it will be computed from, which has to exist before the first client
-- joins because it cannot be reconstructed afterwards.

alter table public.agency_profiles
  add column if not exists partner_status text not null default 'pending',
  add column if not exists referral_code  text,
  add column if not exists approved_at    timestamptz,
  add column if not exists reviewed_note  text;

alter table public.agency_profiles
  drop constraint if exists agency_profiles_partner_status_check;
alter table public.agency_profiles
  add constraint agency_profiles_partner_status_check
  check (partner_status in ('pending', 'approved', 'rejected'));

-- Codes are compared uppercase; unique so a code names exactly one agency.
create unique index if not exists uq_agency_profiles_referral_code
  on public.agency_profiles (referral_code) where referral_code is not null;

-- THE CREDIT. One row per client, ever: the primary key on the client IS the
-- "first agency wins, and it's locked" rule, enforced here rather than in
-- code that two signups could race past.
create table if not exists public.agency_referrals (
  client_member_id uuid primary key references public.community_members(id) on delete cascade,
  agency_member_id uuid not null references public.community_members(id) on delete cascade,
  -- How the credit was earned: their link, their code typed at signup, or an
  -- invite the client accepted.
  source           text not null check (source in ('link', 'code', 'invite')),
  created_at       timestamptz not null default now(),
  constraint agency_referrals_not_self check (client_member_id <> agency_member_id)
);
create index if not exists idx_agency_referrals_agency on public.agency_referrals (agency_member_id, created_at desc);

-- Email invites an agency sends to its clients. Token hash only.
create table if not exists public.agency_invites (
  id                 uuid primary key default gen_random_uuid(),
  agency_member_id   uuid not null references public.community_members(id) on delete cascade,
  email              text not null,
  business_name      text,
  token_hash         text not null unique,
  sent_at            timestamptz not null default now(),
  expires_at         timestamptz not null,
  accepted_at        timestamptz,
  accepted_member_id uuid references public.community_members(id) on delete set null,
  constraint agency_invites_email_lower check (email = lower(email))
);
create index if not exists idx_agency_invites_agency on public.agency_invites (agency_member_id, sent_at desc);

alter table public.agency_referrals enable row level security;
alter table public.agency_invites   enable row level security;
