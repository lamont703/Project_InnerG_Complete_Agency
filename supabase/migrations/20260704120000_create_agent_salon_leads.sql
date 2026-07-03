-- Hair & beauty salon directory for Houston, sourced from Google Places.
-- Mirrors agent_barbershop_leads' full column set exactly (same names/types)
-- for schema parity across the two business-directory tables — salon rows
-- from this Places sweep will only populate the Places-derived columns
-- (place_id, formatted_address, rating, etc. + google_images + embedding);
-- the barbershop-recruiting-specific columns (hiring_need, rent_type,
-- veo_*, chair_pricing_tool_url, foot-traffic-radar fields, etc.) stay at
-- their defaults/NULL until/unless a future feature populates them for salons.
CREATE TABLE IF NOT EXISTS public.agent_salon_leads (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    contact_id TEXT UNIQUE,
    shop_name TEXT,
    owner_name TEXT,
    phone TEXT,
    city TEXT,
    hiring_need BOOLEAN DEFAULT FALSE,
    rent_type TEXT,
    specialty_desired TEXT,
    booth_count_available INTEGER DEFAULT 0,
    last_conversation_history TEXT,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    conversation_turns JSONB NOT NULL DEFAULT '[]'::jsonb,
    rent_rate TEXT,
    email TEXT,
    outreach_status TEXT DEFAULT 'pending',
    last_contacted_at TIMESTAMPTZ,
    outreach_attempts INTEGER DEFAULT 0,
    place_id TEXT UNIQUE,
    formatted_address TEXT,
    website TEXT,
    latitude NUMERIC,
    longitude NUMERIC,
    rating NUMERIC,
    total_reviews INTEGER,
    place_types TEXT,
    business_status TEXT,
    veo_op_id TEXT,
    veo_video_url TEXT,
    veo_status TEXT,
    shop_image_url TEXT,
    utm_source TEXT,
    utm_medium TEXT,
    utm_campaign TEXT,
    shop_profile_page_url TEXT,
    instagram_handle TEXT,
    chair_pricing_tool_url TEXT,
    opportunity_status TEXT,
    top_anchor_tenants JSONB,
    competitor_count_800m INTEGER,
    local_wealth_indicator TEXT,
    review_momentum_status TEXT,
    ai_culture_summary TEXT,
    radar_last_updated_at TIMESTAMPTZ,
    site_config JSONB,
    customizer_url TEXT,
    google_images JSONB,
    embedding vector(768)
);

ALTER TABLE public.agent_salon_leads ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Allow public read access to agent_salon_leads"
  ON public.agent_salon_leads FOR SELECT USING (true);

CREATE INDEX IF NOT EXISTS agent_salon_leads_embedding_idx
  ON public.agent_salon_leads
  USING hnsw (embedding vector_cosine_ops);

CREATE INDEX IF NOT EXISTS agent_salon_leads_city_idx
  ON public.agent_salon_leads (city);

-- Dedup against agent_barbershop_leads is enforced client-side by the
-- ingestion script (a place_id already tracked as a barbershop should not
-- also be added here), same approach used for the supply-store tables.
