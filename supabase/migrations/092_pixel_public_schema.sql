-- Migration 092: Move Pixel Analytics to Public Schema
-- This fixes the visibility issue with the API and Edge Functions

-- 1. Create tables in the public schema
CREATE TABLE IF NOT EXISTS public.pixel_events (
  id                  UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  project_id          UUID NOT NULL REFERENCES public.projects(id) ON DELETE CASCADE,
  visitor_id          TEXT NOT NULL,
  event_name          TEXT NOT NULL DEFAULT 'page_view',
  page_url            TEXT,
  page_title          TEXT,
  referrer            TEXT,
  user_agent          TEXT,
  ip_address          INET,
  country             TEXT,
  city                TEXT,
  metadata            JSONB DEFAULT '{}'::jsonb,
  created_at          TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS public.pixel_visitors (
  visitor_id          TEXT NOT NULL,
  project_id          UUID NOT NULL REFERENCES public.projects(id) ON DELETE CASCADE,
  email               TEXT,
  full_name           TEXT,
  first_seen          TIMESTAMPTZ NOT NULL DEFAULT now(),
  last_seen           TIMESTAMPTZ NOT NULL DEFAULT now(),
  identity_metadata   JSONB DEFAULT '{}'::jsonb,
  PRIMARY KEY (visitor_id, project_id)
);

-- 2. Indexes
CREATE INDEX IF NOT EXISTS idx_pixel_events_project_id ON public.pixel_events(project_id);
CREATE INDEX IF NOT EXISTS idx_pixel_events_visitor_id ON public.pixel_events(visitor_id);
CREATE INDEX IF NOT EXISTS idx_pixel_visitors_project_id ON public.pixel_visitors(project_id);

-- 3. RLS
ALTER TABLE public.pixel_events ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.pixel_visitors ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Public insert pixel_events" ON public.pixel_events;
CREATE POLICY "Public insert pixel_events" ON public.pixel_events FOR INSERT WITH CHECK (true);

DROP POLICY IF EXISTS "Public insert pixel_visitors" ON public.pixel_visitors;
CREATE POLICY "Public insert pixel_visitors" ON public.pixel_visitors FOR INSERT WITH CHECK (true);

-- Allow reading for project owners
DROP POLICY IF EXISTS "Read pixel_events for project owners" ON public.pixel_events;
CREATE POLICY "Read pixel_events for project owners" ON public.pixel_events FOR SELECT USING (
    EXISTS (SELECT 1 FROM public.project_user_access pua WHERE pua.project_id = public.pixel_events.project_id AND pua.user_id = auth.uid())
    OR EXISTS (SELECT 1 FROM public.users u WHERE u.id = auth.uid() AND u.role = 'super_admin')
);

DROP POLICY IF EXISTS "Read pixel_visitors for project owners" ON public.pixel_visitors;
CREATE POLICY "Read pixel_visitors for project owners" ON public.pixel_visitors FOR SELECT USING (
    EXISTS (SELECT 1 FROM public.project_user_access pua WHERE pua.project_id = public.pixel_visitors.project_id AND pua.user_id = auth.uid())
    OR EXISTS (SELECT 1 FROM public.users u WHERE u.id = auth.uid() AND u.role = 'super_admin')
);

-- 4. Cleanup old analytics schema
DROP SCHEMA IF EXISTS analytics CASCADE;
