-- ============================================================
-- Migration 007: Create Activity Domain
-- Inner G Complete Agency — Client Intelligence Portal
-- ============================================================
-- Table: activity_log
-- ============================================================

CREATE TABLE public.activity_log (
  id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  project_id      UUID NOT NULL REFERENCES public.projects(id) ON DELETE CASCADE,
  action          TEXT NOT NULL,
  category        activity_category NOT NULL DEFAULT 'system',
  triggered_by    UUID REFERENCES public.users(id),  -- NULL = system-triggered
  created_at      TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX idx_activity_log_project_time ON public.activity_log(project_id, created_at DESC);

COMMENT ON TABLE public.activity_log IS
  'Chronological audit trail of all meaningful events per project. Shown in the Recent Activity feed.';
COMMENT ON COLUMN public.activity_log.triggered_by IS
  'NULL indicates system-triggered event (e.g., cron job, webhook). User ID means a human took an action.';
