-- ============================================================
-- Migration 135: Add Specialized Barber & Wellness Industries
-- Inner G Complete Agency — Institutional Vertical Hardening
-- ============================================================

-- Fix: Add 'barbering', 'cosmetology', and 'wellness' to client_industry enum
-- Note: PostgreSQL does not allow ALTER TYPE ... ADD VALUE inside a transaction block 
-- if used together with other commands, but it works fine as a standalone migration.

ALTER TYPE client_industry ADD VALUE IF NOT EXISTS 'barbering';
ALTER TYPE client_industry ADD VALUE IF NOT EXISTS 'cosmetology';
ALTER TYPE client_industry ADD VALUE IF NOT EXISTS 'wellness';

-- COMMENT: These industries now align with the persona-driven deployment engine.
