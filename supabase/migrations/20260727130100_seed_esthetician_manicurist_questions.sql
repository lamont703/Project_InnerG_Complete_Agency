/*
 * ESTHETICIAN + MANICURIST QUESTION BANK — SEED v1
 *
 * SOURCING NOTE — read before adding to this file.
 *
 * PSI lists five reference materials for the Texas esthetician written exam:
 * Texas Administrative Code Ch. 83, Texas Occupations Code Ch. 1603, Milady
 * Standard Esthetics Fundamentals (12th Ed), Milady Standard Foundations (1st
 * Ed), and Pivot Point Fundamentals: Esthetics (2022).
 *
 * Every question below is sourced from the Jan 2026 Candidate Information
 * Bulletins themselves — exam structure, scoring, eligibility rules, and the
 * graded practical procedure criteria, which the CIB publishes verbatim. Those
 * bulletins are committed at public/TexasEstheticianCIB2026.pdf and
 * public/TexasManicuristCIB2026.pdf, so every answer here is verifiable against
 * a document in this repo.
 *
 * NOT seeded: skin science, product chemistry, anatomy, and nail-science items
 * — the Milady/Pivot Point half of the outline. Writing those without the
 * textbooks in hand would mean inventing citations, which is exactly what the
 * article copy promises we don't do. Those domains (skin_care,
 * facial_treatments theory, nail_structure_analysis) stay empty until someone
 * seeds them from the actual texts.
 *
 * Coverage this gives, by CIB weighting:
 *   Esthetician — Licensing and Regulation (20%) + Infection Control (25%) = 45%
 *   Manicurist  — Licensing and Regulation (20%) + Infection Control (34%) = 54%
 */

INSERT INTO public.question_bank
    (license_type, domain, question, options, correct_index, explanation, source_ref, difficulty_level)
VALUES

-- ============ ESTHETICIAN — LICENSING AND REGULATION (20%) ============
('esthetician', 'licensing_regulation',
 'In what order must the Texas esthetician written and practical exams be taken?',
 '["Either order — they are scored independently", "The practical must be passed before sitting for the written", "The written must be passed before sitting for the practical", "Both must be taken on the same day"]',
 2,
 'The CIB states plainly: you must pass the written examination before you can sit for the practical examination. They cannot be taken out of order.',
 'PSI/TDLR Texas Esthetician CIB, Jan 2026', 3),

('esthetician', 'licensing_regulation',
 'Once TDLR approves your examination eligibility, how long does that eligibility last and how many attempts are allowed?',
 '["1 year, maximum 3 attempts", "2 years, maximum 5 attempts", "5 years, unlimited attempts", "Indefinitely, unlimited attempts"]',
 2,
 'Examination eligibilities are good for 5 years and you may test an unlimited number of times during that period. A separate fee is required for each attempt.',
 'PSI/TDLR Texas Esthetician CIB, Jan 2026', 4),

('esthetician', 'licensing_regulation',
 'What happens to your PSI examination fee if you do not test within one year of the date PSI receives it?',
 '["It is refunded automatically", "It is forfeited", "It transfers to another candidate", "It is credited toward your TDLR license fee"]',
 1,
 'Fees are not refundable or transferable. The CIB states the fee is forfeited if you do not test within 1 year of the date PSI receives it.',
 'PSI/TDLR Texas Esthetician CIB, Jan 2026', 4),

('esthetician', 'licensing_regulation',
 'How many scored items are on the Texas esthetician written examination, and how long do you have?',
 '["60 scored items, 90 minutes", "75 scored items, 105 minutes", "85 scored items, 90 minutes", "100 scored items, 120 minutes"]',
 1,
 '75 scored items in 105 minutes, 70% correct to pass, plus 7 non-scored pilot items with an additional 10 minutes.',
 'PSI/TDLR Texas Esthetician CIB, Jan 2026', 3),

('esthetician', 'licensing_regulation',
 'Which topic carries the heaviest weight on the Texas esthetician written exam?',
 '["Infection Control (25%)", "Licensing and Regulation (20%)", "Facial Treatments (28%)", "Skin Care (16%)"]',
 2,
 'Facial Treatments is the largest domain at 28% (21 of 75 questions), ahead of Infection Control at 25% (19 questions).',
 'PSI/TDLR Texas Esthetician CIB, Jan 2026', 4),

