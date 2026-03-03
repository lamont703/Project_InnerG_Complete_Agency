-- ============================================================
-- Migration 005: Create Signals Domain
-- Inner G Complete Agency — Client Intelligence Portal
-- ============================================================
-- Table: ai_signals
-- ============================================================

CREATE TABLE public.ai_signals (
  id                UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  project_id        UUID NOT NULL REFERENCES public.projects(id) ON DELETE CASCADE,
  signal_type       signal_type NOT NULL,
  title             TEXT NOT NULL,
  body              TEXT NOT NULL,
  action_label      TEXT,           -- Button label, e.g. "Trigger Retargeting Flow"
  action_url        TEXT,           -- Optional deep-link
  severity          signal_severity NOT NULL DEFAULT 'info',
  is_resolved       BOOLEAN NOT NULL DEFAULT FALSE,
  resolved_by       UUID REFERENCES public.users(id),
  resolved_at       TIMESTAMPTZ,
  created_at        TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX idx_ai_signals_project_id ON public.ai_signals(project_id);
CREATE INDEX idx_ai_signals_unresolved ON public.ai_signals(project_id, is_resolved, created_at DESC)
  WHERE is_resolved = FALSE;

COMMENT ON TABLE public.ai_signals IS
  'AI-generated actionable insight cards shown on the dashboard. Resolved by user action or auto-dismissal.';
COMMENT ON COLUMN public.ai_signals.action_label IS
  'CTA button text. NULL means signal is informational only (no action required).';
COMMENT ON COLUMN public.ai_signals.is_resolved IS
  'TRUE once user clicks the action button or manually dismisses. Resolved signals move to history.';
