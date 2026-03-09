-- ============================================================
-- Migration 024: Chat Agent Alignment
-- Inner G Complete Agency — Client Intelligence Portal
-- ============================================================
-- Aligns the database schema with the final discovery decisions.
-- 1. Enables pg_trgm extension for search
-- 2. Adds is_agency_only flag to ai_signals
-- 3. Updates RLS policies for agency signal privacy
-- 4. Ensures agency_knowledge supports the tagged CMS structure
-- 5. Adds helper functions for agent actions
-- ============================================================

-- Enable pg_trgm extension for fuzzy search
CREATE EXTENSION IF NOT EXISTS pg_trgm;

-- ─────────────────────────────────────────────
-- 1. Add is_agency_only column to ai_signals
-- ─────────────────────────────────────────────
ALTER TABLE public.ai_signals
  ADD COLUMN IF NOT EXISTS is_agency_only BOOLEAN NOT NULL DEFAULT FALSE;

COMMENT ON COLUMN public.ai_signals.is_agency_only IS
  'If true, this signal was created by the Agency Agent and is only visible to Super Admins (even if linked to a project).';

-- ─────────────────────────────────────────────
-- 2. Update RLS policies for ai_signals
-- ─────────────────────────────────────────────

-- Modify the existing select policy to respect is_agency_only
DROP POLICY IF EXISTS ai_signals_select ON public.ai_signals;
CREATE POLICY ai_signals_select ON public.ai_signals
  FOR SELECT USING (
    (
      -- Normal signals: visible to project members
      is_agency_only = FALSE 
      AND (
        EXISTS (
          SELECT 1 FROM public.project_user_access 
          WHERE project_id = ai_signals.project_id AND user_id = auth.uid()
        )
        OR EXISTS (SELECT 1 FROM public.users WHERE id = auth.uid() AND role = 'super_admin')
      )
    )
    OR (
      -- Agency signals: visible ONLY to Super Admins
      is_agency_only = TRUE
      AND EXISTS (SELECT 1 FROM public.users WHERE id = auth.uid() AND role = 'super_admin')
    )
  );

-- ─────────────────────────────────────────────
-- 3. Refine agency_knowledge (Ensure Title/Tags are indexed)
-- ─────────────────────────────────────────────
-- (Already mostly handled in 016, but adding title search index)
CREATE INDEX IF NOT EXISTS idx_agency_knowledge_title_trgm 
  ON public.agency_knowledge USING gin (title gin_trgm_ops);

-- ─────────────────────────────────────────────
-- 4. RPC: trigger_ghl_sync
-- Placeholder for future real-time sync trigger from chat
-- ─────────────────────────────────────────────
CREATE OR REPLACE FUNCTION public.trigger_ghl_sync(
  p_project_id uuid,
  p_contact_name text DEFAULT NULL
)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
  -- Log the request - the background worker will pick this up
  INSERT INTO public.activity_log (project_id, action, category, metadata)
  VALUES (
    p_project_id, 
    'Agent requested real-time GHL sync' || COALESCE(' for ' || p_contact_name, ''),
    'system',
    jsonb_build_object('contact_name', p_contact_name, 'source', 'chat_agent')
  );
  
  -- In a real implementation, we would call an edge function here
  -- or signal a listener via pg_notify
  PERFORM pg_notify('ghl_sync_request', jsonb_build_object(
    'project_id', p_project_id,
    'contact_name', p_contact_name
  )::text);
END;
$$;

COMMENT ON FUNCTION public.trigger_ghl_sync IS
  'Triggered by the AI agent when it detects missing data. Queues a GHL sync request.';
