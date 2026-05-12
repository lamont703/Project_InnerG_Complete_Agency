-- BARBER INTELLIGENCE QUESTION BANK - PHASE 02
-- DOMAIN: shaving
-- SOURCE: Milady Barbering 6th Edition, Chapter 13 (Shaving & Facial Hair Design)
-- WEIGHT: 17.6% (15 Items)

INSERT INTO public.question_bank (domain, question, options, correct_index, explanation, source_ref, difficulty_level)
VALUES 
-- Block 2.1: Shaving Areas & Strokes (1-5)
(
    'shaving', 
    'Which razor position and stroke is used on Area 1 (the right sideburn toward the jawbone) for a right-handed barber?', 
    '["Backhand", "Freehand", "Reverse Freehand", "Reverse Backhand"]', 
    1, 
    'For a right-handed barber, Area 1 is shaved using the freehand stroke in a downward gliding motion toward the jawbone.', 
    'Milady 6th Ed, Chapter 13, Page 342', 
    4
),
(
    'shaving', 
    'For a right-handed barber, which stroke is correctly applied to Area 2 (from the angle of the mouth toward the point of the chin)?', 
    '["Freehand", "Reverse Freehand", "Backhand", "Reverse Backhand"]', 
    2, 
    'Area 2 is one of the four specific areas (2, 6, 7, and 9) where the backhand stroke is used to shave in a downward direction.', 
    'Milady 6th Ed, Chapter 13, Page 343', 
    4
),
(
    'shaving', 
    'What is the correct movement and direction for a Reverse Freehand stroke?', 
    '["A downward gliding stroke toward the barber", "An upward gliding stroke toward the barber", "A downward stroke away from the barber", "A horizontal stroke across the grain"]', 
    1, 
    'The Reverse Freehand position uses an upward movement directed toward the barber, leading with the point of the razor.', 
    'Milady 6th Ed, Chapter 13, Page 341', 
    5
),
(
    'shaving', 
    'In which of the 14 shaving areas is the Reverse Freehand stroke primarily used to shave upward against the grain change?', 
    '["Area 1", "Area 2", "Area 5", "Area 11"]', 
    2, 
    'Area 5 (right side of neck) and Area 10 (left side of neck) utilize the Reverse Freehand stroke to shave upward from the grain change.', 
    'Milady 6th Ed, Chapter 13, Page 344', 
    5
),
(
    'shaving', 
    'Under what specific condition is the Reverse Backhand stroke typically employed?', 
    '["Shaving the upper lip", "During a neck shave with the client in an upright position", "Shaving the point of the chin", "During the first-time-over shave"]', 
    1, 
    'The Reverse Backhand is used specifically for neck shaves when the client is sitting upright.', 
    'Milady 6th Ed, Chapter 13, Page 341', 
    5
),
-- Block 2.2: Preparation & Procedures (6-10)
(
    'shaving', 
    'At what approximate angle should the straight razor be held against the skin surface during the shaving service?', 
    '["15 degrees", "30 degrees", "45 degrees", "90 degrees"]', 
    1, 
    'Holding the razor at a 30-degree angle to the skin surface allows for efficient hair removal without digging into the skin.', 
    'Milady 6th Ed, Chapter 13, Page 340', 
    3
),
(
    'shaving', 
    'What is the primary technical purpose of applying a hot, steam-filled towel to the face before shaving?', 
    '["To cleanse the pores", "To soften the hair cuticle and provide lubrication", "To close the sebaceous glands", "To narrow the hair follicle"]', 
    1, 
    'Steaming softens the hair fiber, stimulates the oil glands for lubrication, and relaxes the client.', 
    'Milady 6th Ed, Chapter 13, Page 339', 
    3
),
(
    'shaving', 
    'Why is the application of warm lather essential for a professional shaving service?', 
    '["To mask the scent of the razor", "To hold the hair in an upright position and soften the skin", "To cool the skin after steaming", "To prevent the hair from growing back quickly"]', 
    1, 
    'Lather acts as a support system to keep hair upright for the razor and provides a protective cushion for the skin.', 
    'Milady 6th Ed, Chapter 13, Page 339', 
    3
),
(
    'shaving', 
    'To ensure a safe shave and prevent nicks, how should the barber use their non-dominant hand?', 
    '["To hold the razor steady", "To stretch the skin tautly in the opposite direction of the stroke", "To apply extra lather during the stroke", "To keep the client''s head from moving"]', 
    1, 
    'Stretching the skin tautly with the non-dominant hand creates a smooth surface for the razor and prevents nicks.', 
    'Milady 6th Ed, Chapter 13, Page 340', 
    4
),
(
    'shaving', 
    'In the context of shaving, what does the term "Grain" refer to?', 
    '["The thickness of the shaving cream", "The direction in which the hair grows from the skin", "The sharpness of the razor blade", "The texture of the skin after a shave"]', 
    1, 
    'Analyzing the grain is essential to ensure the barber shaves with the grain during the first-time-over to prevent irritation.', 
    'Milady 6th Ed, Chapter 13, Page 338', 
    2
),
-- Block 2.3: Tools & Safety (11-15)
(
    'shaving', 
    'Which practice is defined as shaving against the grain during the second-time-over part of the shave?', 
    '["Once-over shaving", "Close shaving", "Clean shaving", "Heavy shaving"]', 
    1, 
    'Close shaving involves shaving against the grain. It is generally discouraged professionally as it can cause irritation.', 
    'Milady 6th Ed, Chapter 13, Page 347', 
    4
),
(
    'shaving', 
    'Which tool is used to "sharpen" a conventional straight razor by grinding the metal to a fine edge?', 
    '["Canvas Strop", "Hone", "Leather Strop", "Sharpening Stone"]', 
    1, 
    'A hone is an abrasive stone used to sharpen the edge of a razor.', 
    'Milady 6th Ed, Chapter 5, Page 128', 
    4
),
(
    'shaving', 
    'What is the technical purpose of using a "strop" on a straight razor?', 
    '["To remove nicks from the blade", "To sharpen a dull blade", "To smooth the edge and remove the \"burr\"", "To disinfect the blade surface"]', 
    2, 
    'Stropping aligns the microscopic teeth of the razor and polishes the edge, ensuring a smooth glide.', 
    'Milady 6th Ed, Chapter 5, Page 130', 
    4
),
(
    'shaving', 
    'If a barber accidentally nicks a client, which method is acceptable in a Texas barbershop to stop minor bleeding?', 
    '["Using a shared styptic pencil", "Applying liquid or powdered styptic with a sterile applicator", "Wiping with a hot towel", "Applying pressure with a used neck strip"]', 
    1, 
    'Shared styptic pencils are prohibited. Only disposable/sterile powder or liquid styptics may be used.', 
    'Milady 6th Ed, Chapter 13, Page 339', 
    5
),
(
    'shaving', 
    'A barber must REFUSE a shaving service if the client exhibits which condition?', 
    '["Dry skin", "Pustules, infections, or skin mouth sores", "Coarse beard hair", "Sunburned skin"]', 
    1, 
    'Shaving over pustules or infections can spread pathogens and significantly irritates the affected skin.', 
    'Milady 6th Ed, Chapter 13, Page 338', 
    4
);
