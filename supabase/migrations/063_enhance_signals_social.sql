-- Migration 063: Enhance AI Signals and Social Draft Integration
-- Inner G Complete Agency — Client Intelligence Portal

-- 1. Add metadata column to ai_signals to store structured data (e.g., social_plan_id)
ALTER TABLE public.ai_signals
  ADD COLUMN IF NOT EXISTS metadata JSONB DEFAULT '{}'::jsonb;

COMMENT ON COLUMN public.ai_signals.metadata IS
  'Flexible metadata for signals. For social signals, may contain {"social_plan_id": "..."}.';

-- 2. Add is_agency_only to social_content_plan if not exists (to match signal privacy)
ALTER TABLE public.social_content_plan
  ADD COLUMN IF NOT EXISTS is_agency_only BOOLEAN NOT NULL DEFAULT FALSE;

-- 3. Function to delete a social draft and its associated signal
CREATE OR REPLACE FUNCTION public.delete_social_draft_signal(
  p_draft_id UUID,
  p_project_id UUID
)
RETURNS VOID
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  v_signal_id UUID;
BEGIN
  -- 1. Find the signal associated with this draft (if any)
  -- We'll look for a signal of type 'social' that mentions this draft in its metadata
  SELECT id INTO v_signal_id
  FROM public.ai_signals
  WHERE project_id = p_project_id
    AND signal_type = 'social'
    AND metadata->>'social_plan_id' = p_draft_id::TEXT
    AND is_resolved = FALSE
  LIMIT 1;

  -- 2. Delete the draft
  DELETE FROM public.social_content_plan
  WHERE id = p_draft_id AND project_id = p_project_id;

  -- 3. Resolve/Delete the signal if found
  IF v_signal_id IS NOT NULL THEN
    UPDATE public.ai_signals
    SET is_resolved = TRUE,
        resolved_at = now()
    WHERE id = v_signal_id;
  END IF;
END;
$$;
