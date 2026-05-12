-- 033_add_integration_to_activity_category.sql
-- Inner G Complete Agency — Database Schema Enhancement
-- ============================================================
-- Adds 'integration' and 'user' to the activity_category enum.
-- This aligns the database with the TypeScript types and allows 
-- connector syncs to log their activity correctly.
-- ============================================================

DO $$ 
BEGIN
    ALTER TYPE public.activity_category ADD VALUE 'integration';
EXCEPTION
    WHEN duplicate_object THEN NULL;
END $$;

DO $$ 
BEGIN
    ALTER TYPE public.activity_category ADD VALUE 'user';
EXCEPTION
    WHEN duplicate_object THEN NULL;
END $$;
