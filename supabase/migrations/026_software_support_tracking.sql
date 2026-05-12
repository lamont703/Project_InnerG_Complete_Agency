-- ============================================================
-- Migration 026: Software Support & Bug Tracking
-- Inner G Complete Agency — Client Intelligence Portal
-- ============================================================

-- 1. ADD 'bug_report' to signal_type enum
-- (Using DO block to prevent errors if already exists)
DO $$ BEGIN
    ALTER TYPE signal_type ADD VALUE 'bug_report';
EXCEPTION
    WHEN duplicate_object THEN null;
END $$;

-- 2. CREATE ticket_status ENUM
DO $$ BEGIN
    CREATE TYPE ticket_status AS ENUM (
      'open',
      'in_progress',
      'testing',
      'fixed',
      'closed'
    );
EXCEPTION
    WHEN duplicate_object THEN null;
END $$;

-- 3. CREATE software_tickets TABLE
CREATE TABLE IF NOT EXISTS public.software_tickets (
  id                UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  project_id        UUID NOT NULL REFERENCES public.projects(id) ON DELETE CASCADE,
  created_by        UUID NOT NULL REFERENCES public.users(id),
  title             TEXT NOT NULL,
  description       TEXT NOT NULL,
  repro_steps       TEXT,
  expected_behavior TEXT,
  actual_behavior   TEXT,
  status            ticket_status NOT NULL DEFAULT 'open',
  severity          signal_severity NOT NULL DEFAULT 'warning',
  assigned_to       UUID REFERENCES public.users(id),
  created_at        TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at        TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- 4. ENABLE RLS
ALTER TABLE public.software_tickets ENABLE ROW LEVEL SECURITY;

-- 5. POLICIES
-- Clients can see tickets for their own projects
CREATE POLICY "Clients can view their project tickets" ON public.software_tickets
  FOR SELECT USING (
    project_id IN (
      SELECT id FROM public.projects WHERE client_id IN (
        SELECT id FROM public.clients WHERE id IN (
          SELECT client_id FROM public.users WHERE id = auth.uid()
        )
      )
    )
  );

-- Developers/Admins can see everything
CREATE POLICY "Admins can view all tickets" ON public.software_tickets
  FOR SELECT USING (
    EXISTS (
      SELECT 1 FROM public.users
      WHERE id = auth.uid() AND role IN ('super_admin', 'developer')
    )
  );

-- Clients can create tickets for their projects
CREATE POLICY "Clients can create tickets" ON public.software_tickets
  FOR INSERT WITH CHECK (
    project_id IN (
      SELECT id FROM public.projects WHERE client_id IN (
        SELECT id FROM public.clients WHERE id IN (
          SELECT client_id FROM public.users WHERE id = auth.uid()
        )
      )
    )
  );

-- 6. INDEXES
CREATE INDEX IF NOT EXISTS idx_software_tickets_project_id ON public.software_tickets(project_id);
CREATE INDEX IF NOT EXISTS idx_software_tickets_status ON public.software_tickets(status);

-- 7. COMMENTING
COMMENT ON TABLE public.software_tickets IS 'Tracks software bugs and feature requests reported by users via the AI Agent.';
