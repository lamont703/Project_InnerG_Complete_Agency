-- ============================================================
-- Migration 001: Create All Enum Types
-- Inner G Complete Agency — Client Intelligence Portal
-- ============================================================
-- Run order: FIRST (all other migrations depend on these types)
-- ============================================================

-- USER ROLES
CREATE TYPE user_role AS ENUM (
  'super_admin',
  'developer',
  'client_admin',
  'client_viewer'
);

-- CLIENT STATUS
CREATE TYPE client_status AS ENUM (
  'active',
  'onboarding',
  'paused',
  'archived'
);

-- CLIENT INDUSTRY
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

-- PROJECT STATUS
CREATE TYPE project_status AS ENUM (
  'active',
  'building',
  'paused',
  'archived'
);

-- CAMPAIGN STATUS
CREATE TYPE campaign_status AS ENUM (
  'draft',
  'active',
  'paused',
  'completed',
  'archived'
);

-- SIGNAL TYPE
CREATE TYPE signal_type AS ENUM (
  'inventory',
  'conversion',
  'social',
  'system',
  'ai_insight',
  'ai_action'
);

-- SIGNAL SEVERITY
CREATE TYPE signal_severity AS ENUM (
  'info',
  'warning',
  'critical'
);

-- LEAD STATUS
CREATE TYPE lead_status AS ENUM (
  'new',
  'contacted',
  'qualified',
  'proposal_sent',
  'closed_won',
  'closed_lost'
);

-- ACTIVITY CATEGORY
CREATE TYPE activity_category AS ENUM (
  'retail_ops',
  'growth',
  'revenue',
  'crm',
  'social',
  'system',
  'ai'
);

-- SOCIAL PLATFORM
CREATE TYPE social_platform AS ENUM (
  'instagram',
  'tiktok',
  'youtube',
  'twitter_x'
);

-- CONNECTION STATUS
CREATE TYPE connection_status AS ENUM (
  'active',
  'degraded',
  'offline'
);

-- CHAT ROLE
CREATE TYPE chat_role AS ENUM (
  'user',
  'assistant'
);

-- INTEGRATION SOURCE  
CREATE TYPE integration_source AS ENUM (
  'ghl',
  'instagram',
  'tiktok',
  'youtube',
  'twitter_x',
  'client_db'
);

-- INTEGRATION SYNC STATUS
CREATE TYPE sync_status AS ENUM (
  'success',
  'partial',
  'failed'
);

-- EXTERNAL CLIENT DB TYPE
CREATE TYPE external_db_type AS ENUM (
  'supabase',
  'vercel_postgres',
  'postgres',
  'mysql',
  'other'
);

-- EMBEDDING JOB STATUS (RAG)
CREATE TYPE embed_job_status AS ENUM (
  'pending',
  'processing',
  'done',
  'failed'
);
