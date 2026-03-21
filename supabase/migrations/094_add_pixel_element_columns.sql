-- ============================================================
-- Migration 094: Add element_name and element_type to Pixel Events
-- Inner G Complete Agency — Proprietary Tracking System
-- ============================================================
-- This adds first-class columns for button/link identification
-- to make analytics queries much faster and cleaner.
-- ============================================================

-- 1. Update Public Schema
ALTER TABLE IF EXISTS public.pixel_events 
  ADD COLUMN IF NOT EXISTS element_name TEXT,
  ADD COLUMN IF NOT EXISTS element_type TEXT;

-- 2. Add Comments for Documentation
COMMENT ON COLUMN public.pixel_events.element_name IS 'The human-readable name of the button, link, or custom tracked element (e.g. "Main CTA", "Contact Link").';
COMMENT ON COLUMN public.pixel_events.element_type IS 'The type of element being tracked (e.g. "button", "a", "form").';
