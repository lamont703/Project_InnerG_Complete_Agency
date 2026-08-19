-- Social handles found on entity websites.
--
-- A LAKE, for the same reason school_site_crawl is one: every value here is a
-- guess made by a regex over someone else's HTML, and nothing verifies that the
-- account exists or belongs to the business. Instagram blocks automated
-- checking, so a handle stays a candidate until a person or the business
-- confirms it.
--
-- THE COST OF BEING WRONG IS HIGHER THAN USUAL. A wrong email bounces quietly.
-- A wrong handle gets a stranger publicly tagged in a post promoting a business
-- they have nothing to do with — a mistake made in public, with our name on it
-- and theirs. That asymmetry is why nothing here writes to the entity tables,
-- even though several of them already have an instagram_handle column.
--
-- confirmed_at IS THE SAME TRUST GATE used by school_site_crawl. Null on
-- everything the crawler writes; set only when a human checks the account or
-- the business tells us. Anything that publishes must filter on it.
--
-- ONE ROW PER (entity, platform, handle) OBSERVATION, append-only. A site can
-- legitimately link both the business account and the owner's personal one, and
-- choosing between them is a review decision that wants both rows visible.

create table if not exists public.entity_social_profiles (
  id bigint generated always as identity primary key,

  entity_type text not null,
  entity_id uuid not null,
  entity_name text,

  platform text not null check (platform in ('instagram', 'facebook', 'tiktok', 'youtube', 'x')),
  handle text not null,

  -- Where we found it, so a reviewer can see the evidence rather than trust it.
  site_url text,
  source_url text,

  -- Set by the cross-row agency check: a handle credited on three or more
  -- unrelated businesses is whoever built the websites, not the businesses.
  -- Kept rather than deleted so the rejection is auditable.
  rejected_reason text,

  crawled_at timestamptz not null default now(),

  confirmed_at timestamptz,
  confirmed_via text check (confirmed_via in ('human_review', 'owner_claim', 'gbp', 'reply'))
);

create index if not exists idx_social_entity on public.entity_social_profiles (entity_type, entity_id);
create index if not exists idx_social_handle on public.entity_social_profiles (platform, handle);
create index if not exists idx_social_usable on public.entity_social_profiles (platform)
  where rejected_reason is null;

alter table public.entity_social_profiles enable row level security;

comment on table public.entity_social_profiles is
  'Candidate social handles scraped from entity websites. Unverified by definition - confirmed_at is null until a human or the business confirms. Never tag an account from here without filtering on confirmed_at and rejected_reason.';
