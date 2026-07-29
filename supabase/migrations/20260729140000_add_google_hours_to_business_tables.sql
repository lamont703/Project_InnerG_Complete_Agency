-- Opening hours for the business entity tables that lacked a home for them.
--
-- Google Business Profile returns full weekly `regularHours` for a connected
-- location (verified live: Mon–Sat 12:00–20:00 on a real connected listing),
-- and hours are one of the fields an owner would otherwise have to type in by
-- hand — the exact thing connecting Google is supposed to spare them.
--
-- `google_hours JSONB` is the existing convention: agent_barber_school_leads
-- and agent_cosmetology_school_leads already carry it (migrations
-- 20260702190000 / 20260703150000), as does agent_barber_leads' booksy_hours
-- sibling. These four tables were simply never given it.
ALTER TABLE public.agent_barbershop_leads
  ADD COLUMN IF NOT EXISTS google_hours JSONB;

ALTER TABLE public.agent_salon_leads
  ADD COLUMN IF NOT EXISTS google_hours JSONB;

ALTER TABLE public.agent_barber_supply_store_leads
  ADD COLUMN IF NOT EXISTS google_hours JSONB;

ALTER TABLE public.agent_beauty_supply_store_leads
  ADD COLUMN IF NOT EXISTS google_hours JSONB;
