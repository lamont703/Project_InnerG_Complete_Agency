-- 031_add_ghl_to_external_db_type.sql
-- Inner G Complete Agency — Database Schema Enhancement
-- ============================================================
-- Adds 'ghl' to the external_db_type enum to allow GoHighLevel
-- connectors to be created and managed via the UI.
-- ============================================================

-- Wrap in a transaction-safe DO block to prevent "already exists" errors
-- during concurrent or repeated deployments.
DO $$ 
BEGIN
    ALTER TYPE public.external_db_type ADD VALUE 'ghl';
EXCEPTION
    WHEN duplicate_object THEN NULL;
END $$;
