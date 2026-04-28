-- BARBER INTELLIGENCE QUESTION BANK - PHASE 06
-- DOMAIN: chemical_texture_services
-- SOURCE: Milady Barbering 6th Edition, Chapter 17 (Chemical Texture Services)
-- WEIGHT: 7.1% (6 Items)

INSERT INTO public.question_bank (domain, question, options, correct_index, explanation, source_ref, difficulty_level)
VALUES 
-- Block 6.1: Chemistry of Permanent Waves (1-2)
(
    'chemical_texture_services', 
    'Which of the following is the primary chemical action that occurs when the waving solution is applied during a permanent wave service?', 
    '["Oxidation", "Reduction", "Lanthionization", "Neutralization"]', 
    1, 
    'The waving solution breaks the disulfide bonds through a chemical reaction called reduction.', 
    'Milady 6th Ed, Chapter 17, Table 17-1', 
    4
),
(
    'chemical_texture_services', 
    'What is the typical pH range of alkaline (cold) waves, which use ammonium thioglycolate (ATG) as the active ingredient?', 
    '["4.5 to 7.0", "7.8 to 8.2", "9.0 to 9.6", "12.5 to 13.5"]', 
    2, 
    'Alkaline waves, or cold waves, process at room temperature and typically have a pH between 9.0 and 9.6.', 
    'Milady 6th Ed, Chapter 17, Table 17-2', 
    4
),
-- Block 6.2: Hair Relaxers & Re-bonding (3-4)
(
    'chemical_texture_services', 
    'Hydroxide relaxers permanently straighten hair by removing one sulfur atom from a disulfide bond, converting it into a:', 
    '["Peptide bond", "Lanthionine bond", "Casein bond", "Hydrogen bond"]', 
    1, 
    'This process is known as lanthionization, where hydroxide relaxers permanently break disulfide bonds and convert them into lanthionine bonds.', 
    'Milady 6th Ed, Chapter 17, Table 17-1', 
    5
),
(
    'chemical_texture_services', 
    'During a thio-based permanent wave service, the neutralizer re-hardens the newly arranged disulfide bonds through the process of:', 
    '["Reduction", "Dehydration", "Oxidation", "Saponification"]', 
    2, 
    'The neutralizer, which usually contains an oxidizing agent like hydrogen peroxide, re-hardens disulfide bonds by adding oxygen back into the hair.', 
    'Milady 6th Ed, Chapter 17, Table 17-1', 
    4
),
-- Block 6.3: Safety & Precautions (5-6)
(
    'chemical_texture_services', 
    'Before proceeding with any chemical texture service, the barber must examine the client''s scalp and should NOT perform the service if they find:', 
    '["Excessive oiliness", "Fine hair texture", "Cuts or abrasions", "Natural cowlicks"]', 
    2, 
    'A chemical service should never be performed if the scalp shows signs of cuts, abrasions, scratches, or open sores.', 
    'Milady 6th Ed, Chapter 17, Page 580', 
    3
),
(
    'chemical_texture_services', 
    'What is the primary purpose of applying a base cream during a \"base relaxer\" service?', 
    '["To help the relaxer penetrate the cuticle", "To protect the scalp from potential irritation or burns", "To speed up the chemical reaction", "To add moisture to the hair shaft"]', 
    1, 
    'Protective base cream is an oily cream used specifically to protect the client''s scalp during a hydroxide relaxer service.', 
    'Milady 6th Ed, Chapter 17, Relaxing section', 
    3
);
