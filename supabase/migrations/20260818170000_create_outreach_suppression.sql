-- Who must never be emailed again.
--
-- CAN-SPAM gives every recipient the right to opt out and requires it honoured
-- within 10 business days, with the mechanism working for at least 30 days
-- after the message was sent. This table is that promise made durable: the list
-- outlives any campaign, any script, and anyone's memory of who asked.
--
-- SEPARATE FROM THE CRAWL LAKE ON PURPOSE. school_site_crawl holds observations
-- and gets re-crawled, filtered and re-derived. An opt-out is none of those
-- things — it is a standing instruction from a person, and it must survive
-- every future change to how we build a list. Anything that can be rebuilt is
-- the wrong place to keep something that must never be lost.
--
-- EMAIL IS THE PRIMARY KEY, not a foreign key to an entity. Someone opting out
-- is opting THAT ADDRESS out, whoever it belongs to and whichever school we
-- happened to associate it with. Keying on the entity would let the same person
-- be re-added the moment we linked their address to a second listing.

create table if not exists public.outreach_suppression (
  email text primary key,
  reason text not null default 'unsubscribe_link'
    check (reason in ('unsubscribe_link', 'reply_request', 'bounce', 'complaint', 'manual')),
  -- Kept for context, never for targeting: knowing which campaign prompted an
  -- opt-out is how we learn a message was wrong.
  source text,
  created_at timestamptz not null default now()
);

alter table public.outreach_suppression enable row level security;

comment on table public.outreach_suppression is
  'Addresses that must never receive outreach. Checked at send time, never at list-build time. Append-only in practice: removing a row re-subscribes someone who asked not to be contacted.';
