-- ONE DISCOUNT CODE PER CLIENT, AND WHY THAT IS WORTH THE OBJECT COUNT.
--
-- A shared code would be one Shopify object instead of hundreds. It would also
-- throw away the only clean causal evidence this whole project can produce.
--
-- The impact panel currently compares contacted clients against a historical
-- baseline and has to label itself observational, because 85-96% of overdue
-- clients come back unprompted and no amount of arithmetic separates "we texted
-- them" from "they were coming anyway". A code that exists for exactly one
-- person, was created at the moment one message was sent, and can be redeemed
-- once, removes that ambiguity entirely: a redemption IS the message working.
-- That is better evidence than the holdout we decided not to run.
--
-- WHERE OFFERS ARE ALLOWED, AND WHERE THEY ARE NOT. Measured against this
-- shop's own baselines, at an average ticket of $52.89 a 20% discount gives
-- away $10.58 per redemption and needs:
--     14-29 days late  ->  +27.2pp lift to break even   (81.7% return anyway)
--     30-59 days late  ->  +21.9pp                      (65.8%)
--     60-119 days late ->  +16.3pp                      (49.0%)
--     120+ days late   ->  +12.5pp                      (37.5%)
-- The first two are unreachable, so routine rebooking carries NO discount. Only
-- two contexts do: the SMS opt-in, where a one-off $10.58 buys a permanent
-- channel, and clients 60+ days late, who are genuinely leaving.
--
-- The deeper reason is not the arithmetic. Fifty-one of these clients keep a
-- rhythm measured in days. Teaching them that going quiet earns 20% off would
-- be slow, invisible and very hard to undo.

create table if not exists public.haircut_offers (
  id uuid primary key default gen_random_uuid(),

  -- The human-readable code, e.g. "BACK-CALVIN-7F3K". Unique because Shopify
  -- treats codes as unique and a collision would hand one client another's
  -- offer.
  code text not null unique,

  -- Shopify's id for the discount node, so it can be deactivated or deleted.
  shopify_discount_id text,

  shopify_customer_id text not null,
  client_name text,

  -- 'sms_opt_in'  - offered in exchange for a text-message opt-in
  -- 'win_back'    - offered to a client 60+ days past their own rhythm
  context text not null check (context in ('sms_opt_in', 'win_back')),

  percent_off integer not null default 20,

  issued_at timestamptz not null default now(),
  -- Ten days from issue. Stored rather than derived so a change to the window
  -- never retroactively expires or extends codes already in someone's hands.
  expires_at timestamptz not null,

  -- Filled in when a matching order is seen. NOT a webhook - orders are polled
  -- from Shopify, which is the same source attribution already trusts.
  redeemed_at timestamptz,
  redeemed_order_id text,
  redeemed_amount numeric,

  create_error text,

  created_at timestamptz not null default now()
);

create index if not exists haircut_offers_customer_idx
  on public.haircut_offers (shopify_customer_id, issued_at desc);

create index if not exists haircut_offers_open_idx
  on public.haircut_offers (expires_at)
  where redeemed_at is null;

create unique index if not exists haircut_offers_code_idx on public.haircut_offers (code);

alter table public.haircut_offers enable row level security;

comment on table public.haircut_offers is
  'One 20% discount code per client per offer, expiring 10 days after issue. A redemption is unambiguous proof that a specific message produced a specific visit - the causal evidence the baseline comparison cannot provide. Issued only for sms_opt_in and win_back (60+ days late); routine rebooking carries no discount.';
