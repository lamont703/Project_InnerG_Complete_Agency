-- Migration 127: Add Alpaca Types to external_db_type Enum
-- Expands the connection enum to support Alpaca brokerage integrations (OAuth and Direct Keys).

ALTER TYPE public.external_db_type ADD VALUE IF NOT EXISTS 'alpaca';
ALTER TYPE public.external_db_type ADD VALUE IF NOT EXISTS 'alpaca_keys';
ALTER TYPE public.external_db_type ADD VALUE IF NOT EXISTS 'ghl'; -- Adding ghl as well for completeness if missing
ALTER TYPE public.external_db_type ADD VALUE IF NOT EXISTS 'github';
ALTER TYPE public.external_db_type ADD VALUE IF NOT EXISTS 'youtube';
ALTER TYPE public.external_db_type ADD VALUE IF NOT EXISTS 'linkedin';
ALTER TYPE public.external_db_type ADD VALUE IF NOT EXISTS 'tiktok';
ALTER TYPE public.external_db_type ADD VALUE IF NOT EXISTS 'instagram';
ALTER TYPE public.external_db_type ADD VALUE IF NOT EXISTS 'facebook';
ALTER TYPE public.external_db_type ADD VALUE IF NOT EXISTS 'twitter';
