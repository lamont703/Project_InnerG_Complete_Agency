-- BARBER INTELLIGENCE QUESTION BANK - PHASE 05
-- DOMAIN: haircoloring
-- SOURCE: Milady Barbering 6th Edition, Chapter 18 (Haircoloring & Lightening)
-- WEIGHT: 7.1% (6 Items)

INSERT INTO public.question_bank (domain, question, options, correct_index, explanation, source_ref, difficulty_level)
VALUES 
-- Block 5.1: Color Theory & Categories (1-3)
(
    'haircoloring', 
    'Which of the following colors is created by mixing equal amounts of two primary colors?', 
    '["Blue", "Red", "Green", "Yellow"]', 
    2, 
    'Secondary colors (Green, Orange, Violet) are created by mixing equal amounts of two primary colors.', 
    'Milady 6th Ed, Chapter 18, Page 642', 
    2
),
(
    'haircoloring', 
    'Colors positioned directly opposite each other on the color wheel that neutralize each other when mixed are known as:', 
    '["Primary colors", "Tertiary colors", "Analogous colors", "Complementary colors"]', 
    3, 
    'Complementary colors neutralize or "cancel" each other out when mixed.', 
    'Milady 6th Ed, Chapter 18, Page 643', 
    3
),
(
    'haircoloring', 
    'Which category of haircolor does not require an oxidation process and only makes a physical change by coating the hair shaft?', 
    '["Temporary haircolor", "Demi-permanent haircolor", "Permanent haircolor", "Semi-permanent haircolor"]', 
    0, 
    'Temporary haircolor uses large pigment molecules that do not penetrate the cuticle layer, providing a physical change only.', 
    'Milady 6th Ed, Chapter 18, Page 648', 
    3
),
-- Block 5.2: Chemistry & Safety (4-6)
(
    'haircoloring', 
    'What is the standard volume of hydrogen peroxide typically used with permanent haircolor to achieve optimal deposit and one or two levels of lift?', 
    '["10 volume", "20 volume", "30 volume", "40 volume"]', 
    1, 
    '20-volume hydrogen peroxide is the standard strength used with most permanent haircolor for lift and color deposit.', 
    'Milady 6th Ed, Chapter 18, Page 656', 
    4
),
(
    'haircoloring', 
    'To identify a possible allergy, the U.S. Food, Drug, and Cosmetic Act requires a patch test be performed how many hours prior to an aniline derivative haircolor?', 
    '["1 to 2 hours", "12 to 24 hours", "24 to 48 hours", "72 to 96 hours"]', 
    2, 
    'A patch test (predisposition test) must be performed 24 to 48 hours before the application of aniline derivative haircolor.', 
    'Milady 6th Ed, Chapter 18, Page 664', 
    5
),
(
    'haircoloring', 
    'What type of haircolor contains color molecules small enough to partially penetrate the hair shaft and last through 4–8 shampoos?', 
    '["Temporary", "Semi-permanent", "Permanent", "Metallic"]', 
    1, 
    'Semi-permanent haircolor is a non-oxidation color with smaller pigment molecules that partially penetrate the hair shaft.', 
    'Milady 6th Ed, Chapter 18, Page 649', 
    4
);
