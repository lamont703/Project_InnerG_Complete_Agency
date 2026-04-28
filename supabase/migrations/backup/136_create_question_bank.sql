/* 
 * BARBER INTELLIGENCE QUESTION BANK v1.0
 * ARCHIVIST: ADI Framework
 * TARGET: Sovereign Education & 2026 Texas Board Alignment
 */

-- 1. Enum for PSI Regulatory Domains
DO $$ BEGIN
    CREATE TYPE barber_exam_domain AS ENUM (
        'sanitation_disinfection_safety',
        'shaving',
        'licensing_regulation',
        'haircutting_hairstyling',
        'haircoloring',
        'chemical_texture_services',
        'hair_scalp_care',
        'nail_skin_care'
    );
EXCEPTION
    WHEN duplicate_object THEN null;
END $$;

-- 2. Question Bank Table
CREATE TABLE IF NOT EXISTS public.question_bank (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    domain barber_exam_domain NOT NULL,
    question TEXT NOT NULL,
    options JSONB NOT NULL, -- Format: ["Option A", "Option B", "Option C", "Option D"]
    correct_index INTEGER NOT NULL CHECK (correct_index >= 0 AND correct_index <= 3),
    explanation TEXT,
    source_ref TEXT, -- e.g., "Milady 6th Ed, Page 142"
    difficulty_level INTEGER DEFAULT 5 CHECK (difficulty_level >= 1 AND difficulty_level <= 10),
    is_active BOOLEAN DEFAULT true,
    created_at TIMESTAMPTZ DEFAULT now(),
    updated_at TIMESTAMPTZ DEFAULT now()
);

-- 3. Enable RLS
ALTER TABLE public.question_bank ENABLE ROW LEVEL SECURITY;

-- 4. Policies (Public View for Students, Full Management for Admin)
CREATE POLICY "Public questions are viewable by everyone" 
ON public.question_bank FOR SELECT 
USING (is_active = true);

CREATE POLICY "Admins can manage question bank" 
ON public.question_bank FOR ALL 
USING (auth.jwt() ->> 'role' = 'super_admin');

-- 5. Trigger for updated_at
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = now();
    RETURN NEW;
END;
$$ language 'plpgsql';

CREATE TRIGGER update_question_bank_updated_at
    BEFORE UPDATE ON public.question_bank
    FOR EACH ROW
    EXECUTE FUNCTION update_updated_at_column();

-- 6. Indices for Performance
CREATE INDEX idx_questions_domain ON public.question_bank(domain);
CREATE INDEX idx_questions_active ON public.question_bank(is_active);
