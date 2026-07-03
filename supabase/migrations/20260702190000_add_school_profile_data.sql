-- Adds Google Places enrichment fields, public financial-aid/outcomes data,
-- and a semantic embedding column so barber schools can have standard
-- profile pages and show up in the search engine's Schools tab.
ALTER TABLE public.agent_barber_school_leads
-- Google Places enrichment
ADD COLUMN IF NOT EXISTS google_review_count INTEGER,
ADD COLUMN IF NOT EXISTS google_photos JSONB DEFAULT '[]'::jsonb,
ADD COLUMN IF NOT EXISTS google_hours JSONB,
ADD COLUMN IF NOT EXISTS google_business_status TEXT,
ADD COLUMN IF NOT EXISTS google_types JSONB,
ADD COLUMN IF NOT EXISTS google_scraped_at TIMESTAMPTZ,
-- Public financial-aid / outcomes data (Texas financial aid CSV, state board pass rates, NCES)
ADD COLUMN IF NOT EXISTS student_body_size INTEGER,
ADD COLUMN IF NOT EXISTS annual_tuition NUMERIC,
ADD COLUMN IF NOT EXISTS completion_rate NUMERIC,
ADD COLUMN IF NOT EXISTS median_earnings NUMERIC,
ADD COLUMN IF NOT EXISTS default_rate NUMERIC,
ADD COLUMN IF NOT EXISTS pell_grant_rate NUMERIC,
ADD COLUMN IF NOT EXISTS federal_loan_rate NUMERIC,
ADD COLUMN IF NOT EXISTS median_student_debt NUMERIC,
ADD COLUMN IF NOT EXISTS state_pass_rate TEXT,
ADD COLUMN IF NOT EXISTS accreditor_name TEXT,
ADD COLUMN IF NOT EXISTS public_data_matched_at TIMESTAMPTZ,
-- Semantic search
ADD COLUMN IF NOT EXISTS embedding vector(768);
