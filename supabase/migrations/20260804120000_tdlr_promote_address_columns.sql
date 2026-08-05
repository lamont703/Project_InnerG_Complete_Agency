-- Promote the address fields out of `raw` into indexed columns.
--
-- The lake is schema-on-read: `raw` keeps the source record verbatim and a few
-- high-value fields are promoted for indexing and joins. Addresses were left in
-- the jsonb, which makes any join on city/zip/county a full scan with a jsonb
-- extraction per row. These columns are the promotion; `raw` is untouched and
-- remains the source of truth, so nothing here is lossy.
--
-- TWO SOURCES, DIFFERENT SHAPES:
--   7358-krk7  business_address_line1/2, business_city_state_zip, business_county
--              (~92% of records) plus a mailing_* set
--   9d9z-ebct  mailing_* only, and no county at all
--
-- So `address_source` records which set a row's address came from. A business
-- address is a storefront; a mailing address can be a PO box or the owner's
-- home. Silently blending the two would make the columns look complete while
-- quietly changing what they mean — the column says which, and callers that
-- care about physical location can filter on it.
--
-- WHY address_unit IS SEPARATE. In records carrying both address lines, line1
-- is the suite and line2 the street about half the time — 20 of 38 in the
-- sample. Concatenating in field order would produce "STE K150 1101 S CAPITAL
-- OF TEXAS HWY" for half the data and the right thing for the other half. The
-- backfill detects which line is the street; the unit gets its own column so a
-- join on street_address is not defeated by a suite number.
--
-- `zip` holds the 5-digit ZIP. ZIP+4 is dropped deliberately: it is what joins
-- and dedupes use, and the full string is still in `raw` if it is ever needed.

alter table public.tdlr_licensees_raw
  add column if not exists street_address text,
  add column if not exists address_unit   text,
  add column if not exists city           text,
  add column if not exists state          text,
  add column if not exists zip            text,
  add column if not exists county         text,
  add column if not exists address_source text;

comment on column public.tdlr_licensees_raw.address_source is
  'Which address set this row''s columns came from: business (a storefront) or mailing (may be a PO box or the owner''s home). Null where the record carried neither.';
comment on column public.tdlr_licensees_raw.address_unit is
  'Suite/apt/unit, split out because the source swaps line1 and line2 roughly half the time.';
comment on column public.tdlr_licensees_raw.zip is
  '5-digit ZIP. ZIP+4 is preserved in raw and deliberately not promoted.';

create index if not exists idx_tdlr_raw_city   on public.tdlr_licensees_raw (city);
create index if not exists idx_tdlr_raw_zip    on public.tdlr_licensees_raw (zip);
create index if not exists idx_tdlr_raw_county on public.tdlr_licensees_raw (county);
-- The common lookup is "this trade, this town".
create index if not exists idx_tdlr_raw_type_city on public.tdlr_licensees_raw (license_type, city);
