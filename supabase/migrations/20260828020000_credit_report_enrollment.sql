-- ShearQuery Credit Report: enrollment, worker identity, and sharing.
--
-- 20260827020000_shop_roster.sql already models the relationship (shop_roster),
-- the payment record (rent_weeks) and the SMS state machine
-- (roster_conversations). Three things it does not model, and all three are
-- required before a shop can sign itself up rather than be sent a message:
--
--   1. THE SHOP AS A PARTY. roster_conversations knows a shop_id and a phone
--      because it was built for outbound SMS. Enrollment is a different fact:
--      who agreed, on what number, at what address, under which licence.
--   2. THE WORKER AS A PERSON. shop_roster carries a name and a resolved TDLR
--      licence. It has no phone, and no link to an account — so an invited
--      barber has no way to become the owner of their own record.
--   3. SHARING. The whole privacy model is "nobody sees this unless the worker
--      hands it over". That needs a token the worker creates and can revoke.

-- ---------------------------------------------------------------------------
-- 1. Enrollment
-- ---------------------------------------------------------------------------
create table if not exists public.credit_report_shops (
  id                uuid primary key default gen_random_uuid(),

  -- The claimed listing this enrollment belongs to, when there is one. Nullable
  -- on purpose: a shop can enroll before claiming, and refusing them until the
  -- listing is sorted loses the signup for a reason they did not cause.
  shop_id           uuid,
  shop_type         text check (shop_type in ('shop','salon')),

  -- Who signed up. The account is how they reach the management screens; the
  -- SMS number is a separate fact because the person who registers is often
  -- not the phone that answers the biweekly check-in.
  member_id         uuid references public.community_members(id) on delete set null,

  shop_name         text not null,
  address           text not null,
  email             text not null,
  sms_phone         text not null,

  -- The SHOP's licence, not a barber's. Texas licenses establishments
  -- separately from operators and the numbers are not interchangeable.
  shop_license_number text not null,
  shop_license_state  text not null default 'TX',

  -- CONSENT IS A ROW, NOT A CHECKBOX THAT VANISHED. This system sends
  -- recurring automated messages to a business number and records statements
  -- about named people. When somebody later asks "who agreed to this and
  -- when", a boolean in a form that was never stored cannot answer.
  sms_consent_at    timestamptz not null default now(),
  sms_consent_ip    text,

  -- Cadence. Fortnightly is the product decision; the column exists so a shop
  -- that wants weekly is a value change rather than a schema change.
  checkin_interval_days integer not null default 14
                        check (checkin_interval_days between 7 and 90),
  last_checkin_at   timestamptz,
  next_checkin_at   timestamptz,

  status            text not null default 'active'
                    check (status in ('active','paused','ended')),

  created_at        timestamptz not null default now(),
  updated_at        timestamptz not null default now()
);

-- One enrollment per listing, but only where a listing is set — two shops that
-- have not claimed yet must not collide on NULL.
create unique index if not exists credit_report_shops_listing_idx
  on public.credit_report_shops (shop_id, shop_type)
  where shop_id is not null;

create index if not exists credit_report_shops_member_idx
  on public.credit_report_shops (member_id);
create index if not exists credit_report_shops_due_idx
  on public.credit_report_shops (next_checkin_at)
  where status = 'active';

-- ---------------------------------------------------------------------------
-- 2. The worker on the roster
-- ---------------------------------------------------------------------------

-- Which enrollment put this person on a roster. shop_roster.shop_id points at a
-- LISTING and existed before enrollment did, so this is additive rather than a
-- replacement.
alter table public.shop_roster
  add column if not exists enrollment_id uuid
    references public.credit_report_shops(id) on delete set null;

-- Optional, and the optionality is the point: an owner can report on someone
-- without holding their number, but that barber can then never claim the
-- record. The onboarding copy has to say so rather than quietly collecting it.
alter table public.shop_roster
  add column if not exists barber_phone text;

-- Set when the barber claims the record. From then on they, not the shop, are
-- the one who can share it.
alter table public.shop_roster
  add column if not exists member_id uuid
    references public.community_members(id) on delete set null;

-- What the model needs to render a tradeline and cannot infer.
--
-- rent_weeks records WHETHER a week was paid, never how much — which is the
-- right shape for the score, since the score is about reliability, not amount.
-- But a report that shows a payment grid without saying what a week costs is
-- unreadable, so the rate lives on the roster row. Per barber, not per shop:
-- chairs in the same shop routinely rent for different money.
alter table public.shop_roster
  add column if not exists rent_per_week numeric(10,2);

-- Lateness is measured from the shop's due day, so it belongs to the enrollment
-- rather than the person.
alter table public.credit_report_shops
  add column if not exists due_day text not null default 'Monday'
    check (due_day in ('Monday','Tuesday','Wednesday','Thursday','Friday','Saturday','Sunday'));

alter table public.shop_roster add column if not exists invite_token text;
alter table public.shop_roster add column if not exists invited_at timestamptz;
alter table public.shop_roster add column if not exists claimed_at timestamptz;

create unique index if not exists shop_roster_invite_token_idx
  on public.shop_roster (invite_token) where invite_token is not null;
create index if not exists shop_roster_member_idx
  on public.shop_roster (member_id) where member_id is not null;
create index if not exists shop_roster_enrollment_idx
  on public.shop_roster (enrollment_id);

-- ---------------------------------------------------------------------------
-- 3. Sharing
-- ---------------------------------------------------------------------------
create table if not exists public.credit_report_shares (
  id            uuid primary key default gen_random_uuid(),

  -- The person sharing. A share belongs to the SUBJECT, never to a shop — a
  -- shop that could mint a link to somebody else's record would turn "you
  -- control who sees this" into a sentence on a marketing page.
  member_id     uuid not null references public.community_members(id) on delete cascade,

  token         text not null unique,
  label         text,

  -- Every share expires. A reference handed to one shop should not still be
  -- readable by them two years later, and an unrevoked permanent link is how a
  -- private record quietly becomes a public one.
  expires_at    timestamptz not null,
  revoked_at    timestamptz,

  view_count    integer not null default 0,
  last_viewed_at timestamptz,

  created_at    timestamptz not null default now()
);

create index if not exists credit_report_shares_member_idx
  on public.credit_report_shares (member_id, created_at desc);

-- ---------------------------------------------------------------------------
-- RLS: enabled with no policies, matching shop_roster and rent_weeks.
--
-- Deliberate, and the same posture the rest of this app uses for member data:
-- every read and write goes through the service role in a server component or
-- route, where the caller's identity has already been established. A policy
-- set that let the anon key touch these tables would be a second, weaker
-- gatekeeper on the most sensitive rows in the system.
-- ---------------------------------------------------------------------------
alter table public.credit_report_shops  enable row level security;
alter table public.credit_report_shares enable row level security;
