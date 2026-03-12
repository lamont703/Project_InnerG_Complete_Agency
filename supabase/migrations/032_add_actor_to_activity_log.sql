-- 032_add_actor_to_activity_log.sql
-- Inner G Complete Agency — Database Schema Enhancement
-- ============================================================
-- Adds the 'actor' column to the activity_log table.
-- This allows us to track who or what (e.g., 'system') triggered
-- an event even if no specific user_id is linked.
-- ============================================================

ALTER TABLE public.activity_log 
ADD COLUMN IF NOT EXISTS actor TEXT;

COMMENT ON COLUMN public.activity_log.actor IS 
'Identifies the non-user entity that triggered the event (e.g., "system", "ai", "cron").';
