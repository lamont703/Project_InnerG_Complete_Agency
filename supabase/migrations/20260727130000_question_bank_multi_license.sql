/*
 * QUESTION BANK — MULTI-LICENSE SUPPORT
 *
 * The bank was built barber-only (migration 145): one `barber_exam_domain`
 * enum, no license column, every row implicitly a Class A Barber question.
 * Texas licenses esthetician and manicurist separately, each with its own PSI
 * written exam and its own content outline, so the bank needs to distinguish
 * them before it can serve more than one deck.
 *
 * Schema only. Enum values added here are deliberately NOT used until the
 * follow-up seed migration — Postgres rejects a new enum value used in the
 * same transaction that added it.
 */

-- 1. Which license an exam question belongs to. Existing rows are all barber.
DO $$ BEGIN
    CREATE TYPE public.exam_license_type AS ENUM (
        'barber',
        'cosmetology',
        'esthetician',
        'manicurist'
    );
EXCEPTION
    WHEN duplicate_object THEN null;
END $$;

ALTER TABLE public.question_bank
    ADD COLUMN IF NOT EXISTS license_type public.exam_license_type NOT NULL DEFAULT 'barber';

-- 2. Domains from the Jan 2026 PSI/TDLR Candidate Information Bulletins.
--    Esthetician: Facial Treatments 28%, Infection Control 25%,
--                 Licensing and Regulation 20%, Skin Care 16%, Hair Removal 11%.
--    Manicurist:  Nail Care 41%, Infection Control 34%,
--                 Licensing and Regulation 20%, Nail Structure and Analysis 5%.
--
--    `licensing_regulation` already exists and is shared across licenses —
--    the license_type column is what separates them, not the domain.
ALTER TYPE public.barber_exam_domain ADD VALUE IF NOT EXISTS 'infection_control';
ALTER TYPE public.barber_exam_domain ADD VALUE IF NOT EXISTS 'skin_care';
ALTER TYPE public.barber_exam_domain ADD VALUE IF NOT EXISTS 'facial_treatments';
ALTER TYPE public.barber_exam_domain ADD VALUE IF NOT EXISTS 'hair_removal';
ALTER TYPE public.barber_exam_domain ADD VALUE IF NOT EXISTS 'nail_care';
ALTER TYPE public.barber_exam_domain ADD VALUE IF NOT EXISTS 'nail_structure_analysis';

-- 3. Decks filter by license first, then domain — index the access path.
CREATE INDEX IF NOT EXISTS question_bank_license_domain_idx
    ON public.question_bank (license_type, domain)
    WHERE is_active = true;

COMMENT ON COLUMN public.question_bank.license_type IS
    'Which Texas license this question is written for. Decks MUST filter on this — an esthetician deck serving barber questions is worse than no deck.';
