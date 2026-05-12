-- Migration 102: Add Twitter to External DB Type
-- Inner G Complete Agency — Client Intelligence Portal

-- Add 'twitter' to external_db_type enum
DO $$ 
BEGIN
    ALTER TYPE public.external_db_type ADD VALUE 'twitter';
EXCEPTION
    WHEN duplicate_object THEN NULL;
END $$;
