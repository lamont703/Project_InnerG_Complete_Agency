-- Migration 106: Hardening Social Content Plan for Unified Dispatch
-- Consolidates the "Planning" and "Queueing" layers into a single authoritative table.

-- 1. Add missing deployment columns to social_content_plan
ALTER TABLE public.social_content_plan 
ADD COLUMN IF NOT EXISTS title TEXT,
ADD COLUMN IF NOT EXISTS destination_id TEXT, -- platform-specific ID (e.g. ghl_account_id)
ADD COLUMN IF NOT EXISTS dispatch_metadata JSONB DEFAULT '{}'::jsonb; -- payload extras for the worker

-- 2. Ensure RLS is updated for the new columns (Select/Insert/Update already covered in 047)

-- 3. Transition Policy: Update published posts status if needed
-- No-op for now as we want to preserve historical drafts.

COMMENT ON COLUMN public.social_content_plan.destination_id IS 'Specific delivery node identifier (e.g. GHL Location ID or YT Channel ID).';
COMMENT ON COLUMN public.social_content_plan.dispatch_metadata IS 'Technical payload extras required by the platform-specific dispatcher.';
