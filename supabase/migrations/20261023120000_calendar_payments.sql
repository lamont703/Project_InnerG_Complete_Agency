-- Payments at booking, and cancellation rules each pro sets for themselves.
--
-- Decided with the product owner on 2026-09-29:
--  - Each barber or salon connects THEIR OWN Stripe account. Clients pay the
--    pro directly (direct charges); ShearQuery takes no fee per booking.
--  - The pro chooses: no payment, a deposit, or full payment at booking.
--    Deposits and full payment are on the Manage plan. Tips go to anyone
--    whose Stripe is connected.
--  - Cancellation rules are the pro's: whether clients may cancel or move
--    online, how close to the time, what gets refunded when.
-- lib/calendar/policy.ts holds the rules; lib/calendar/payments.ts talks to Stripe.

alter table public.calendar_providers
  add column if not exists stripe_account_id text,
  add column if not exists payments_ready boolean not null default false,
  add column if not exists payments_checked_at timestamptz,
  add column if not exists payment_mode text not null default 'none',
  add column if not exists deposit_kind text not null default 'percent',
  add column if not exists deposit_value int not null default 25,
  add column if not exists tips_enabled boolean not null default true,
  add column if not exists client_can_cancel boolean not null default true,
  add column if not exists client_can_reschedule boolean not null default true,
  -- Closer than this to the time, clients can't cancel or move online.
  add column if not exists change_cutoff_minutes int not null default 120,
  -- Cancelled at least this far ahead: everything paid is refunded.
  add column if not exists full_refund_minutes int not null default 1440,
  -- Cancelled later than that: this percent of the booking payment is refunded.
  add column if not exists late_cancel_refund_percent int not null default 0,
  add column if not exists no_show_refund_percent int not null default 0,
  add column if not exists max_reschedules int,
  add column if not exists policy_note text;

alter table public.calendar_providers
  drop constraint if exists calendar_providers_payment_rules;
alter table public.calendar_providers
  add constraint calendar_providers_payment_rules check (
    payment_mode in ('none', 'deposit', 'full')
    and deposit_kind in ('percent', 'fixed')
    and deposit_value >= 0
    and (deposit_kind <> 'percent' or deposit_value between 1 and 100)
    and change_cutoff_minutes between 0 and 20160
    and full_refund_minutes between 0 and 20160
    and late_cancel_refund_percent between 0 and 100
    and no_show_refund_percent between 0 and 100
    and (max_reschedules is null or max_reschedules between 0 and 20)
    and (policy_note is null or char_length(policy_note) <= 500)
  );

create unique index if not exists idx_calendar_providers_stripe_account
  on public.calendar_providers (stripe_account_id) where stripe_account_id is not null;

alter table public.calendar_appointments
  add column if not exists payment_status text not null default 'none',
  add column if not exists amount_due_cents int,
  -- A booking waiting on payment holds its time until this, then is released.
  add column if not exists hold_expires_at timestamptz,
  add column if not exists reschedule_count int not null default 0,
  -- The rules as they stood when the client booked: refunds follow what the
  -- client agreed to, even if the pro changes them later.
  add column if not exists policy jsonb;

alter table public.calendar_appointments drop constraint if exists calendar_appointments_payment_status;
alter table public.calendar_appointments
  add constraint calendar_appointments_payment_status
  check (payment_status in ('none', 'awaiting', 'paid', 'partially_refunded', 'refunded'));

-- 'pending_payment': booked, but the time is only HELD until the client pays.
alter table public.calendar_appointments drop constraint if exists calendar_appointments_status;
alter table public.calendar_appointments
  add constraint calendar_appointments_status
  check (status in ('pending_payment', 'booked', 'confirmed', 'completed', 'cancelled', 'no_show'));

-- The double-booking guard now counts held times too, so two clients can't
-- both be sent to pay for the same slot.
alter table public.calendar_appointments drop constraint if exists calendar_appointments_no_overlap;
alter table public.calendar_appointments
  add constraint calendar_appointments_no_overlap exclude using gist (
    provider_id with =,
    tstzrange(starts_at, blocks_until, '[)') with &&
  ) where (status in ('pending_payment', 'booked', 'confirmed', 'completed'));

create index if not exists idx_calendar_appointments_holds
  on public.calendar_appointments (hold_expires_at) where status = 'pending_payment';

-- One row per Stripe Checkout: the booking payment, or a tip.
create table if not exists public.calendar_payments (
  id                   uuid primary key default gen_random_uuid(),
  appointment_id       uuid not null references public.calendar_appointments(id) on delete cascade,
  provider_id          uuid not null references public.calendar_providers(id) on delete cascade,
  kind                 text not null check (kind in ('booking', 'tip')),
  stripe_account_id    text not null,
  checkout_session_id  text not null unique,
  payment_intent_id    text,
  service_cents        int not null default 0,
  tip_cents            int not null default 0,
  amount_cents         int not null check (amount_cents > 0),
  status               text not null default 'open' check (status in ('open', 'paid', 'expired')),
  refunded_cents       int not null default 0,
  created_at           timestamptz not null default now(),
  paid_at              timestamptz,
  updated_at           timestamptz not null default now()
);
create index if not exists idx_calendar_payments_appointment on public.calendar_payments (appointment_id);
create index if not exists idx_calendar_payments_intent on public.calendar_payments (payment_intent_id) where payment_intent_id is not null;

alter table public.calendar_payments enable row level security;
