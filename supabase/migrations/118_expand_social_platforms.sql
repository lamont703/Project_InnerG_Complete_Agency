-- Migration 062: Expand Social Platforms
-- Inner G Complete Agency — Client Intelligence Portal
-- Adds missing platform values to social_platform and integration_source enums to prevent provisioning failures.

-- 1. social_platform Enum
DO $$ 
BEGIN
    ALTER TYPE public.social_platform ADD VALUE 'twitter';
EXCEPTION
    WHEN duplicate_object THEN NULL;
END $$;

DO $$ 
BEGIN
    ALTER TYPE public.social_platform ADD VALUE 'facebook';
EXCEPTION
    WHEN duplicate_object THEN NULL;
END $$;

DO $$ 
BEGIN
    ALTER TYPE public.social_platform ADD VALUE 'linkedin';
EXCEPTION
    WHEN duplicate_object THEN NULL;
END $$;

DO $$ 
BEGIN
    ALTER TYPE public.social_platform ADD VALUE 'ghl';
EXCEPTION
    WHEN duplicate_object THEN NULL;
END $$;

DO $$ 
BEGIN
    ALTER TYPE public.social_platform ADD VALUE 'discord';
EXCEPTION
    WHEN duplicate_object THEN NULL;
END $$;

DO $$ 
BEGIN
    ALTER TYPE public.social_platform ADD VALUE 'slack';
EXCEPTION
    WHEN duplicate_object THEN NULL;
END $$;


-- 2. integration_source Enum (for consistency in sync logs)
DO $$ 
BEGIN
    ALTER TYPE public.integration_source ADD VALUE 'twitter';
EXCEPTION
    WHEN duplicate_object THEN NULL;
END $$;

DO $$ 
BEGIN
    ALTER TYPE public.integration_source ADD VALUE 'facebook';
EXCEPTION
    WHEN duplicate_object THEN NULL;
END $$;

DO $$ 
BEGIN
    ALTER TYPE public.integration_source ADD VALUE 'ghl';
EXCEPTION
    WHEN duplicate_object THEN NULL;
END $$;

-- 3. external_db_type Enum (for consistency in connectors)
DO $$ 
BEGIN
    ALTER TYPE public.external_db_type ADD VALUE 'twitter';
EXCEPTION
    WHEN duplicate_object THEN NULL;
END $$;

DO $$ 
BEGIN
    ALTER TYPE public.external_db_type ADD VALUE 'facebook';
EXCEPTION
    WHEN duplicate_object THEN NULL;
END $$;

DO $$ 
BEGIN
    ALTER TYPE public.external_db_type ADD VALUE 'ghl';
EXCEPTION
    WHEN duplicate_object THEN NULL;
END $$;
