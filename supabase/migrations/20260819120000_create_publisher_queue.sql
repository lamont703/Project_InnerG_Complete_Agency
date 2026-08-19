-- THE CONTENT PUBLISHER QUEUE: one ordered line of vertical videos, each of
-- which goes to YouTube Shorts and Instagram Reels together.
--
-- WHY POSITION AND NOT A DATE. shorts_queue schedules by `scheduled_for DATE`,
-- which answers "what day does this go out" and cannot answer "what goes out
-- next" without a second rule for ties. This queue is ordered by hand: the
-- operator drags cards into the order they want the feed to read, and position
-- 1 is simply the next thing out. Three slots a day means a date column would
-- need a slot companion and every reorder would be a date rewrite; a position
-- is the thing actually being edited, so it is the thing stored.
--
-- Positions are renumbered as a block on every reorder rather than nudged.
-- Gap-based or fractional indexing exists to avoid rewriting many rows, and
-- this queue is tens of rows on an internal page - the complexity would buy
-- nothing and would add a rebalancing failure mode that only appears after
-- enough reorders to be hard to reproduce.
--
-- ONE ITEM, TWO DESTINATIONS, TWO OUTCOMES. The per-platform columns are
-- deliberately separate. YouTube can accept a video while Instagram refuses it
-- (an unreachable MP4, an expired token, a container that never finishes), and
-- a single status column would have to call that either "published" or
-- "failed" - both of which are lies that cost a re-post or a missing one. The
-- row-level status is derived from the pair, and 'partial' is a real state.

