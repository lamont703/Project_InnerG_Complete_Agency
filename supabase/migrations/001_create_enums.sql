-- ============================================================
-- Migration 001: Create All Enum Types
-- Inner G Complete Agency — Client Intelligence Portal
-- ============================================================
-- Run order: FIRST (all other migrations depend on these types)
-- ============================================================

-- USER ROLES
DO $$ BEGIN
    CREATE TYPE user_role AS ENUM (
      'super_admin',
      'developer',
      'client_admin',
      'client_viewer'
    );
EXCEPTION
    WHEN duplicate_object THEN null;
END $$;

-- CLIENT STATUS
DO $$ BEGIN
    CREATE TYPE client_status AS ENUM (
      'active',
      'onboarding',
      'paused',
      'archived'
    );
EXCEPTION
    WHEN duplicate_object THEN null;
END $$;

-- CLIENT INDUSTRY
DO $$ BEGIN
    CREATE TYPE client_industry AS ENUM (
      'retail',
      'ebook_publishing',
      'social_community',
      'dating',
      'hospitality',
      'ecommerce',
      'technology',
      'healthcare',
      'other'
    );
EXCEPTION
    WHEN duplicate_object THEN null;
END $$;

-- PROJECT STATUS
DO $$ BEGIN
    CREATE TYPE project_status AS ENUM (
      'active',
      'building',
      'paused',
      'archived'
    );
EXCEPTION
    WHEN duplicate_object THEN null;
END $$;

-- CAMPAIGN STATUS
DO $$ BEGIN
    CREATE TYPE campaign_status AS ENUM (
      'draft',
      'active',
      'paused',
      'completed',
      'archived'
    );
EXCEPTION
    WHEN duplicate_object THEN null;
END $$;

-- SIGNAL TYPE
DO $$ BEGIN
    CREATE TYPE signal_type AS ENUM (
      'inventory',
      'conversion',
      'social',
      'system',
      'ai_insight',
      'ai_action'
    );
EXCEPTION
    WHEN duplicate_object THEN null;
END $$;

-- SIGNAL SEVERITY
DO $$ BEGIN
    CREATE TYPE signal_severity AS ENUM (
      'info',
      'warning',
      'critical'
    );
EXCEPTION
    WHEN duplicate_object THEN null;
END $$;

-- LEAD STATUS
DO $$ BEGIN
    CREATE TYPE lead_status AS ENUM (
      'new',
      'contacted',
      'qualified',
      'proposal_sent',
      'closed_won',
      'closed_lost'
    );
EXCEPTION
    WHEN duplicate_object THEN null;
END $$;

-- ACTIVITY CATEGORY
DO $$ BEGIN
    CREATE TYPE activity_category AS ENUM (
      'retail_ops',
      'growth',
      'revenue',
      'crm',
      'social',
      'system',
      'ai'
    );
EXCEPTION
    WHEN duplicate_object THEN null;
END $$;

-- SOCIAL PLATFORM
DO $$ BEGIN
    CREATE TYPE social_platform AS ENUM (
      'instagram',
      'tiktok',
      'youtube',
      'twitter_x'
    );
EXCEPTION
    WHEN duplicate_object THEN null;
END $$;

-- CONNECTION STATUS
DO $$ BEGIN
    CREATE TYPE connection_status AS ENUM (
      'active',
      'degraded',
      'offline'
    );
EXCEPTION
    WHEN duplicate_object THEN null;
END $$;

-- CHAT ROLE
DO $$ BEGIN
    CREATE TYPE chat_role AS ENUM (
      'user',
      'assistant'
    );
EXCEPTION
    WHEN duplicate_object THEN null;
END $$;

-- INTEGRATION SOURCE  
DO $$ BEGIN
    CREATE TYPE integration_source AS ENUM (
      'ghl',
      'instagram',
      'tiktok',
      'youtube',
      'twitter_x',
      'client_db'
    );
EXCEPTION
    WHEN duplicate_object THEN null;
END $$;

-- INTEGRATION SYNC STATUS
DO $$ BEGIN
    CREATE TYPE sync_status AS ENUM (
      'success',
      'partial',
      'failed'
    );
EXCEPTION
    WHEN duplicate_object THEN null;
END $$;

-- EXTERNAL CLIENT DB TYPE
DO $$ BEGIN
    CREATE TYPE external_db_type AS ENUM (
      'supabase',
      'vercel_postgres',
      'postgres',
      'mysql',
      'other'
    );
EXCEPTION
    WHEN duplicate_object THEN null;
END $$;

-- EMBEDDING JOB STATUS (RAG)
DO $$ BEGIN
    CREATE TYPE embed_job_status AS ENUM (
      'pending',
      'processing',
      'done',
      'failed'
    );
EXCEPTION
    WHEN duplicate_object THEN null;
END $$;
