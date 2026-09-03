-- THE B-ROLL LIBRARY: what we already paid for, and what it shows.
--
-- WHY THIS EXISTS. B-roll used to land in `.cache/broll/` as
-- `pixabay-106038-1080p.mp4` — local, disposable, and carrying no record of what
-- is in the frame. That was survivable while every clip was a free Pixabay
-- download. It stops being survivable the moment a clip costs credits: the
-- question "what do we already own that shows hands typing?" has to be
-- answerable, and a folder of numeric filenames cannot answer it.
--
-- SEARCH BEFORE GENERATE IS THE WHOLE POINT. A table that only records spend is
-- an expense report. The saving comes from `findClips()` in lib/broll-library.js
-- being consulted BEFORE anything is generated, so the second News Desk that
-- needs a barbershop interior pays nothing.
--
-- TAGS ARE THE SEARCH KEY, NOT THE PROMPT. The prompt is a paragraph written for
-- a video model and no two are alike; matching on it finds nothing. Tags are
-- chosen from what is visibly IN the clip — 'barbershop', 'phone', 'hands',
-- 'night' — so a later search describes the shot it needs rather than guessing
-- the words someone used a month ago.
create table if not exists public.broll_assets (
  id uuid primary key default gen_random_uuid(),

  -- 'higgsfield' | 'pixabay'. Not constrained: a new source should be an insert,
  -- not a migration, and an unknown value degrades to "don't reuse it" rather
  -- than breaking a render.
  source text not null,

  -- The provider's own id — a Higgsfield job_id, a Pixabay video id. UNIQUE with
  -- source so re-importing the same clip is harmless and cannot create a second
  -- row that splits its usage history.
  source_ref text,

  -- What was asked for. Kept for provenance and for regenerating a variant, NOT
  -- for search — see the note above.
  prompt text,
  tags text[] not null default '{}',

  model text,
  duration_secs numeric,
  width integer,
  height integer,

  -- WHAT IT COST, which is the column that makes reuse an argument rather than a
  -- preference. Credits for Higgsfield, 0 for Pixabay.
  credits numeric not null default 0,

  -- Publicly reachable MP4. entity-photos, NOT social-assets: that bucket caps
  -- at 5MB and refuses anything bigger, and b-roll is routinely larger.
  url text not null,
  storage_path text,

  created_at timestamptz not null default now(),

  -- REUSE IS THE METRIC. A library nobody pulls from is just storage, and these
  -- two columns are how that shows up rather than being assumed.
  last_used_at timestamptz,
  use_count integer not null default 0
);

create unique index if not exists broll_assets_source_ref_idx
  on public.broll_assets (source, source_ref) where source_ref is not null;

-- Tag search is the hot path: "find me something tagged barbershop and warm".
create index if not exists broll_assets_tags_idx on public.broll_assets using gin (tags);

alter table public.broll_assets enable row level security;

-- Service role only. Renders run from scripts with the service key; nothing
-- public reads this, so no public policy needs to exist.
create policy "Allow service role full access" on public.broll_assets
  for all to service_role using (true) with check (true);

comment on table public.broll_assets is
  'Reusable b-roll. Search this by tag BEFORE generating anything — that is the only reason it saves money. credits records what the clip cost so reuse can be argued rather than assumed.';
comment on column public.broll_assets.tags is
  'What is visibly IN the clip, lowercase single words. The search key. Do not match on prompt — prompts are paragraphs and no two are alike.';
