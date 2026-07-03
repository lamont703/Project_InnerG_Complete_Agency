-- Adds columns to store scraped Booksy profile data (photo, services/pricing, rating)
-- so every barber can render a standard, LinkedIn-style profile page.
ALTER TABLE public.agent_barber_leads
ADD COLUMN IF NOT EXISTS booksy_photo_url TEXT,
ADD COLUMN IF NOT EXISTS booksy_cover_photo_url TEXT,
ADD COLUMN IF NOT EXISTS booksy_services JSONB DEFAULT '[]'::jsonb,
ADD COLUMN IF NOT EXISTS booksy_price_range TEXT,
ADD COLUMN IF NOT EXISTS booksy_rating NUMERIC,
ADD COLUMN IF NOT EXISTS booksy_review_count INTEGER,
ADD COLUMN IF NOT EXISTS booksy_scraped_at TIMESTAMPTZ;
