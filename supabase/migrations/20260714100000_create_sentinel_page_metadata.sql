-- Accumulates per-page technical SEO data as Sentinel's weekly sweep
-- crawls each URL, so duplicate title/meta-description checks (inherently
-- cross-page) have something to compare against even though any single run
-- only touches a small batch of the sitemap.
create table if not exists sentinel_page_metadata (
  url text primary key,
  title text,
  meta_description text,
  google_canonical text,
  user_canonical text,
  redirect_hop_count int,
  structured_data_valid boolean,
  structured_data_error text,
  broken_images jsonb default '[]'::jsonb,
  broken_links jsonb default '[]'::jsonb,
  last_checked_at timestamptz not null default now()
);

create index if not exists sentinel_page_metadata_title_idx on sentinel_page_metadata (title);

alter table public.sentinel_page_metadata enable row level security;
-- No public policies — service role only, nothing in the UI reads this directly.
