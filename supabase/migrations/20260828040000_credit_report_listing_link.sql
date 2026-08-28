-- Connect an enrollment to the shop's actual directory listing.
--
-- THE BUG THIS FIXES. credit_report_shops.shop_id/shop_type existed from the
-- first migration but nothing ever set them, so an enrollment was a free-text
-- shop NAME and nothing more. Worse, addWorker() was writing the ENROLLMENT id
-- into shop_roster.shop_id — a column whose whole purpose (see
-- 20260827020000, and its shop_roster_shop_idx) is to point at a listing. It
-- satisfied NOT NULL and pointed at the wrong table, so any future join from
-- shop_roster.shop_id to agent_barbershop_leads would have silently returned
-- nothing rather than failing.
--
-- Two consequences of having no listing link, both of which a shop would feel:
--   * The report shows a shop name as typed, not a verified listing. Two shops
--     with the same name are indistinguishable to whoever reads the report.
--   * The shop's claimed listing — its address, reviews and verified badge —
--     is not connected to the payment record it is producing.

-- Nullable, because a shop that has not claimed a listing must still be able
-- to report. The alternative is refusing enrollment for a reason the owner did
-- not cause and cannot fix in the moment.
alter table public.shop_roster
  alter column shop_id drop not null;

-- shop_type carries the same optionality: it is meaningless without a shop_id,
-- and a roster row for an unlisted shop should not have to claim to be a
-- 'shop' when nobody has established that.
alter table public.shop_roster
  alter column shop_type drop not null;

comment on column public.shop_roster.shop_id is
  'The directory listing (agent_barbershop_leads / agent_salon_leads) this placement belongs to, when the shop has claimed one. NULL means the enrollment is by name only — use enrollment_id to reach the shop.';
