-- Inbound Instagram activity: comments, mentions, and messages.
--
-- THIS TABLE IS HOW A TAG BECOMES A CONFIRMATION. Every handle we hold was
-- scraped, and no amount of staring at a string proves the account belongs to
-- the business. A reply does. So the loop is: tag the post -> they comment or
-- message -> we record it here -> entity_social_profiles.confirmed_at is
-- stamped for that handle, by evidence rather than by assertion.
--
-- IT IS ALSO THE ONLY MEASUREMENT WE GET. Instagram will not tell us whether a
-- tag was noticed. Comments and messages are the only observable signal that a
-- tagged business saw anything at all, so "did tagging work?" is answerable
-- only if every one is written down as it arrives.
--
-- RAW IS KEPT because Meta reshapes webhook payloads without much warning, and
-- a parser that silently stops finding a field is invisible unless the original
-- is still there to re-read.

create table if not exists public.instagram_events (
  id bigint generated always as identity primary key,

  kind text not null check (kind in ('comment', 'mention', 'message', 'story_insight', 'other')),

  -- Who acted. username is absent on some payloads, which is why sender_id is
  -- the identifier and username is a convenience.
  sender_id text,
  username text,

  -- What they acted on. Lets an event be traced back to the post that earned it.
  media_id text,
  comment_id text,
  text_body text,

  -- Set once we have replied, so the single private reply Meta allows per
  -- comment cannot be spent twice on the same person.
  replied_at timestamptz,

  raw jsonb not null default '{}'::jsonb,
  received_at timestamptz not null default now(),

  -- One row per platform event. Meta retries deliveries, and a retry must not
  -- look like a second comment.
  unique (kind, comment_id, sender_id, media_id)
);

create index if not exists idx_ig_events_username on public.instagram_events (lower(username));
create index if not exists idx_ig_events_unreplied on public.instagram_events (received_at)
  where replied_at is null;

alter table public.instagram_events enable row level security;

comment on table public.instagram_events is
  'Inbound Instagram comments, mentions and messages. The evidence that turns a scraped handle into a confirmed one, and the only measurement of whether tagging works.';
