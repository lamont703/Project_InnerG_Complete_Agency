-- ============================================================
-- Migration 073: Add 'off' to ai_tier enum
-- Inner G Complete Agency — Client Intelligence Portal
-- ============================================================

-- This must be in its own migration/transaction to be used in 074
ALTER TYPE ai_tier ADD VALUE IF NOT EXISTS 'off';
