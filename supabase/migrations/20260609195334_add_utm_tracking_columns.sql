-- Add UTM tracking columns to agent_barbershop_leads
ALTER TABLE public.agent_barbershop_leads
ADD COLUMN IF NOT EXISTS utm_source text,
ADD COLUMN IF NOT EXISTS utm_medium text,
ADD COLUMN IF NOT EXISTS utm_campaign text;

-- Add UTM tracking columns to agent_barber_leads
ALTER TABLE public.agent_barber_leads
ADD COLUMN IF NOT EXISTS utm_source text,
ADD COLUMN IF NOT EXISTS utm_medium text,
ADD COLUMN IF NOT EXISTS utm_campaign text;
