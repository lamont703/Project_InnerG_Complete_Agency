-- Raw data lake for TDLR (data.texas.gov) licensee datasets.
-- Schema-on-read: the full source record is preserved verbatim in `raw` (jsonb);
-- a few high-value fields are promoted to columns for indexing and joins.
-- Deliberately un-normalized — downstream transforms are decided later.
--
-- Sources (Socrata datasets on data.texas.gov):
--   7358-krk7  "TDLR - All Licenses"        (beauty-ecosystem subset ingested)
--   9d9z-ebct  "TDLR COS Salons & Schools"  (has owner_telephone + mailing address)

create table if not exists public.tdlr_licensees_raw (
  id bigint generated always as identity primary key,
  source_dataset text not null,
  license_number text,
  license_type text,
  business_name text,
  license_expiration_date_mmddccyy text,
  continuing_education_flag text,   -- present in 7358-krk7
  owner_telephone text,             -- present in 9d9z-ebct
  raw jsonb not null,
  snapshot_date date not null,
  pulled_at timestamptz not null default now(),
  unique (source_dataset, license_number, snapshot_date)
);

create index if not exists idx_tdlr_raw_license_number on public.tdlr_licensees_raw (license_number);
create index if not exists idx_tdlr_raw_license_type on public.tdlr_licensees_raw (license_type);
create index if not exists idx_tdlr_raw_source on public.tdlr_licensees_raw (source_dataset);
create index if not exists idx_tdlr_raw_ce_flag on public.tdlr_licensees_raw (continuing_education_flag);
