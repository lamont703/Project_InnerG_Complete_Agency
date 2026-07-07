-- Adds a nullable `slug` column + index to every entity profile table so
-- UUID-based profile URLs (/schools/[id], /barbers/[id], /shop/[id],
-- /stores/[id], /salons/[id], /cosmetologists/[id], /events/[id]) can be
-- replaced with SEO-friendly slugs. Nullable for now — a backfill script
-- populates every existing row before a follow-up migration tightens these
-- to NOT NULL + UNIQUE.

ALTER TABLE public.agent_barber_school_leads       ADD COLUMN IF NOT EXISTS slug TEXT;
ALTER TABLE public.agent_cosmetology_school_leads   ADD COLUMN IF NOT EXISTS slug TEXT;
ALTER TABLE public.agent_barber_leads               ADD COLUMN IF NOT EXISTS slug TEXT;
ALTER TABLE public.agent_barbershop_leads           ADD COLUMN IF NOT EXISTS slug TEXT;
ALTER TABLE public.agent_barber_supply_store_leads  ADD COLUMN IF NOT EXISTS slug TEXT;
ALTER TABLE public.agent_beauty_supply_store_leads  ADD COLUMN IF NOT EXISTS slug TEXT;
ALTER TABLE public.agent_salon_leads                ADD COLUMN IF NOT EXISTS slug TEXT;
ALTER TABLE public.agent_cosmetologist_leads        ADD COLUMN IF NOT EXISTS slug TEXT;
ALTER TABLE public.events                           ADD COLUMN IF NOT EXISTS slug TEXT;

CREATE INDEX IF NOT EXISTS idx_agent_barber_school_leads_slug      ON public.agent_barber_school_leads(slug);
CREATE INDEX IF NOT EXISTS idx_agent_cosmetology_school_leads_slug ON public.agent_cosmetology_school_leads(slug);
CREATE INDEX IF NOT EXISTS idx_agent_barber_leads_slug             ON public.agent_barber_leads(slug);
CREATE INDEX IF NOT EXISTS idx_agent_barbershop_leads_slug         ON public.agent_barbershop_leads(slug);
CREATE INDEX IF NOT EXISTS idx_agent_barber_supply_store_leads_slug ON public.agent_barber_supply_store_leads(slug);
CREATE INDEX IF NOT EXISTS idx_agent_beauty_supply_store_leads_slug ON public.agent_beauty_supply_store_leads(slug);
CREATE INDEX IF NOT EXISTS idx_agent_salon_leads_slug              ON public.agent_salon_leads(slug);
CREATE INDEX IF NOT EXISTS idx_agent_cosmetologist_leads_slug      ON public.agent_cosmetologist_leads(slug);
CREATE INDEX IF NOT EXISTS idx_events_slug                         ON public.events(slug);
