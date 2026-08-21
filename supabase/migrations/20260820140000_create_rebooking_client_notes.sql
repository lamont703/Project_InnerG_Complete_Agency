-- WHAT THE BARBER KNOWS AND THE ORDER HISTORY CANNOT.
--
-- The rebooking model reads one signal: when a client paid. That is enough to
-- notice a broken rhythm and useless for explaining it, and the explanation is
-- what decides the right action. Three real cases from the first look at the
-- queue, each of which the maths gets wrong on its own:
--
--   Justin Avery      173 visits on a 7-day rhythm, 77 days gone. He moved to
--                     Las Vegas. He is not "at risk", he is gone, and every
--                     week he stays at the top of the list the $14,846
--                     revenue-at-risk figure is overstated by his $2,988.
--   Alicia Heard      44 visits, 344 days gone. Her son went off to college -
--                     he was the client. Not lost: a college kid is home at
--                     the holidays, so this is a date to come back to, not a
--                     dismissal.
--   Anthony Bennett   Still coming in, probably under a second account. The
--                     data agrees - he appears twice with separate histories,
--                     so both copies chase him and neither knows the other.
--
-- None of that is derivable. All of it was obvious to the barber in seconds.
-- This table is where that knowledge lands, and it is the ONLY way the model
-- ever finds out it is wrong about someone.
--
-- ADMIN-ONLY BY CONSTRUCTION. Notes on a barber's own clients run to health,
-- family and money - "her son left for college" is mild, and the next one will
-- not be. RLS is enabled with NO policy granting anon or authenticated any
-- access whatsoever, so the anon key cannot read a row even by accident. Reads
-- and writes go through the service-role client behind isAdmin(). Nothing here
-- is ever rendered to a client or included in a message: lib/rebooking/
-- messages.ts composes from the cadence result only, and must keep doing so.
--
-- KEYED BY SHOPIFY CUSTOMER ID, NOT EMAIL. Emails change and are edited in the
-- Shopify admin; the customer gid is stable for the life of the record. The
-- id is the full gid ("gid://shopify/Customer/123") exactly as the API returns
-- it, so no parsing has to agree with anything.

create table if not exists public.rebooking_client_notes (
  id uuid primary key default gen_random_uuid(),

  -- Full Shopify customer gid. One row per client - a note is the current
  -- state of what we know, not an append-only log.
  shopify_customer_id text not null unique,

  -- Carried for readability when reading this table directly. NOT used for
  -- matching, and deliberately allowed to go stale rather than being synced.
  client_name text,

  -- The free-text part. Everything the structured columns cannot hold.
  note text,

  -- 'active'   - in the queue as normal
  -- 'snoozed'  - out of the queue until snooze_until, then back automatically
  -- 'inactive' - out of the queue and out of the revenue-at-risk total
  status text not null default 'active'
    check (status in ('active', 'snoozed', 'inactive')),

  -- Required by the app when status = 'snoozed'. Not enforced as a check
  -- constraint: a snooze whose date is cleared should degrade to "shows up
  -- again", which is the safe direction, rather than fail the write.
  snooze_until date,

  -- Why they are gone. Kept separate from `note` because the reason is the
  -- part worth counting later - "how many did we lose to people moving away"
  -- is a question a free-text field cannot answer.
  inactive_reason text
    check (inactive_reason is null or inactive_reason in
      ('moved', 'switched_barber', 'no_longer_local', 'passed_away', 'other')),

  -- Overrides the computed cadence when the barber knows better than the
  -- maths. The model reads recent purchase gaps; it cannot know that someone
  -- has just changed jobs and will be coming fortnightly from now on.
  cadence_override_days numeric
    check (cadence_override_days is null or cadence_override_days > 0),

  -- Set when outreach actually goes out, so the same person is not surfaced
  -- again days later. v1 sends nothing automatically, so this is written by
  -- the barber pressing a button after they have sent the message themselves.
  last_contacted_at timestamptz,

  -- THE DUPLICATE CASE. Set on the record that should disappear, pointing at
  -- the one to keep. Deliberately a pointer rather than a merge: Shopify owns
  -- the customer records and this database has read-only access to them, so
  -- the real merge happens in the Shopify admin and this only stops the queue
  -- double-chasing one person in the meantime.
  merged_into_customer_id text,

  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

-- The queue reads every note for the customers it is about to render, so the
-- lookup is by customer id and nothing else.
create index if not exists rebooking_client_notes_customer_idx
  on public.rebooking_client_notes (shopify_customer_id);

-- Finding the snoozes that have come due.
create index if not exists rebooking_client_notes_snooze_idx
  on public.rebooking_client_notes (snooze_until)
  where status = 'snoozed';

create or replace function public.rebooking_client_notes_touch()
returns trigger
language plpgsql
as $$
begin
  new.updated_at = now();
  return new;
end;
$$;

drop trigger if exists rebooking_client_notes_set_updated_at on public.rebooking_client_notes;
create trigger rebooking_client_notes_set_updated_at
  before update on public.rebooking_client_notes
  for each row execute function public.rebooking_client_notes_touch();

-- No policies are created on purpose. RLS on with zero policies denies every
-- anon and authenticated request; the service-role client bypasses RLS and is
-- the only intended reader, gated by isAdmin() in the app.
alter table public.rebooking_client_notes enable row level security;

comment on table public.rebooking_client_notes is
  'What the barber knows about a client that the order history cannot show - moved away, on a seasonal break, comes in under a second account. Admin-only: RLS is enabled with no policies, so only the service-role client can read it. Never rendered to a client and never included in an outgoing message.';
