-- supabase/migrations/171_add_email_to_barbershop_leads.sql
-- Add email tracking to the SMS barbershop agent

ALTER TABLE public.agent_barbershop_leads
ADD COLUMN IF NOT EXISTS email TEXT;
