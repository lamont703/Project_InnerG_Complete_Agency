-- Every outreach email we have sent, one row per send.
--
-- WHY THIS MUST EXIST BEFORE THE SENDER DOES. Without it there is no way to
-- answer "have we already written to this school?", and the failure mode of
-- guessing is mailing the same person twice — which is how a reasonable cold
-- email becomes spam in the recipient's judgement, and ours.
--
-- IT IS ALSO THE MEASUREMENT. The campaign's whole thesis is that a reply
-- verifies the address (school_site_crawl.confirmed_at) and that asking for a
-- correction earns more replies than asking for a signup. Neither claim can be
-- checked without knowing who was written to and when.
--
-- UNIQUE ON (email, campaign) IS THE DOUBLE-SEND GUARD, enforced by the
-- database rather than by the sender remembering to check. A script can be
-- re-run, interrupted halfway, or run twice by two people; the constraint holds
-- in all three cases where a SELECT-then-INSERT would not.

create table if not exists public.outreach_sends (
  id bigint generated always as identity primary key,

  email text not null,
  campaign text not null default 'school_pass_rates_2026',

  -- Who it was about, so a reply can be traced back to a listing.
  entity_type text,
  entity_id uuid,
  school_name text,

  subject text,
  -- The exact body sent. If someone disputes what we said, the answer should
  -- not be "whatever the template rendered at the time".
  body text,

  sent_at timestamptz not null default now(),
  provider text not null default 'ghl',
  provider_contact_id text,

  -- Set when the school writes back. This is what promotes a scraped address
  -- to a verified one, and the only signal the campaign actually worked.
  replied_at timestamptz,

  unique (email, campaign)
);

create index if not exists idx_outreach_sends_entity on public.outreach_sends (entity_type, entity_id);
create index if not exists idx_outreach_sends_sent_at on public.outreach_sends (sent_at desc);

alter table public.outreach_sends enable row level security;

comment on table public.outreach_sends is
  'One row per outreach email sent. The unique constraint on (email, campaign) is the double-send guard and is deliberately enforced in the database, not in the sender.';