('esthetician', 'licensing_regulation',
 'What is the passing score on the Texas esthetician practical examination?',
 '["70% — 54 of 76 points", "75% — 57 of 76 points", "70% — 51 of 73 points", "80% — 61 of 76 points"]',
 0,
 'The practical is worth 76 points total and the passing score is 70%, which is 54 points out of 76.',
 'PSI/TDLR Texas Esthetician CIB, Jan 2026', 4),

('esthetician', 'licensing_regulation',
 'The Texas esthetician written examination is administered as which type of exam?',
 '["Open book, with the Texas Administrative Code provided", "Closed book", "Open book, notes permitted", "Closed book, but a formula sheet is provided"]',
 1,
 'The examination is CLOSED BOOK. The reference materials listed in the CIB are used to prepare the questions, not made available during testing.',
 'PSI/TDLR Texas Esthetician CIB, Jan 2026', 2),

-- ============ ESTHETICIAN — INFECTION CONTROL / PRACTICAL PROCEDURE (25%) ============
('esthetician', 'infection_control',
 'In the graded Blood Exposure Incident section, what is the correct order of the five procedure criteria?',
 '["Clean cut, wear gloves, bandage cut, sanitize hands, dispose of materials", "Wear gloves, clean simulated cut, bandage simulated cut, properly dispose of used materials, sanitize/clean hands", "Sanitize hands, wear gloves, clean cut, dispose of materials, bandage cut", "Wear gloves, bandage simulated cut, clean simulated cut, sanitize hands, dispose of materials"]',
 1,
 'The CIB lists the procedure criteria in graded order: wear gloves, clean the simulated cut, bandage the simulated cut, properly dispose of used materials, then sanitize/clean hands. Tasks performed out of order receive no points.',
 'PSI/TDLR Texas Esthetician CIB, Jan 2026', 6),

('esthetician', 'infection_control',
 'On what must all procedures in the Texas esthetician practical examination be performed?',
 '["A live model you bring with you", "A live model provided by PSI", "Mannequins", "Either a live model or a mannequin, candidate''s choice"]',
 2,
 'All procedures must be performed on mannequins. Scoring is evaluated on safety, sanitation, and procedures.',
 'PSI/TDLR Texas Esthetician CIB, Jan 2026', 3),

('esthetician', 'infection_control',
 'What happens if you perform a practical task out of the order listed in the bulletin?',
 '["Points are deducted but the task still counts", "You will NOT receive points for the task", "The evaluator will prompt you to restart", "It is permitted as long as all tasks are completed"]',
 1,
 'All tasks listed in the bulletin must be performed in the order listed unless otherwise stated, or candidates will NOT receive points.',
 'PSI/TDLR Texas Esthetician CIB, Jan 2026', 5),

('esthetician', 'infection_control',
 'Does the time allotted for each practical service include setup and cleanup?',
 '["No — setup and cleanup are untimed", "No — only cleanup is included", "Yes — the time allotted for each service includes setup and cleanup", "Only in the first and last sections"]',
 2,
 'The CIB states the time allotted for each service includes time for setup and cleanup. Candidates receive no points for activities not completed within the time limit.',
 'PSI/TDLR Texas Esthetician CIB, Jan 2026', 5),

('esthetician', 'infection_control',
 'Which of the following is prohibited during the Texas esthetician practical examination?',
 '["Closed-toe shoes", "Aerosol products", "Bringing your own kit", "Disposable gloves"]',
 1,
 'Aerosol products are NOT permitted for use during the examination. Closed-toe shoes are in fact required, and candidates must bring their own supplies.',
 'PSI/TDLR Texas Esthetician CIB, Jan 2026', 4),

('esthetician', 'infection_control',
 'How must a candidate signal that they have finished a section of the practical exam?',
 '["Raise their hand only", "Say ''finished'' to the evaluator", "Step back and raise their hand", "Place both hands on the workstation"]',
 2,
 'Candidates MUST step back and raise their hand at the end of each section to indicate completion.',
 'PSI/TDLR Texas Esthetician CIB, Jan 2026', 4),

