-- Beauty/hair supply store directory, sourced from Google Places.
-- Mirrors agent_barber_supply_store_leads' schema exactly so it can share the
-- same profile page and search RPC shape. Kept as a separate table (per product
-- request) so barber supply stores and beauty supply stores can be curated,
-- deduped, and re-scraped independently.

CREATE TABLE IF NOT EXISTS public.agent_beauty_supply_store_leads (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    place_id TEXT UNIQUE NOT NULL,
    name TEXT NOT NULL,
    formatted_address TEXT,
    city TEXT,
    phone TEXT,
    website TEXT,
    latitude DOUBLE PRECISION,
    longitude DOUBLE PRECISION,
    rating NUMERIC,
    total_reviews INTEGER DEFAULT 0,
    place_types TEXT,
    business_status TEXT,
    price_level TEXT,
    google_images JSONB,
    hours JSONB,
    embedding vector(768),
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

ALTER TABLE public.agent_beauty_supply_store_leads ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Allow public read access to agent_beauty_supply_store_leads"
  ON public.agent_beauty_supply_store_leads FOR SELECT USING (true);

CREATE INDEX IF NOT EXISTS agent_beauty_supply_store_leads_embedding_idx
  ON public.agent_beauty_supply_store_leads
  USING hnsw (embedding vector_cosine_ops);

CREATE INDEX IF NOT EXISTS agent_beauty_supply_store_leads_city_idx
  ON public.agent_beauty_supply_store_leads (city);

-- Note: dedup against agent_barber_supply_store_leads (a place_id that's
-- already tracked there should never also land in this table) is enforced
-- client-side by the ingestion script, which checks that table's existing
-- place_id UNIQUE column (already indexed) before inserting here.
