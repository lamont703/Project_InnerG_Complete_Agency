-- All 9 entity tables have been backfilled with zero-null, zero-duplicate,
-- zero-cross-table-collision slugs (verified live before this migration).
-- Tighten the column to the real constraint now that every row qualifies.

ALTER TABLE public.agent_barber_school_leads       ALTER COLUMN slug SET NOT NULL;
ALTER TABLE public.agent_barber_school_leads       ADD CONSTRAINT agent_barber_school_leads_slug_unique UNIQUE (slug);

ALTER TABLE public.agent_cosmetology_school_leads   ALTER COLUMN slug SET NOT NULL;
ALTER TABLE public.agent_cosmetology_school_leads   ADD CONSTRAINT agent_cosmetology_school_leads_slug_unique UNIQUE (slug);

ALTER TABLE public.agent_barber_leads               ALTER COLUMN slug SET NOT NULL;
ALTER TABLE public.agent_barber_leads               ADD CONSTRAINT agent_barber_leads_slug_unique UNIQUE (slug);

ALTER TABLE public.agent_barbershop_leads           ALTER COLUMN slug SET NOT NULL;
ALTER TABLE public.agent_barbershop_leads           ADD CONSTRAINT agent_barbershop_leads_slug_unique UNIQUE (slug);

ALTER TABLE public.agent_barber_supply_store_leads  ALTER COLUMN slug SET NOT NULL;
ALTER TABLE public.agent_barber_supply_store_leads  ADD CONSTRAINT agent_barber_supply_store_leads_slug_unique UNIQUE (slug);

ALTER TABLE public.agent_beauty_supply_store_leads  ALTER COLUMN slug SET NOT NULL;
ALTER TABLE public.agent_beauty_supply_store_leads  ADD CONSTRAINT agent_beauty_supply_store_leads_slug_unique UNIQUE (slug);

ALTER TABLE public.agent_salon_leads                ALTER COLUMN slug SET NOT NULL;
ALTER TABLE public.agent_salon_leads                ADD CONSTRAINT agent_salon_leads_slug_unique UNIQUE (slug);

ALTER TABLE public.agent_cosmetologist_leads        ALTER COLUMN slug SET NOT NULL;
ALTER TABLE public.agent_cosmetologist_leads        ADD CONSTRAINT agent_cosmetologist_leads_slug_unique UNIQUE (slug);

ALTER TABLE public.events                           ALTER COLUMN slug SET NOT NULL;
ALTER TABLE public.events                           ADD CONSTRAINT events_slug_unique UNIQUE (slug);
