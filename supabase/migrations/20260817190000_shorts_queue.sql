-- The publishing queue for YouTube Shorts.
--
-- WHY A TABLE AND NOT THE JSON LEDGER IT REPLACES. _published.json and
-- _ledger.json live in reference/, which is gitignored and local-only. A queue
-- nobody can see is a queue nobody trusts, and the whole point of this change
-- is that the schedule is visible in the app rather than inferred from a log.
--
-- ONE ROW PER CARD, scheduled_for one per day. `card_key` is unique so the same
-- figure can never be queued twice — the guard that used to live in
-- run_scheduled.js now lives in the database, where a second process cannot
-- race past it.
--
-- video_url POINTS AT STORAGE, NOT AT THE REPO. Rendered MP4s go to the public
-- social-assets bucket so the queue page can actually play them. A 1.3 MB file
-- per Short is nothing there and would be a poor thing to commit.
--
-- STATUS IS NOT A GUESS. 'queued' means rendered and waiting for its date.
-- 'published' means YouTube accepted it and youtube_id is set. Nothing is ever
-- marked published without an id, because a queue that lies about what went out
-- is worse than no queue.

CREATE TABLE IF NOT EXISTS public.shorts_queue (
  id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),

  -- Matches the key in scripts/shorts/card-sources.js — including the
  -- `derived:` and `candidate:` namespaces.
  card_key        TEXT NOT NULL UNIQUE,

  -- Copied in at queue time rather than joined at read time. The queue page has
  -- to stay legible even if a card source is later renamed or removed, and the
  -- publisher must not need to re-derive a figure that was already rendered
  -- into a video — that is how a title and its footage drift apart.
  title           TEXT NOT NULL,
  stat            TEXT,
  label           TEXT,
  question        TEXT,

  video_url       TEXT,
  duration_secs   NUMERIC,

  scheduled_for   DATE NOT NULL,

  status          TEXT NOT NULL DEFAULT 'queued'
                  CHECK (status IN ('queued', 'published', 'skipped', 'failed')),

  youtube_id      TEXT,
  published_at    TIMESTAMPTZ,
  error           TEXT,

  created_at      TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at      TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- The publisher's exact predicate: what is due today and not yet out.
CREATE INDEX IF NOT EXISTS shorts_queue_due_idx
  ON public.shorts_queue (scheduled_for)
  WHERE status = 'queued';

-- The queue page reads in schedule order.
CREATE INDEX IF NOT EXISTS shorts_queue_schedule_idx
  ON public.shorts_queue (scheduled_for DESC);

ALTER TABLE public.shorts_queue ENABLE ROW LEVEL SECURITY;

-- Service role only. The page is admin-gated and reads through a server
-- component, so there is no public read that needs to exist.
CREATE POLICY "Allow service role full access" ON public.shorts_queue
  FOR ALL TO service_role USING (true) WITH CHECK (true);

COMMENT ON COLUMN public.shorts_queue.card_key IS
  'Key from scripts/shorts/card-sources.js. Unique — a figure cannot be queued twice.';
COMMENT ON COLUMN public.shorts_queue.video_url IS
  'Public URL in the social-assets bucket. Null until the Short has been rendered and uploaded.';
