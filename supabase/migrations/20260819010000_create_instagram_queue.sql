-- The Instagram publishing queue.
--
-- SEPARATE FROM shorts_queue ON PURPOSE. They look similar and are not the
-- same thing: a Short is one vertical video with a title, an Instagram post is
-- one or more 4:5 cards with a caption, tagged accounts, and a tag list that
-- must be reviewed before it goes out. Sharing a table would mean a nullable
-- column for every field only one of them uses, and a publisher that has to ask
-- which kind of row it is holding before it can do anything.
--
-- THE TAG LIST IS THE RISKY FIELD, which is why it is stored and reviewable
-- rather than computed at publish time. Every handle we hold was scraped and
-- none is verified — tagging the wrong account is a mistake made in public,
-- with a stranger's name on it. Storing the tags means a person can read them
-- on the queue page while the post is still changeable, which is the whole
-- reason the page exists.
--
-- image_urls IS AN ARRAY because a carousel is the format this is for. A single
-- image is a carousel of one, so the publisher has one code path rather than
-- two, and the difference lives in the data instead of in a branch.

create table if not exists public.instagram_queue (
  id uuid primary key default gen_random_uuid(),

  -- Stable key for the thing being posted, so re-queueing the same card is a
  -- conflict rather than a duplicate post.
  post_key text not null unique,

  -- What it is, for the queue page and for asking later which kinds performed.
  concept text,
  title text not null,

  caption text not null,
  -- Publicly reachable URLs. Instagram fetches these itself, so a signed or
  -- local URL will not do.
  image_urls text[] not null default '{}',

  -- Handles to tag. Never auto-filled from the scrape without review: see the
  -- note above.
  tag_handles text[] not null default '{}',

  scheduled_for date not null,

  status text not null default 'queued'
    check (status in ('draft', 'queued', 'published', 'skipped', 'failed')),

  -- Set by the publisher.
  instagram_media_id text,
  permalink text,
  published_at timestamptz,
  error text,

  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index if not exists instagram_queue_due_idx
  on public.instagram_queue (scheduled_for) where status = 'queued';
create index if not exists instagram_queue_status_idx
  on public.instagram_queue (status, scheduled_for desc);

alter table public.instagram_queue enable row level security;

comment on table public.instagram_queue is
  'Scheduled Instagram posts. tag_handles is reviewed by a human before publish - every handle in entity_social_profiles is scraped and unverified, and a wrong tag is a public mistake.';
