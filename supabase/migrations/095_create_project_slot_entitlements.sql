-- ============================================================
-- Migration 095: Create Project Slot Entitlements Table
-- Inner G Complete Agency — Client Intelligence Portal
-- ============================================================
-- This table defines which projects are "entitled" (allowed)
-- to use specific metric slots from the registry.
-- ============================================================

CREATE TABLE IF NOT EXISTS public.project_slot_entitlements (
  id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  project_id      UUID NOT NULL REFERENCES public.projects(id) ON DELETE CASCADE,
  slot_id         TEXT NOT NULL,          -- Matching the ID in the METRIC_REGISTRY (registry.ts)
  created_at      TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE (project_id, slot_id)
);

-- Enable RLS
ALTER TABLE public.project_slot_entitlements ENABLE ROW LEVEL SECURITY;

-- Policies
-- 1. Agency Super-Admins can manage everything
DROP POLICY IF EXISTS "Agency admins can manage slot entitlements" ON public.project_slot_entitlements;
CREATE POLICY "Agency admins can manage slot entitlements"
  ON public.project_slot_entitlements FOR ALL
  USING (
    EXISTS (
      SELECT 1 FROM public.users u
      WHERE u.id = auth.uid()
      AND u.role = 'super_admin'
    )
  );

-- 2. Project Owners/Admins can read entitlements for their own projects
DROP POLICY IF EXISTS "Project admins can read their slot entitlements" ON public.project_slot_entitlements;
CREATE POLICY "Project admins can read their slot entitlements"
  ON public.project_slot_entitlements FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM public.project_user_access pua
      WHERE pua.project_id = public.project_slot_entitlements.project_id
      AND pua.user_id = auth.uid()
    ) OR (
       EXISTS (
        SELECT 1 FROM public.users u
        WHERE u.id = auth.uid()
        AND u.role = 'super_admin'
      )
    )
  );

COMMENT ON TABLE public.project_slot_entitlements IS 'Defines which specific metric slots (features) are enabled for a given project.';
COMMENT ON COLUMN public.project_slot_entitlements.slot_id IS 'The unique ID as defined in features/metrics/registry.ts catalog.';
