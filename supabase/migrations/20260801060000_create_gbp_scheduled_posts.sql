-- Posts approved now, published later.
--
-- Google's LocalPost has a scheduledTime field, and this deliberately does NOT
-- use it. Two reasons: we have not verified what Google actually does with it
-- on create — whether it defers publication or merely stamps a date — and a
-- post already handed to Google cannot be cancelled by us. Holding the queue
-- here means an owner can change their mind, and the publish path is the same
-- create call that already works.
--
-- The point of the queue is the treadmill. Google posts age out of the feed in
-- about a week, so staying visible means posting again and again, and nobody
-- remembers. Approving four in one sitting and letting them out weekly turns
-- that into ten minutes a month.

CREATE TABLE IF NOT EXISTS public.gbp_scheduled_posts (
    id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
    community_member_id uuid NOT NULL,
    location_name text NOT NULL,

    -- The post itself, in the shape writeLocalPost takes.
    summary text NOT NULL,
    action_type text NOT NULL DEFAULT 'CALL',
    action_url text,
    photo_url text,
    -- EVENT/OFFER payloads. Stored resolved rather than as an events.id, so a
    -- row edited or deleted between scheduling and publishing can't silently
    -- change what goes out under the owner's name.
    event jsonb,
    offer jsonb,
    angle_id text,

    scheduled_for timestamptz NOT NULL,
    status text NOT NULL DEFAULT 'pending',

    published_at timestamptz,
    post_name text,
    error text,
    attempts integer NOT NULL DEFAULT 0,

    created_at timestamptz NOT NULL DEFAULT now(),
    updated_at timestamptz NOT NULL DEFAULT now(),

    CONSTRAINT gbp_scheduled_posts_status_check
        CHECK (status IN ('pending', 'published', 'failed', 'cancelled'))
);

-- The cron's only query: what is due and still waiting.
CREATE INDEX IF NOT EXISTS gbp_scheduled_posts_due_idx
    ON public.gbp_scheduled_posts (scheduled_for)
    WHERE status = 'pending';

CREATE INDEX IF NOT EXISTS gbp_scheduled_posts_member_idx
    ON public.gbp_scheduled_posts (community_member_id, scheduled_for DESC);

-- Service-role only, like every other table holding customer listing data:
-- RLS on with no policies means no anon or authenticated client can read it,
-- and the routes reach it through the admin client after checking the session.
ALTER TABLE public.gbp_scheduled_posts ENABLE ROW LEVEL SECURITY;

COMMENT ON TABLE public.gbp_scheduled_posts IS
    'Owner-approved Google Posts waiting to publish. Published by /api/cron/gbp-publish-scheduled.';
COMMENT ON COLUMN public.gbp_scheduled_posts.event IS
    'Resolved LocalPostEvent, stored rather than referenced so the published post is what was approved.';
COMMENT ON COLUMN public.gbp_scheduled_posts.attempts IS
    'Publish attempts. A row that keeps failing is left failed rather than retried forever.';
