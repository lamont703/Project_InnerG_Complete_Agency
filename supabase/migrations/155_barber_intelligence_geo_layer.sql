-- Migration 155: Barber Intelligence Geo-Layer
-- Archivist: ADI Framework
-- Purpose: Enable hyper-local targeting and failure probability mapping.

-- 1. Create Barber Schools Table
CREATE TABLE IF NOT EXISTS public.barber_schools (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    license_number TEXT UNIQUE,
    name TEXT NOT NULL,
    city TEXT,
    county TEXT,
    zip_code TEXT,
    failure_rate_institutional NUMERIC(5,2), -- Historical failure rate from state reports
    is_red_zone BOOLEAN DEFAULT false,       -- High-priority intervention target
    last_sync_at TIMESTAMPTZ DEFAULT now(),
    created_at TIMESTAMPTZ DEFAULT now(),
    UNIQUE (name, city)
);

-- 2. Add school_id to Telemetry
-- Allows us to aggregate performance data by institution in real-time.
ALTER TABLE public.barber_exam_telemetry 
ADD COLUMN IF NOT EXISTS school_id UUID REFERENCES public.barber_schools(id);

-- 3. Add school_id to Registrations & Projects
-- Ensures students and their portals are mapped to their institution.
ALTER TABLE public.barber_registrations 
ADD COLUMN IF NOT EXISTS school_id UUID REFERENCES public.barber_schools(id);

ALTER TABLE public.projects 
ADD COLUMN IF NOT EXISTS school_id UUID REFERENCES public.barber_schools(id);

-- 4. Enable RLS for Schools
ALTER TABLE public.barber_schools ENABLE ROW LEVEL SECURITY;

DO $$ BEGIN
    CREATE POLICY "Public schools are viewable by everyone" 
    ON public.barber_schools FOR SELECT 
    USING (true);
EXCEPTION
    WHEN duplicate_object THEN null;
END $$;

DO $$ BEGIN
    CREATE POLICY "Admins can manage schools" 
    ON public.barber_schools FOR ALL 
    USING (auth.jwt() ->> 'role' = 'super_admin');
EXCEPTION
    WHEN duplicate_object THEN null;
END $$;

-- 5. Indexing for High-Performance Geo-Querying
CREATE INDEX IF NOT EXISTS idx_telemetry_school_id ON public.barber_exam_telemetry(school_id);
CREATE INDEX IF NOT EXISTS idx_registrations_school_id ON public.barber_registrations(school_id);
CREATE INDEX IF NOT EXISTS idx_schools_city ON public.barber_schools(city);
CREATE INDEX IF NOT EXISTS idx_schools_red_zone ON public.barber_schools(is_red_zone);
