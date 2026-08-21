-- EVERY MESSAGE THE AGENT PROMPTS, SO ITS IMPACT CAN BE ARGUED WITH.
--
-- THE PROBLEM THIS TABLE EXISTS TO AVOID. This shop ran four years with no
-- rebooking outreach at all, and across 1,481 overdue events 85.1% of clients
-- came back within 14 days of passing their cadence anyway; 93.9% within 30.
-- So the obvious metric — "we messaged them and they returned" — is a number
-- that would have been ~85% true with no agent, no message and no cost. Any
-- report built on it overstates the agent by roughly an order of magnitude and
-- will not survive the first person who checks it.
--
-- What makes a claim defensible is the comparison: the return rate of the
-- people we contacted, against what this shop's own history says happens to
-- people that late who were never contacted. lib/rebooking/baseline.ts builds
-- that curve; this table is the other half.
--
-- STATE IS FROZEN AT SEND TIME, DELIBERATELY. days_overdue, cadence_days and
-- annual_value are copied in rather than recomputed at report time. A client's
-- cadence changes as they visit — recomputing later would silently move an
-- outreach into a different lateness bucket and compare it against the wrong
-- baseline. The row records the world as it was when the message went out.
--
-- OUTCOMES ARE NOT STORED. Whether they came back is derived at report time
-- from Shopify orders, because that is the source of truth and a cached copy of
-- it can only be wrong. This table holds sends; attribution.ts joins them.
--
-- Same privacy posture as rebooking_client_notes: RLS on, no policies, so only
-- the service-role client behind isAdmin() can read it.

create table if not exists public.rebooking_outreach (
  id uuid primary key default gen_random_uuid(),

  shopify_customer_id text not null,
  client_name text,

  sent_at timestamptz not null default now(),

  -- 'sms' | 'email' | 'manual' - manual covers a phone call or a conversation
  -- in the chair, which is real outreach and would otherwise be invisible.
  channel text not null default 'manual'
    check (channel in ('sms', 'email', 'manual')),

  -- Frozen state at send time. See the note above on why these are copied.
  cadence_days numeric,
  days_overdue numeric,
  lateness_bucket text,
  annual_value numeric,
  average_ticket numeric,

  -- What the send cost, in cents. Gemini tokens are shared across a run and not
  -- worth apportioning per client; this is for the per-message carrier cost so
  -- a return-on-cost figure is possible at all.
  cost_cents integer not null default 0,

  -- Free text for "what I actually said", when it differed from the draft.
  message_note text,

  created_at timestamptz not null default now()
);

-- Attribution joins sends to a client's later visits, so both columns are hot.
create index if not exists rebooking_outreach_customer_idx
  on public.rebooking_outreach (shopify_customer_id, sent_at desc);

create index if not exists rebooking_outreach_sent_idx
  on public.rebooking_outreach (sent_at desc);

alter table public.rebooking_outreach enable row level security;

comment on table public.rebooking_outreach is
  'One row per rebooking message actually sent. State is frozen at send time so attribution compares each outreach against the right historical baseline bucket. Outcomes are NOT stored - they are derived from Shopify orders at report time.';
