-- ============================================================
-- Migration 141: Add Barber Academic Roles and Industry
-- ============================================================

-- 1. Add academic roles to user_role enum
-- PostgreSQL doesn't support IF NOT EXISTS for ADD VALUE directly in a single statement 
-- easily without a function or DO block for safety, but Supabase migrations handle individual steps.

ALTER TYPE user_role ADD VALUE IF NOT EXISTS 'student';
ALTER TYPE user_role ADD VALUE IF NOT EXISTS 'instructor';
ALTER TYPE user_role ADD VALUE IF NOT EXISTS 'owner';

-- 2. Add barbering to client_industry enum
ALTER TYPE client_industry ADD VALUE IF NOT EXISTS 'barbering';
