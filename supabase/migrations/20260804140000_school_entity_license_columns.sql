-- Attach TDLR licence facts to the school entity rows.
--
-- The entity tables come from Google: name, location, photos, reviews, hours.
-- TDLR is authoritative for something Google cannot know — whether the school
-- is licensed, under what number, and where the state says it operates. These
-- columns carry the TDLR half onto the row so a page can state both without a
-- join at render time.
--
-- SCOPE: the three COSMETOLOGY school licence types only.
--   Cosmetology Private School
--   Cosmetology Vocational/High School
--   Cosmetology Junior College
--
-- Barber School is deliberately excluded. Texas merged the barber and
-- cosmetology boards, and every one of the 132 Barber School licences is
-- expired — 90 of them on the same day, 12/01/2025. Those numbers no longer
-- resolve in TDLR's active licence search, so carrying them would mean
-- publishing a licence number that fails the moment anyone checks it. Barber
-- schools that still operate hold one of the cosmetology licences above; 131 of
-- the Cosmetology Private School licences match a school sitting in the BARBER
-- entity table, which is why both tables get these columns.
--
-- ONLY ACTIVE LICENCES ARE WRITTEN. A school whose only licence has expired
-- keeps nulls rather than a dead number. Everything populated here is live as
-- of the snapshot it came from.
--
-- The address is the BUSINESS address where TDLR publishes one — a storefront,
-- not the mailing address, which can be a PO box or the owner's home.

alter table public.agent_cosmetology_school_leads
  add column if not exists license_street_address text,
  add column if not exists license_city           text,
  add column if not exists license_state          text,
  add column if not exists license_county         text,
  add column if not exists license_phone_number   text;
-- license_number already exists on this table.

alter table public.agent_barber_school_leads
  add column if not exists license_number         text,
  add column if not exists license_street_address text,
  add column if not exists license_city           text,
  add column if not exists license_state          text,
  add column if not exists license_county         text,
  add column if not exists license_phone_number   text;

create index if not exists idx_cos_school_license_number
  on public.agent_cosmetology_school_leads (license_number);
create index if not exists idx_barber_school_license_number
  on public.agent_barber_school_leads (license_number);
