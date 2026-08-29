-- The fortnightly check-in: one tokenized link, sent by SMS and email.
--
-- WHY A LINK RATHER THAN A TEXT CONVERSATION. "One tap to respond" cannot be a
-- reply-by-SMS for a shop with more than one chair: a single text cannot say
-- "Marcus on time, Ana late, Dre took the week off" without a grammar the owner
-- has to learn and we have to parse. One link renders the whole roster with a
-- button per person per week, and the SAME link works in the email — so the two
-- channels are one flow, not two implementations that drift.
--
-- WHY EMAIL TOO, and not as decoration. Phone numbers in this trade change
-- often. A shop that switches numbers silently stops answering check-ins, and
-- from our side that is indistinguishable from a shop with nobody paying late.
-- Email is the channel that survives a new handset, and it is also the one an
-- owner can forward to whoever actually does the books.

create table if not exists public.credit_report_checkins (
  id             uuid primary key default gen_random_uuid(),
  enrollment_id  uuid not null references public.credit_report_shops(id) on delete cascade,

  -- The credential. Long, single-purpose, and expiring: it authorises writing
  -- payment statements about named people, so it must not outlive the period
  -- it was sent for.
  token          text not null unique,

  -- The window this check-in is asking about. Stored rather than recomputed so
  -- a link opened three days late still asks about the right weeks instead of
  -- silently shifting forward.
  period_start   date not null,
  period_end     date not null,

  -- Per-channel outcome, kept apart on purpose. "Sent" for GHL means accepted,
  -- not delivered — a text to a landline is accepted and dropped — so a shop
  -- that never answers is a different investigation depending on which channel
  -- actually went out.
  sms_status     text not null default 'pending'
                 check (sms_status in ('pending','sent','failed','skipped','no_phone')),
  email_status   text not null default 'pending'
                 check (email_status in ('pending','sent','failed','skipped','no_email')),

  -- How many roster rows were flagged as stale in this check-in, so the
  -- staleness prompt can be measured rather than assumed to be working.
  stale_prompts  integer not null default 0,

  opened_at      timestamptz,
  completed_at   timestamptz,
  expires_at     timestamptz not null,
  created_at     timestamptz not null default now()
);

create index if not exists credit_report_checkins_enrollment_idx
  on public.credit_report_checkins (enrollment_id, created_at desc);

-- ---------------------------------------------------------------------------
-- Staleness
-- ---------------------------------------------------------------------------
--
-- WHEN A ROSTER ROW GOES QUIET, THE QUESTION IS NOT "did they pay" BUT "are
-- they still here". A barber who left three months ago produces the same
-- silence as one whose shop stopped answering, and guessing wrong in either
-- direction is bad: mark them gone and their record ends early; leave them
-- active and the shop is asked about somebody who left.
--
-- So we ask. These two columns record the asking, so the same person is not
-- queried on every single check-in forever.
alter table public.shop_roster
  add column if not exists presence_asked_at timestamptz;

-- The owner's last answer to "is this person still renting a chair?".
alter table public.shop_roster
  add column if not exists presence_confirmed_at timestamptz;

comment on column public.shop_roster.presence_asked_at is
  'Last time a check-in asked whether this person still rents a chair here. Set when the prompt is SHOWN, so an unanswered prompt is not repeated every fortnight.';

alter table public.credit_report_checkins enable row level security;
