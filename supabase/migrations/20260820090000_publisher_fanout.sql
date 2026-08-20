-- The content publisher grows from two destinations to several.
--
-- WHY A JSONB COLUMN AND NOT MORE COLUMNS. publisher_queue already carries
-- youtube_id / youtube_error / youtube_published_at and the Instagram triple
-- beside them. That shape is readable at two platforms and unmanageable at
-- seven - it would mean roughly twenty more columns, every one of them null on
-- most rows, and a migration every time a destination is added.
--
-- results holds one entry per platform:
--   {"linkedin": {"ok": true,  "id": "urn:li:share:123", "url": "..."},
--    "x":        {"ok": false, "error": "401 unauthorized"},
--    "tiktok":   {"skipped": "not enabled"}}
--
-- THE LEGACY COLUMNS STAY AND KEEP BEING WRITTEN. Every row published before
-- this migration has its outcome only in those columns, and the publisher board
-- reads them today. Dual-writing YouTube and Instagram costs two lines in the
-- cron and avoids both a backfill and a board regression; new platforms live in
-- results alone.
alter table public.publisher_queue
  add column if not exists results jsonb not null default '{}'::jsonb;

comment on column public.publisher_queue.results is
  'Per-platform publish outcome, keyed by platform. YouTube and Instagram are also written to their legacy columns for rows that predate this.';


-- Credentials for the platforms this line publishes to.
--
-- WHY NOT client_db_connections. That table backs the older agency connector
-- system, which this line is replacing for social publishing. It is multi-tenant
-- (project_id, client_id, is_shared) and its rows are managed by a different UI
-- with different assumptions. Pointing the daily publisher at it would tie the
-- one publishing line to a system we are retiring, and a row edited over there
-- would silently change what goes out here.
--
-- WHY INSTAGRAM AND YOUTUBE ARE NOT IN HERE. They already work. Instagram lives
-- in instagram_connection (a singleton with its own refresh cron) and YouTube
-- runs off YOUTUBE_REFRESH_TOKEN in the environment. Moving either into this
-- table would be a rewrite of a working path for symmetry alone.
create table if not exists public.publisher_connections (
  -- One row per destination. The primary key IS the platform, because there is
  -- exactly one account per platform on this line - a second LinkedIn would be
  -- a different feature, not a second row.
  platform text primary key
    check (platform in ('linkedin', 'x', 'gbp', 'tiktok')),

  -- THE SWITCH THAT KEEPS AN UNAVAILABLE PLATFORM HARMLESS. TikTok ships here
  -- disabled because the app is not audited and the token carries no
  -- video.publish scope; attempting it every slot would mark every post
  -- 'partial' forever and train everyone to ignore the colour. A disabled
  -- platform is SKIPPED, and skipped never counts against a post's status.
  enabled boolean not null default false,

  access_token text,
  -- X rotates its refresh token on every use, so this column is written back on
  -- each publish rather than only at connect time. Losing that write means the
  -- next publish cannot authenticate and the connection has to be redone by
  -- hand.
  refresh_token text,
  expires_at timestamptz,

  status text not null default 'disconnected'
    check (status in ('disconnected', 'connected', 'revoked', 'error')),
  -- What went wrong last, kept so a dead connection explains itself on the
  -- board instead of just failing quietly at the next slot.
  last_error text,

  -- Human-readable, for the connections panel: "Lamont Evans (Member)".
  -- Which account a token belongs to is invisible otherwise, and posting to the
  -- wrong one is a mistake made in public.
  account_label text,

  -- Platform-specific identifiers resolved at connect time and needed at
  -- publish time: LinkedIn's author URN, GBP's accounts/{a}/locations/{l},
  -- TikTok's open id. Kept as json because no two platforms agree on shape.
  config jsonb not null default '{}'::jsonb,

  connected_at timestamptz,
  last_published_at timestamptz,
  updated_at timestamptz not null default now()
);

comment on table public.publisher_connections is
  'Credentials for the content-publisher line. Service-role only - it holds live access and refresh tokens.';

-- LIVE TOKENS. No policy is defined, so with RLS on, the anon and authenticated
-- roles can read nothing; the service-role key used by the cron bypasses RLS.
-- That is the whole access model and it is deliberate: nothing in the browser
-- ever needs a row from this table, only the server-rendered admin page does.
alter table public.publisher_connections enable row level security;

-- Seed every platform as a known-but-unconnected row, so the connections panel
-- can render the full set without inventing placeholders for the ones nobody
-- has authorised yet.
insert into public.publisher_connections (platform, enabled, status)
values
  ('linkedin', true,  'disconnected'),
  ('x',        true,  'disconnected'),
  ('gbp',      true,  'disconnected'),
  -- Off until the TikTok app passes audit and the token carries video.publish.
  ('tiktok',   false, 'disconnected')
on conflict (platform) do nothing;