('esthetician', 'infection_control',
 'Which practical section is allotted the most time on the Texas esthetician exam?',
 '["Cleansing (14 minutes)", "Massage (17 minutes)", "Waxing with Soft Wax (14 minutes)", "Blood Exposure Incident (12 minutes)"]',
 1,
 'Massage and Mask/Moisturizing are both allotted 17 minutes — the longest sections. Cleansing and Waxing are 14 minutes each.',
 'PSI/TDLR Texas Esthetician CIB, Jan 2026', 5),

-- ============ MANICURIST — LICENSING AND REGULATION (20%) ============
('manicurist', 'licensing_regulation',
 'How many scored items are on the Texas manicurist written examination, and how long do you have?',
 '["60 scored items, 90 minutes", "75 scored items, 105 minutes", "50 scored items, 75 minutes", "60 scored items, 120 minutes"]',
 0,
 '60 scored items in 90 minutes, 70% correct to pass, plus 6 non-scored pilot items with an additional 10 minutes.',
 'PSI/TDLR Texas Manicurist CIB, Jan 2026', 3),

('manicurist', 'licensing_regulation',
 'Which topic carries the heaviest weight on the Texas manicurist written exam?',
 '["Infection Control (34%)", "Nail Care (41%)", "Licensing and Regulation (20%)", "Nail Structure and Analysis (5%)"]',
 1,
 'Nail Care is 41% of the exam (25 of 60 questions), followed by Infection Control at 34% (20 questions).',
 'PSI/TDLR Texas Manicurist CIB, Jan 2026', 4),

('manicurist', 'licensing_regulation',
 'How many questions on the Texas manicurist written exam cover Nail Structure and Analysis?',
 '["12 questions (20%)", "20 questions (34%)", "3 questions (5%)", "25 questions (41%)"]',
 2,
 'Nail Structure and Analysis is the smallest domain at just 5% — 3 of 60 questions. Candidates often over-study anatomy relative to its actual weight.',
 'PSI/TDLR Texas Manicurist CIB, Jan 2026', 5),

('manicurist', 'licensing_regulation',
 'How long is the Texas manicurist practical examination and how many points is it worth?',
 '["1 hour 41 minutes, 76 points", "1 hour 21 minutes, 51 points", "2 hours, 60 points", "1 hour 30 minutes, 51 points"]',
 1,
 'The manicurist practical runs 1 hour and 21 minutes across six sections and is worth 51 points total.',
 'PSI/TDLR Texas Manicurist CIB, Jan 2026', 4),

-- ============ MANICURIST — INFECTION CONTROL (34%) ============
('manicurist', 'infection_control',
 'Which monomer and primer products are permitted during the Texas manicurist practical examination?',
 '["Any professional-grade monomer and primer", "Only products supplied by PSI at the test site", "Only bottles clearly marked ''odorless'' by the manufacturer''s label", "Only products approved in writing by TDLR in advance"]',
 2,
 'Odorless monomer and low-odor primer for one nail: ONLY bottles clearly marked "odorless" by the manufacturer''s label will be allowed.',
 'PSI/TDLR Texas Manicurist CIB, Jan 2026', 6),

('manicurist', 'infection_control',
 'Which section of the Texas manicurist practical exam is allotted the most time?',
 '["Manicure (15 minutes)", "Tip Application on One Nail (12 minutes)", "Nail Enhancement with Form (22 minutes)", "Blood Exposure Incident (12 minutes)"]',
 2,
 'Nail Enhancement with Form is allotted 22 minutes, the longest single section of the manicurist practical.',
 'PSI/TDLR Texas Manicurist CIB, Jan 2026', 5),

('manicurist', 'infection_control',
 'In the graded Blood Exposure Incident section, which step comes immediately after bandaging the simulated cut?',
 '["Sanitize/clean hands", "Remove gloves", "Properly dispose of used materials", "Disinfect the work surface"]',
 2,
 'The graded order is: wear gloves, clean the simulated cut, bandage the simulated cut, properly dispose of used materials, then sanitize/clean hands.',
 'PSI/TDLR Texas Manicurist CIB, Jan 2026', 6),

('manicurist', 'infection_control',
 'How much time is allotted for the Pre-Examination Set Up and Disinfection section?',
 '["5 minutes", "10 minutes", "15 minutes", "20 minutes"]',
 1,
 'Both the opening Pre-Examination Set Up and Disinfection and the closing End of Examination Disinfection sections are allotted 10 minutes each.',
 'PSI/TDLR Texas Manicurist CIB, Jan 2026', 3);
