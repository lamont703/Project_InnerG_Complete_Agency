-- Adds a full photo gallery and business hours so the barber profile page
-- can match the look of an actual Booksy listing, not just a single photo.
ALTER TABLE public.agent_barber_leads
ADD COLUMN IF NOT EXISTS booksy_gallery_urls JSONB DEFAULT '[]'::jsonb,
ADD COLUMN IF NOT EXISTS booksy_hours JSONB;
