-- Create a new migration to add Google Places columns to agent_barber_school_leads
ALTER TABLE public.agent_barber_school_leads
ADD COLUMN IF NOT EXISTS website TEXT,
ADD COLUMN IF NOT EXISTS rating TEXT,
ADD COLUMN IF NOT EXISTS place_id TEXT,
ADD COLUMN IF NOT EXISTS formatted_address TEXT;
