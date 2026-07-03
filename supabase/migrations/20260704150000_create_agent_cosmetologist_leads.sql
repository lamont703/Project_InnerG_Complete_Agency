-- Individual cosmetologist/hairstylist leads for Houston, sourced from Booksy
-- (same discovery + enrichment pipeline used for agent_barber_leads).
-- Mirrors agent_barber_leads' full column set exactly for schema parity and
-- so this table can reuse the same profile page template.
CREATE TABLE IF NOT EXISTS public.agent_cosmetologist_leads (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    name TEXT NOT NULL,
    phone TEXT NOT NULL,
    address TEXT,
    profile_url TEXT,
    source TEXT,
    status TEXT DEFAULT 'pending_outreach',
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    last_contacted_at TIMESTAMPTZ,
    outreach_attempts INTEGER DEFAULT 0,
    contact_id TEXT,
    last_conversation_history TEXT,
    is_interested BOOLEAN,
    desired_pay_structure TEXT,
    conversation_turns JSONB DEFAULT '[]'::jsonb,
    latitude NUMERIC,
    longitude NUMERIC,
    passport_submitted BOOLEAN,
    school_name TEXT,
    specialty_type TEXT,
    licensure_status TEXT,
    completed_school_hours INTEGER,
    instagram_handle TEXT,
    tiktok_handle TEXT,
    youtube_channel TEXT,
    placement_pathway TEXT,
    desired_specialties TEXT,
    passport_number TEXT,
    state_board_authority TEXT,
    metro_area TEXT,
    email TEXT,
    website_url TEXT,
    passport_image_url TEXT,
    utm_source TEXT,
    utm_medium TEXT,
    utm_campaign TEXT,
    is_actively_looking BOOLEAN,
    booksy_photo_url TEXT,
    booksy_cover_photo_url TEXT,
    booksy_gallery_urls JSONB DEFAULT '[]'::jsonb,
    booksy_services JSONB DEFAULT '[]'::jsonb,
    booksy_price_range TEXT,
    booksy_rating NUMERIC,
    booksy_review_count INTEGER,
    booksy_hours JSONB,
    booksy_scraped_at TIMESTAMPTZ,
    embedding vector(768),
    CONSTRAINT unique_cosmetologist_phone UNIQUE (phone)
);

ALTER TABLE public.agent_cosmetologist_leads ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Allow public read access to agent_cosmetologist_leads"
  ON public.agent_cosmetologist_leads FOR SELECT USING (true);

CREATE POLICY "Allow service role full access to agent_cosmetologist_leads"
  ON public.agent_cosmetologist_leads FOR ALL TO service_role USING (true) WITH CHECK (true);

CREATE INDEX IF NOT EXISTS agent_cosmetologist_leads_embedding_idx
  ON public.agent_cosmetologist_leads
  USING hnsw (embedding vector_cosine_ops);

CREATE INDEX IF NOT EXISTS agent_cosmetologist_leads_metro_area_idx
  ON public.agent_cosmetologist_leads (metro_area);
