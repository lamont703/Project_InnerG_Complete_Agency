-- Published TDLR regulatory updates — the public surface of the bulletin
-- pipeline (supabase/functions/webhook-tdlr-bulletin → agent_directives →
-- approve → here).
--
-- WHY A TABLE INSTEAD OF PAGE COPY: the licensing pages that already rank
-- (/texas-barber-license-renewal and friends) are hardcoded TSX, so nothing
-- can publish to them without a code change — which is correct, because that
-- is prose about licensing law and a human should write it. This table is the
-- opposite: typed, bounded fields an agent can safely write on approval. The
-- worst a bad extraction can do here is produce one wrong dated entry a human
-- already reviewed, not silently rewrite a page that tells people how to keep
-- their license.
--
-- One canonical timeline, deliberately. The same update pasted onto every
-- /texas/{city} hub would be identical text across dozens of geo-intent pages
-- — duplicate content that dilutes what those pages rank for. Hubs link here.
create table if not exists tdlr_updates (
  id uuid primary key default gen_random_uuid(),

  -- Stable anchor for deep links and citations (#{slug} on the timeline).
  slug text not null unique,
  headline text not null,
  summary text not null,
  what_changed text,

  -- When the change takes effect, if TDLR stated one. Null is meaningful and
  -- must stay distinguishable from "today" — the extractor is instructed to
  -- return null rather than guess a date the source never gave.
  effective_date date,

  license_types text[] default '{}',
  -- Primary source on tdlr.texas.gov. Every entry cites, never republishes.
  source_urls text[] default '{}',

  -- When WE published it. Drives timeline order and the visible date.
  published_at timestamptz not null default now(),

  -- Provenance back to the reviewed directive and the raw email behind it.
  directive_id uuid references agent_directives(id) on delete set null,

  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index if not exists tdlr_updates_published_idx
  on tdlr_updates (published_at desc);

alter table public.tdlr_updates enable row level security;

-- Public read: this is published content, and the timeline page plus its .md
-- twin serve it to anyone (including AI crawlers). Writes are service-role
-- only, which happens in the approve handler.
create policy "Allow public read access to tdlr_updates"
  on public.tdlr_updates for select using (true);
