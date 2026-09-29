-- Agency payouts through Stripe Connect (lib/billing/connect.ts).
--
-- Each agency gets a Connect account configured as a RECIPIENT (it only
-- receives transfers from ShearQuery; it never takes payments), Express
-- dashboard, ShearQuery responsible for fees and losses. Bank details and the
-- tax ID are entered on Stripe's pages and never reach this database.

alter table public.agency_profiles
  add column if not exists stripe_account_id text,
  -- The account's stripe_transfers capability is active: it can be paid.
  add column if not exists payouts_ready boolean not null default false,
  add column if not exists payouts_checked_at timestamptz;
create unique index if not exists uq_agency_profiles_stripe_account
  on public.agency_profiles (stripe_account_id) where stripe_account_id is not null;

-- How each payout was made: by hand (bank transfer) or a Stripe transfer.
alter table public.agency_payouts
  add column if not exists method text not null default 'manual' check (method in ('manual', 'stripe')),
  add column if not exists stripe_transfer_id text;
