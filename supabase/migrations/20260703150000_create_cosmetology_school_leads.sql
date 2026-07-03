-- Cosmetology school leads, mirroring the profile-page-relevant shape of
-- agent_barber_school_leads (Google Places enrichment, financial-aid/outcomes
-- data, and a semantic embedding), sourced from the TDLR active license list.
CREATE TABLE IF NOT EXISTS public.agent_cosmetology_school_leads (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),

    -- Source: TDLR (data.texas.gov) license record
    school_name TEXT NOT NULL,
    license_type TEXT,          -- 'Cosmetology Private School' | 'Cosmetology Junior College'
    license_subtype TEXT,       -- 'PS' | 'JC'
    license_number TEXT UNIQUE,
    license_expiration_date DATE,
    county TEXT,
    city TEXT,
    phone TEXT,
    formatted_address TEXT,
    latitude NUMERIC,
    longitude NUMERIC,

    -- Google Places enrichment
    place_id TEXT,
    website TEXT,
    rating TEXT,
    google_review_count INTEGER,
    google_photos JSONB DEFAULT '[]'::jsonb,
    google_hours JSONB,
    google_business_status TEXT,
    google_types JSONB,
    google_scraped_at TIMESTAMPTZ,

    -- Public financial-aid / outcomes data
    accreditation_status TEXT,  -- e.g. 'State Licensed'; upgraded to accreditor_name below when matched
    accreditor_name TEXT,
    student_body_size INTEGER,
    annual_tuition NUMERIC,
    completion_rate NUMERIC,
    median_earnings NUMERIC,
    default_rate NUMERIC,
    pell_grant_rate NUMERIC,
    federal_loan_rate NUMERIC,
    median_student_debt NUMERIC,
    state_pass_rate TEXT,
    public_data_matched_at TIMESTAMPTZ,

    -- Semantic search
    embedding vector(768),

    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

ALTER TABLE public.agent_cosmetology_school_leads ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Allow public read access to agent_cosmetology_school_leads"
  ON public.agent_cosmetology_school_leads FOR SELECT USING (true);
CREATE POLICY "Allow service role full access to agent_cosmetology_school_leads"
  ON public.agent_cosmetology_school_leads FOR ALL TO service_role USING (true) WITH CHECK (true);
