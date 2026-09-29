-- Agency commission (lib/commissions.ts): COMMISSION_RATE of what each
-- credited client actually PAID, for as long as they stay on a paid plan.
--
-- One ledger row per paid invoice from a credited client. commission_cents is
-- always the CURRENT amount — it drops if the payment is refunded — and
-- paid_out_cents is what has been handed over. The difference is what's owed,
-- which is negative when a refund lands after a payout: the next payout takes
-- it back. The rate is stored per row, so a later rate change applies to
-- later payments only.
--
-- Payouts are made by hand for now (bank transfer); agency_payouts records
-- each one an admin marks paid.
--
-- RLS ON WITH NO POLICIES: service-role only.

create table if not exists public.agency_payouts (
  id               uuid primary key default gen_random_uuid(),
  agency_member_id uuid not null references public.community_members(id) on delete cascade,
  amount_cents     int not null,
  note             text,
  recorded_by      text,
  paid_at          timestamptz not null default now()
);
create index if not exists idx_agency_payouts_agency on public.agency_payouts (agency_member_id, paid_at desc);

create table if not exists public.agency_commissions (
  stripe_invoice_id     text primary key references public.billing_payments(stripe_invoice_id) on delete cascade,
  agency_member_id      uuid not null references public.community_members(id) on delete cascade,
  client_member_id      uuid references public.community_members(id) on delete set null,
  amount_paid_cents     int not null,
  amount_refunded_cents int not null default 0,
  rate                  numeric(5,4) not null,
  commission_cents      int not null,
  earned_at             timestamptz not null,
  -- After the refund window: a refund before this just lowers the commission.
  payable_at            timestamptz not null,
  paid_out_cents        int not null default 0,
  payout_id             uuid references public.agency_payouts(id) on delete set null,
  created_at            timestamptz not null default now(),
  updated_at            timestamptz not null default now()
);
create index if not exists idx_agency_commissions_agency on public.agency_commissions (agency_member_id, earned_at desc);

alter table public.agency_payouts     enable row level security;
alter table public.agency_commissions enable row level security;
