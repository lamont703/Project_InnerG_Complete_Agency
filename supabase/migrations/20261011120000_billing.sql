-- Billing with Stripe (lib/billing/). Stripe is the source of truth for money;
-- these tables are the copy the site reads, kept current by the webhook
-- (app/api/stripe/webhook).
--
-- billing_payments is also what agency commission will be computed from
-- (step 3): 25% of what a credited client actually PAID, so it records paid
-- invoices, not prices.
--
-- RLS ON WITH NO POLICIES: service-role only.

alter table public.community_members
  add column if not exists stripe_customer_id text;
create unique index if not exists uq_community_members_stripe_customer
  on public.community_members (stripe_customer_id) where stripe_customer_id is not null;

-- One row per Stripe subscription, as it stands now.
create table if not exists public.billing_subscriptions (
  stripe_subscription_id text primary key,
  community_member_id    uuid not null references public.community_members(id) on delete cascade,
  stripe_customer_id     text not null,
  plan                   text not null check (plan in ('manage', 'autopilot')),
  status                 text not null,
  stripe_price_id        text,
  amount_cents           int,
  current_period_end     timestamptz,
  cancel_at_period_end   boolean not null default false,
  created_at             timestamptz not null default now(),
  updated_at             timestamptz not null default now()
);
create index if not exists idx_billing_subscriptions_member on public.billing_subscriptions (community_member_id);

-- Every paid invoice. amount_refunded_cents is filled in when a refund lands,
-- so commission can be taken back.
create table if not exists public.billing_payments (
  stripe_invoice_id      text primary key,
  community_member_id    uuid references public.community_members(id) on delete set null,
  stripe_subscription_id text,
  amount_paid_cents      int not null,
  amount_refunded_cents  int not null default 0,
  currency               text not null,
  paid_at                timestamptz not null,
  created_at             timestamptz not null default now()
);
create index if not exists idx_billing_payments_member on public.billing_payments (community_member_id, paid_at desc);

-- Webhook events already handled, so a redelivery is recognized.
create table if not exists public.billing_events (
  stripe_event_id text primary key,
  type            text not null,
  received_at     timestamptz not null default now()
);

alter table public.billing_subscriptions enable row level security;
alter table public.billing_payments      enable row level security;
alter table public.billing_events        enable row level security;
