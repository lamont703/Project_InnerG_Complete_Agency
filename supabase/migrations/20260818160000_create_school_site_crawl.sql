-- School website crawl — a LAKE, deliberately not columns on the school rows.
--
-- WHY A LAKE AND NOT ATTACHED TO THE ENTITY. Everything here is inferred from
-- someone else's HTML by regex. The moment a scraped email lands in a column on
-- agent_cosmetology_school_leads it becomes indistinguishable from a field a
-- human checked — same shape, same name, no provenance — and the entity tables
-- feed public pages. Publishing a guessed address as though it were the
-- school's own is the failure this repo keeps writing rules to prevent.
--
-- Four things the lake buys that a column cannot:
--
--   1. PROVENANCE. Every value carries the URL it came from and the moment it
--      was fetched. A column holds a value and no way to answer "says who?".
--   2. HISTORY. Append-only, so a re-crawl adds an observation instead of
--      destroying the previous one. Sites change; being able to diff is how we
--      notice a school got a new site, or went dark.
--   3. RE-DERIVATION. `raw` keeps the extracted text, so a better parser can be
--      run over old crawls without re-fetching anyone's website. The email
--      extractor already needed one fix (it captured "ecom-swiper@11.css") and
--      it will need more.
--   4. A HONEST TRUST GATE. See below.
--
-- THE TRUST GATE IS THE POINT. `confirmed_at` is null on every row this crawler
-- writes and NOTHING the crawler does can set it. It is stamped only when the
-- school itself replies — that reply is the only evidence the address belongs
-- to them and that a person there is willing to hear from us. Any consumer that
-- needs verified data filters on `confirmed_at is not null`; any consumer that
-- forgets gets unverified data that is still clearly labelled as such, rather
-- than a column that quietly lies.
--
-- PROMOTION TO THE ENTITY IS A SEPARATE, LATER DECISION and deliberately not in
-- this migration. When a school confirms, copying the value onto its row is one
-- statement — but it should be written when there is something confirmed to
-- copy, not built speculatively now against a shape we are guessing at.
--
-- NO FOREIGN KEY, because "school" is two tables (agent_barber_school_leads and
-- agent_cosmetology_school_leads) and Postgres cannot reference both from one
-- column. entity_type + entity_id is the same pair used by
-- community_member_entity_links, so it matches how the rest of the app already
-- addresses an entity.

create table if not exists public.school_site_crawl (
  id bigint generated always as identity primary key,

  -- Which school. Mirrors community_member_entity_links' addressing.
  entity_type text not null check (entity_type in ('barber_school', 'cosmetology_school')),
  entity_id uuid not null,
  school_name text,

  -- What we fetched. site_url is the address we started from (as held on the
  -- entity row); final_url is where redirects landed us, which is how a moved
  -- or parked domain shows up.
  site_url text not null,
  final_url text,
  http_status int,
  fetch_error text,

  -- Findings. Arrays/objects rather than scalars because a school can publish
  -- several addresses and choosing between them is a judgement, not a scrape.
  emails jsonb not null default '[]'::jsonb,
  has_contact_form boolean not null default false,
  contact_form_url text,
  captcha_detected boolean not null default false,

  -- The outreach hook: what the site does and does not say. This is what makes
  -- an email specific enough not to read as spam, so it is a first-class
  -- finding rather than something re-derived later.
  signals jsonb not null default '{}'::jsonb,

  -- Extracted text per page, so a better parser can revisit without re-fetching
  -- anybody's site.
  raw jsonb not null default '{}'::jsonb,

  crawled_at timestamptz not null default now(),

  -- THE TRUST GATE. Null means scraped and unverified — which is every row this
  -- crawler writes. Only a reply from the school sets it.
  confirmed_at timestamptz,
  confirmed_via text check (confirmed_via in ('email_reply', 'sms_reply', 'phone', 'owner_claim')),
  confirmed_email text
);

-- Append-only by design: no unique constraint on (entity_id), because a second
-- crawl must add a row rather than overwrite the first.
create index if not exists idx_school_crawl_entity on public.school_site_crawl (entity_type, entity_id);
create index if not exists idx_school_crawl_crawled_at on public.school_site_crawl (crawled_at desc);
create index if not exists idx_school_crawl_confirmed on public.school_site_crawl (confirmed_at) where confirmed_at is not null;

-- Scraped business contact details are never public. RLS on with no policies =
-- service role only, the same posture as gbp_connections and the TDLR lake.
alter table public.school_site_crawl enable row level security;

comment on table public.school_site_crawl is
  'Append-only observations from crawling school websites. Unverified by definition: confirmed_at is set only when the school replies. Never read this for public display without filtering on confirmed_at.';
