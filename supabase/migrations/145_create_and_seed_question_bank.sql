/* 
 * BARBER INTELLIGENCE QUESTION BANK v1.0
 * ARCHIVIST: ADI Framework
 * TARGET: Sovereign Education & 2026 Texas Board Alignment
 */

-- 1. Enum for PSI Regulatory Domains
DO $$ BEGIN
    CREATE TYPE public.barber_exam_domain AS ENUM (
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
    domain public.barber_exam_domain NOT NULL,
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
DO $$ BEGIN
    CREATE POLICY "Public questions are viewable by everyone" 
    ON public.question_bank FOR SELECT 
    USING (is_active = true);
EXCEPTION
    WHEN duplicate_object THEN null;
END $$;

DO $$ BEGIN
    CREATE POLICY "Admins can manage question bank" 
    ON public.question_bank FOR ALL 
    USING (auth.jwt() ->> 'role' = 'super_admin');
EXCEPTION
    WHEN duplicate_object THEN null;
END $$;

-- 5. Trigger for updated_at
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = now();
    RETURN NEW;
END;
$$ language 'plpgsql';

DO $$ BEGIN
    CREATE TRIGGER update_question_bank_updated_at
        BEFORE UPDATE ON public.question_bank
        FOR EACH ROW
        EXECUTE FUNCTION update_updated_at_column();
EXCEPTION
    WHEN duplicate_object THEN null;
END $$;

-- 6. Indices for Performance
CREATE INDEX IF NOT EXISTS idx_questions_domain ON public.question_bank(domain);
CREATE INDEX IF NOT EXISTS idx_questions_active ON public.question_bank(is_active);

-- 7. SEED DATA: PHASE 01 - SANITATION (25 Items)
INSERT INTO public.question_bank (domain, question, options, correct_index, explanation, source_ref, difficulty_level)
VALUES 
-- Block 1.1: Common Pathogens & Bacteria (1-5)
('sanitation_disinfection_safety', 'Which of the following is a type of pathogenic bacteria that grows in clusters like bunches of grapes and causes abscesses, pustules, and boils?', '["Bacilli", "Spirilla", "Staphylococci", "Diplococci"]', 2, 'Staphylococci are pus-forming bacteria that grow in clusters like bunches of grapes.', 'Milady 6th Ed, Chapter 5, Page 74', 4),
('sanitation_disinfection_safety', 'Which type of bacteria are round-shaped and appear singly or in groups?', '["Cocci", "Bacilli", "Spirilla", "Flagella"]', 0, 'Cocci are spherical bacteria.', 'Milady 6th Ed, Chapter 5, Page 74', 3),
('sanitation_disinfection_safety', 'Which bacteria are short, rod-shaped and produce diseases such as tetanus and tuberculosis?', '["Cocci", "Bacilli", "Spirilla", "Cilia"]', 1, 'Bacilli are the most common type of bacteria and are rod-shaped.', 'Milady 6th Ed, Chapter 5, Page 75', 4),
('sanitation_disinfection_safety', 'The invasion of body tissues by disease-causing pathogens is called:', '["Inflammation", "Infection", "Contagion", "Exposure"]', 1, 'An infection occurs when the body is invaded by disease-causing pathogens.', 'Milady 6th Ed, Chapter 5, Page 72', 2),
('sanitation_disinfection_safety', 'What is the term for the self-movement of bacteria, often using flagella or cilia?', '["Binary fission", "Motility", "Efficacy", "Inflammation"]', 1, 'Motility refers to the ability of organisms like bacteria to move independently.', 'Milady 6th Ed, Chapter 5, Page 76', 4),
-- Block 1.2: Infection Control Principles (6-10)
('sanitation_disinfection_safety', 'The process that destroys all microbial life, including spores, is called:', '["Sanitation", "Disinfection", "Sterilization", "Decontamination"]', 2, 'Sterilization is the process that destroys all microbial life, including spores.', 'Milady 6th Ed, Chapter 5, Page 82', 3),
('sanitation_disinfection_safety', 'What is the term for the ability of a disinfectant to produce the intended effect as listed on the label?', '["Porosity", "Efficacy", "Solubility", "Toxicity"]', 1, 'Efficacy claims on a label indicate the specific pathogens a disinfectant is proven to destroy.', 'Milady 6th Ed, Chapter 5, Page 84', 4),
('sanitation_disinfection_safety', 'Cleaning is defined as the mechanical method of using soap and water to remove:', '["Spores", "Visible dirt, debris, and many germs", "All bacteria", "Viruses only"]', 1, 'Cleaning is the mechanical removal of visible debris.', 'Milady 6th Ed, Chapter 5, Page 82', 2),
('sanitation_disinfection_safety', 'The chemical process for reducing the number of disease-causing germs on cleaned surfaces to a safe level is:', '["Sanitizing", "Disinfecting", "Sterilizing", "Decontaminating"]', 0, 'Sanitizing reduces germs to a level deemed safe by public health standards.', 'Milady 6th Ed, Chapter 5, Page 82', 3),
('sanitation_disinfection_safety', 'Before disinfecting or sterilizing any tool, what must be done first?', '["Soak in alcohol", "Rinse with cold water", "Clean with soap and warm water to remove all visible debris", "Spray with quats"]', 2, 'Cleaning is the required first step before disinfection.', 'Milady 6th Ed, Chapter 5, Page 83', 3),
-- Block 1.3: Disinfectants & Procedures (11-15)
('sanitation_disinfection_safety', 'When mixing a disinfectant solution, the correct procedure is to:', '["Add water to the concentrate", "Add the concentrate to the water", "Mix both simultaneously", "Use boiling water"]', 1, 'Always add disinfectant concentrate to water to prevent foaming.', 'Milady 6th Ed, Chapter 5, Page 87', 4),
('sanitation_disinfection_safety', 'To be effective, tools must be completely immersed in an EPA-registered disinfectant for at least:', '["2 minutes", "5 minutes", "10 minutes", "30 minutes"]', 2, 'Most EPA-registered disinfectants require a 10-minute contact time.', 'Milady 6th Ed, Chapter 5, Page 85', 3),
('sanitation_disinfection_safety', 'Quaternary ammonium compounds (Quats) are advanced formulations of what level of disinfectant?', '["Low-level", "Hospital-level", "Sterilization-level", "Antiseptic-level"]', 1, 'Quats are advanced hospital-level disinfectants.', 'Milady 6th Ed, Chapter 5, Page 85', 4),
('sanitation_disinfection_safety', 'Which type of disinfectant is extremely caustic and can damage certain rubber and plastic materials?', '["Quats", "Phenolic disinfectants", "Sodium hypochlorite", "Alcohol"]', 1, 'Phenolic disinfectants have a very high pH and are caustic.', 'Milady 6th Ed, Chapter 5, Page 86', 5),
('sanitation_disinfection_safety', 'How often should disinfectant solutions in containers be changed?', '["Weekly", "Daily, or when visibly contaminated", "Monthly", "Every two days"]', 1, 'Disinfectant solutions should be changed daily or whenever they become visibly contaminated.', 'Milady 6th Ed, Chapter 5, Page 87', 3),
-- Block 1.4: Safety & Regulations (16-20)
('sanitation_disinfection_safety', 'What document, required by OSHA, must be available for every chemical product in the barbershop?', '["Business License", "Price List", "Safety Data Sheet (SDS)", "Insurance Policy"]', 2, 'OSHA requires that a Safety Data Sheet (SDS) be available.', 'Milady 6th Ed, Chapter 5, Page 70', 2),
('sanitation_disinfection_safety', 'Standard Precautions require the assumption that:', '["Most clients are healthy", "Only symptomatic clients are contagious", "All human blood and body fluids are potentially infectious", "Disinfection is optional"]', 2, 'Standard Precautions require assuming all human blood and body fluids are infectious.', 'Milady 6th Ed, Chapter 5, Page 95', 4),
('sanitation_disinfection_safety', 'Items that cannot be disinfected after use, such as cotton balls or neck strips, are considered:', '["Multi-use", "Single-use or porous", "Sterile", "Reusable"]', 1, 'Single-use or porous items cannot be properly disinfected.', 'Milady 6th Ed, Chapter 5, Page 88', 2),
('sanitation_disinfection_safety', 'Which type of disinfectant is required to clean up blood or body fluid spills?', '["Alcohol", "Hospital-level disinfectant with virucidal and tuberculocidal properties", "Antiseptic", "Soap and water"]', 1, 'Blood spills require an EPA-registered hospital-level disinfectant.', 'Milady 6th Ed, Chapter 5, Page 86', 5),
('sanitation_disinfection_safety', 'What is the technical term for the contagious skin disease caused by head lice?', '["Scabies", "Pediculosis capitis", "Tinea capitis", "Folliculitis"]', 1, 'Pediculosis capitis is the medical term for head lice.', 'Milady 6th Ed, Chapter 5, Page 81', 4),
-- Block 1.5: Advanced Concepts (21-25)
('sanitation_disinfection_safety', 'The inactive stage of some bacteria, where they create a waxlike outer shell to survive harsh conditions, is called:', '["Binary fission", "Spore-forming stage", "Inflammation", "Immunity"]', 1, 'In the inactive or spore-forming stage, bacteria coat themselves to survive.', 'Milady 6th Ed, Chapter 5, Page 76', 4),
('sanitation_disinfection_safety', 'Which movement method do cilia use?', '["Rowing-like motion", "Snakelike motion", "Spinning motion", "Jumping motion"]', 0, 'Cilia move in a rowing-like motion.', 'Milady 6th Ed, Chapter 5, Page 76', 4),
('sanitation_disinfection_safety', 'The process where a bacterial cell reaches its largest size and divides into two new cells is:', '["Sterilization", "Binary fission", "Decontamination", "Photosynthesis"]', 1, 'Binary fission is the process of bacterial cell division.', 'Milady 6th Ed, Chapter 5, Page 76', 3),
('sanitation_disinfection_safety', 'What is the body''s first line of defense against infection?', '["White blood cells", "Healthy, uncompromised skin", "Antitoxins", "Antibodies"]', 1, 'Unbroken skin is the body''s primary physical barrier.', 'Milady 6th Ed, Chapter 5, Page 94', 3),
('sanitation_disinfection_safety', 'Pathogenic bacteria, viruses, or fungi can enter the body through all of the following EXCEPT:', '["Broken skin", "The mouth", "The nose", "Healthy, intact skin"]', 3, 'Pathogens enter through breaks in the skin, or through body openings, but not healthy skin.', 'Milady 6th Ed, Chapter 5, Page 73', 3);
