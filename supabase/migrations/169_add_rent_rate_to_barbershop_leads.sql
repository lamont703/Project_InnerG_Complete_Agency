-- supabase/migrations/169_add_rent_rate_to_barbershop_leads.sql
-- Add rent_rate column to store the specific chair rental or commission rate

ALTER TABLE public.agent_barbershop_leads
  ADD COLUMN IF NOT EXISTS rent_rate TEXT;