create table if not exists public.publisher_queue (
  id uuid primary key default gen_random_uuid(),

  -- Carried over from shorts_queue.card_key where the item came from there.
  -- Unique, so the same figure cannot enter the line twice - the same guard
  -- shorts_queue has, for the same reason.
  item_key text not null unique,

  -- Copied in, not joined. The publisher must never re-derive a number that
  -- was already rendered into the footage; that is how a caption and its video
  -- drift apart. Same reasoning as shorts_queue.
  title text not null,
  stat text,
  label text,
  question text,

  -- Publicly reachable MP4 in the social-assets bucket. Both platforms fetch
  -- it themselves, so a signed or local URL will not do for either.
  video_url text,
  duration_secs numeric,

  -- Null means "derive it at publish time" from the fields above. Stored only
  -- when someone has written a specific one, so improving the default wording
  -- does not require touching every queued row.
  caption text,

  -- THE ORDER OF THE LINE. 1 is next out.
  position integer not null,

  -- 'partial' means one platform took it and the other did not. It is not an
  -- error state to be cleaned up - it is the honest answer, and it is what
  -- tells you which single platform needs a retry.
  status text not null default 'queued'
    check (status in ('queued', 'published', 'partial', 'failed', 'skipped')),

  youtube_id text,
  youtube_error text,
  youtube_published_at timestamptz,

  instagram_media_id text,
  instagram_permalink text,
  instagram_error text,
  instagram_published_at timestamptz,

  -- When the item left the queue, whatever the per-platform outcome.
  published_at timestamptz,

  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

-- The publisher's exact question: what is at the front of the line?
create index if not exists publisher_queue_position_idx
  on public.publisher_queue (position) where status = 'queued';

create index if not exists publisher_queue_status_idx
  on public.publisher_queue (status, published_at desc);

alter table public.publisher_queue enable row level security;

-- Service role only. The page is admin-gated and reads through a server
-- component, so no public read needs to exist. Same posture as shorts_queue.
create policy "Allow service role full access" on public.publisher_queue
  for all to service_role using (true) with check (true);


-- THE SLOT CLAIM, WHICH IS THE ONLY THING STOPPING A DOUBLE POST.
--
-- The publisher runs hourly and decides for itself whether the current hour is
-- a posting slot, because Vercel cron schedules are UTC and cannot track
-- daylight saving - the existing publish-short route carries a long comment
-- about exactly that drift. Deciding in the route, in America/New_York, is
-- what makes "9am, 2pm, 7pm Eastern" true in both halves of the year.
--
-- But an hourly job that publishes "if the hour matches" will publish twice if
-- it is ever invoked twice in that hour, and a retry, a manual trigger or an
-- overlapping deploy all do exactly that. Posting the same Reel twice is a
-- public mistake that cannot be taken back quietly.
--
-- So the slot is CLAIMED FIRST. The insert is the lock: primary key on
-- (slot_date, slot_hour) means the second caller gets a conflict, takes no
-- rows, and exits. The claim is written before the upload starts, not after,
-- because the window that matters is the one where the upload is in flight.
create table if not exists public.publisher_slot_claims (
  slot_date date not null,
  slot_hour integer not null,
  claimed_at timestamptz not null default now(),
  item_id uuid references public.publisher_queue(id) on delete set null,
  primary key (slot_date, slot_hour)
);

alter table public.publisher_slot_claims enable row level security;

create policy "Allow service role full access" on public.publisher_slot_claims
  for all to service_role using (true) with check (true);


-- SEED THE LINE FROM THE SHORTS QUEUE.
--
-- Only rows that have not gone out. A published Short is history and belongs
-- on the page that recorded it; copying it here would put finished work in a
-- queue of pending work and make the count wrong on both pages.
--
-- Ordered by the date they were already scheduled for, so the hand-made order
-- that existed in shorts_queue survives the move and the operator starts from
-- the sequence they last chose rather than from an arbitrary one.
--
-- on conflict do nothing so re-running this is harmless.
insert into public.publisher_queue
  (item_key, title, stat, label, question, video_url, position, status)
select
  s.card_key,
  s.title,
  s.stat,
  s.label,
  s.question,
  s.video_url,
  row_number() over (order by s.scheduled_for asc, s.created_at asc),
  'queued'
from public.shorts_queue s
where s.status = 'queued'
on conflict (item_key) do nothing;

-- NEW SHORTS JOIN THE BACK OF THE LINE BY THEMSELVES.
--
-- A TRIGGER RATHER THAN AN EDIT TO scripts/shorts/queue_shorts.js. That script
-- is one of several things that can put a row in shorts_queue - there is also
-- the render pipeline, and a person with the table open - and a rule that lives
-- in one caller is a rule the other callers do not follow. The failure is
-- silent in the worst way: the Short exists, the queue page shows it, and it
-- simply never publishes because it never entered the line.
--
-- Position is max+1, so it lands at the back and the hand-set order ahead of it
-- is untouched. on conflict do nothing keeps re-queueing the same card_key
-- harmless, which is the same guarantee the unique constraint already gives.
create or replace function public.publisher_queue_absorb_short()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  if new.status <> 'queued' then
    return new;
  end if;

  insert into public.publisher_queue
    (item_key, title, stat, label, question, video_url, position, status)
  values (
    new.card_key, new.title, new.stat, new.label, new.question, new.video_url,
    coalesce((select max(position) from public.publisher_queue), 0) + 1,
    'queued'
  )
  on conflict (item_key) do nothing;

  return new;
end;
$$;

drop trigger if exists shorts_queue_to_publisher on public.shorts_queue;
create trigger shorts_queue_to_publisher
  after insert on public.shorts_queue
  for each row execute function public.publisher_queue_absorb_short();

-- The video is uploaded to storage AFTER the row is created, so the insert
-- above often carries a null video_url. Without this, the publisher row would
-- keep that null forever and the item could never publish - it would sit in the
-- line flagged "no video" while the Short it mirrors was rendered and ready.
create or replace function public.publisher_queue_sync_video()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  if new.video_url is distinct from old.video_url and new.video_url is not null then
    update public.publisher_queue
      set video_url = new.video_url, updated_at = now()
      where item_key = new.card_key and status = 'queued';
  end if;
  return new;
end;
$$;

drop trigger if exists shorts_queue_video_to_publisher on public.shorts_queue;
create trigger shorts_queue_video_to_publisher
  after update of video_url on public.shorts_queue
  for each row execute function public.publisher_queue_sync_video();

comment on table public.publisher_queue is
  'Hand-ordered publishing line. Position 1 is next out. Each item publishes to YouTube Shorts and Instagram Reels together; the per-platform columns record the two outcomes separately because they genuinely can differ.';
comment on table public.publisher_slot_claims is
  'One row per posting slot actually taken. The primary key is the lock that stops a second invocation in the same hour from publishing the same item twice.';
