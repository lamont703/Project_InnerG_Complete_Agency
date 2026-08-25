-- Drafted outreach, kept rather than regenerated.
--
-- WHY A TABLE AND NOT A CACHE. Caching was the reason for it, but a draft has a
-- life: it is written, edited, then sent or dismissed. A cache can hold the
-- first of those and none of the rest, and every one of the rest is something
-- the queue needs — an edit that survives until tomorrow, a "not now" that
-- actually sticks, and a send history that the quiet period can read.
--
-- KEYED ON (member, signal), and that key does real work. If somebody moves
-- from no_listing_claimed to claimed_not_connected, that is a different thing
-- to say, so it misses and regenerates on its own. No invalidation logic.
create table if not exists public.member_outreach_drafts (
  id uuid primary key default gen_random_uuid(),
  community_member_id uuid not null references public.community_members(id) on delete cascade,

  -- Which observation produced this. Not constrained to a list: the signals
  -- will grow as the booking feed matures, and a CHECK here would mean a
  -- migration every time somebody has a new idea about who is worth contacting.
  signal text not null,
  channel text not null check (channel in ('sms', 'email')),

  subject text,
  body text not null,

  -- 'template' when generation was unavailable — quota is finite and the page
  -- must still render something sendable. Knowing WHICH is what stops a
  -- fallback draft being mistaken for a considered one.
  origin text not null default 'template' check (origin in ('template', 'ai')),

  status text not null default 'pending'
    check (status in ('pending', 'sent', 'dismissed')),

  -- Set when a human edits the text. A regenerate must never quietly discard
  -- somebody's wording, so this is the flag that protects it.
  edited boolean not null default false,

  generated_at timestamptz not null default now(),
  sent_at timestamptz,
  dismissed_at timestamptz,
  updated_at timestamptz not null default now()
);

-- One live draft per member per signal. Dismissed and sent ones stay as
-- history, which is why this is partial rather than a plain unique.
create unique index if not exists member_outreach_drafts_live_idx
  on public.member_outreach_drafts (community_member_id, signal)
  where status = 'pending';

create index if not exists member_outreach_drafts_member_idx
  on public.member_outreach_drafts (community_member_id, status, generated_at desc);

comment on table public.member_outreach_drafts is
  'Drafted member outreach. Generated once per (member, signal), edited by a human, then sent or dismissed.';

-- Holds names, phone-adjacent context and message bodies about real people.
-- No policy: service-role only, which is all the admin page needs.
alter table public.member_outreach_drafts enable row level security;
