-- Texas continuing-education providers as a directory entity.
--
-- WHY THIS IS ITS OWN ENTITY AND NOT A SCHOOL. A CE provider is licensed
-- separately by TDLR (license_type 'Cosmetology CE Provider'), serves a
-- different need — the 4 hours every licensee needs to renew, not the 1,000 to
-- qualify — and is a different business entirely. 235 licences, 179 of them
-- active, against 312,333 active practitioners who must renew. Nothing else in
-- the directory has that ratio.
--
-- UNLIKE EVERY OTHER ENTITY TABLE, THIS ONE IS BORN FROM TDLR RATHER THAN
-- GOOGLE. The other agent_*_leads tables came from Places and carry licence
-- data bolted on afterwards, which is why school licence matching needed a
-- name-and-city-and-street matcher. Here the licence IS the record: every one
-- of the 235 has a name, street, city, county, phone, owner and expiry from the
-- state. Google enrichment columns exist and start null — the direction of
-- truth is reversed, and place_id gets attached later rather than being the
-- seed.
--
-- WHAT THE DATA SHOWS, AND THE TABLE SHOULD NOT HIDE:
--
--   Eight providers share 811 PINE ST in Abbott, Texas — a town of roughly 300
--   people — trading as 1ST ALL VIDEO CE COURSE, 1ST CE COURSE, 4 HOUR CE,
--   4 HR CE COURSE, 4 HR CE STATE APPROVED, EASY WAY CE, FINISH FAST CE and
--   FUN FAST EASY CE. Fifteen are registered in Abbott across five addresses.
--   Names beginning "0 0", "000", "1 A", "1 AND 1" are engineered to sort
--   first in an alphabetical list.
--
-- That is a market where position is bought with a business name, and it is the
-- opening for a directory that ranks by something else. `address_provider_count`
-- and `owner_name` are promoted columns precisely so a profile page can say how
-- many licences share an address instead of presenting each as independent.

create table if not exists public.agent_texas_ce_provider_leads (
  id uuid primary key default gen_random_uuid(),
  slug text unique,

  -- Identity, from TDLR.
  name text not null,
  owner_name text,
  license_number text not null,
  license_type text,
  license_subtype text,
  license_expiration_date date,
  -- Computed at load against the snapshot; re-derive rather than trust.
  is_active boolean,

  -- Location, from the lake's promoted address columns (business address).
  street_address text,
  address_unit text,
  city text,
  state text,
  zip text,
  county text,
  formatted_address text,
  latitude double precision,
  longitude double precision,

  -- Contact, from TDLR.
  phone text,
  owner_phone text,

  -- How many CE licences share this street address. 1 for most; 8 at
  -- 811 PINE ST, Abbott. Stored rather than computed on read so a profile page
  -- can surface it without a self-join on every render.
  address_provider_count integer default 1,

  -- Google enrichment. Null until someone matches these to Places — the reverse
  -- of every other entity table, where Google came first.
  place_id text,
  website text,
  rating numeric,
  google_review_count integer,
  google_photos jsonb,
  google_hours jsonb,
  google_business_status text,
  google_types jsonb,
  google_category text,
  google_scraped_at timestamptz,

  source_snapshot_date date,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),

  unique (license_number)
);

create index if not exists idx_ce_provider_city    on public.agent_texas_ce_provider_leads (city);
create index if not exists idx_ce_provider_county  on public.agent_texas_ce_provider_leads (county);
create index if not exists idx_ce_provider_active  on public.agent_texas_ce_provider_leads (is_active);
create index if not exists idx_ce_provider_street  on public.agent_texas_ce_provider_leads (street_address);

-- RLS on, matching every other agent_*_leads table: service-role reads only,
-- no policies. Public pages fetch server-side.
alter table public.agent_texas_ce_provider_leads enable row level security;
