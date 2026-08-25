-- Instagram comic carousels, waiting for review.
--
-- WHY THIS IS NOT publisher_queue. That table's own comments say what it
-- carries: "a publicly reachable MP4 in the social-assets bucket. Both
-- platforms fetch it themselves." It is video-shaped and dual-platform by
-- design, with youtube_id and duration_secs sitting right there in the schema.
--
-- A carousel is none of those things. It is Instagram-only — YouTube has no
-- equivalent — and it is N images rather than one file. Bolting it on would
-- mean a nullable video_url, a nullable image array, and a platform flag on a
-- table whose comments promise a video. The next person to read that schema
-- would be misled by it, which is worse than a second table.
--
-- WHAT IS DELIBERATELY THE SAME. item_key unique, so a deck cannot enter the
-- line twice. Copy stored rather than derived, so improving the wording later
-- does not silently rewrite what is already rendered into the artwork. Status
-- as an honest record rather than a thing to clean up.

create table if not exists public.carousel_queue (
  id uuid primary key default gen_random_uuid(),

  -- Matches Story.id in lib/carousel/stories.ts. Unique, so re-rendering a deck
  -- updates it in place instead of queueing a duplicate.
  item_key text not null unique,

  title text not null,
  -- The sitcom engine borrowed, carried through so the board can show WHY a
  -- deck is shaped the way it is when someone reviews it months later.
  engine text,

  -- Publicly reachable JPEGs, in swipe order. Instagram fetches each one
  -- itself, so a signed or local URL will not do. Order is the story; a shuffle
  -- here is a scrambled deck with no error anywhere.
  image_urls text[] not null,
  card_count integer not null default 0,

  -- Copied in, never re-derived at publish time. Same reasoning as
  -- publisher_queue: a caption and its artwork must not be able to drift.
  caption text not null,
  hashtags text[] not null default '{}',

  -- The panel these arguments came from. Stored on the row rather than only in
  -- the caption string so it survives someone editing the caption.
  source_credit text,

  -- 'draft'      rendered, not yet reviewed by a human
  -- 'approved'   a person has read every card and the caption
  -- 'publishing' CLAIMED, mid-flight. This exists so a double-click cannot post
  --              the same deck twice: the publish action moves the row out of
  --              'approved' with a filtered UPDATE, so the second click finds
  --              nothing left to claim. Without it, two clicks on a slow button
  --              both pass their check and Instagram accepts both.
  -- 'published'/'failed' terminal
  -- 'skipped'    reviewed and rejected; kept, because the unique item_key is
  --              exactly what stops a rejected deck quietly coming back
  status text not null default 'draft'
    check (status in ('draft', 'approved', 'publishing', 'published', 'failed', 'skipped')),

  -- Who approved it, and when. A publish button that anyone can press without
  -- a record is how an un-reviewed deck reaches the account.
  approved_by text,
  approved_at timestamptz,

  instagram_media_id text,
  instagram_permalink text,
  instagram_error text,
  published_at timestamptz,

  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index if not exists carousel_queue_status_idx
  on public.carousel_queue (status, created_at desc);

-- RLS on with NO policies: service-role only, same posture as the other
-- internal tables here. These rows carry unpublished copy and the account's
-- posting decisions; nothing in them belongs to an anon client.
alter table public.carousel_queue enable row level security;

comment on table public.carousel_queue is
  'Instagram comic carousels awaiting human review. Service-role only. See lib/carousel/stories.ts for the copy and scripts/instagram/render_carousel.js for how rows get here.';
