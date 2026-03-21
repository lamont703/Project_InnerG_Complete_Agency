-- ============================================================
-- Migration 091: Create Pixel Analytics Schema and Tables
-- Inner G Complete Agency — Proprietary Tracking System
-- ============================================================
-- Tables: analytics.pixel_events, analytics.visitors
-- ============================================================

-- 1. Create Analytics Schema
CREATE SCHEMA IF NOT EXISTS analytics;

-- 2. PIXEL EVENTS (Raw Pings)
CREATE TABLE IF NOT EXISTS analytics.pixel_events (
  id                  UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  project_id          UUID NOT NULL REFERENCES public.projects(id) ON DELETE CASCADE,
  visitor_id          TEXT NOT NULL,          -- Permanent browser-side ID
  event_name          TEXT NOT NULL DEFAULT 'page_view',
  page_url            TEXT,
  page_title          TEXT,
  referrer            TEXT,
  user_agent          TEXT,
  ip_address          INET,                   -- Optional, anonymize if needed
  country             TEXT,
  city                TEXT,
  metadata            JSONB DEFAULT '{}'::jsonb, -- Custom values like form_id, value, etc.
  created_at          TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- 3. VISITORS (Identities & Profiles)
CREATE TABLE IF NOT EXISTS analytics.visitors (
  visitor_id          TEXT NOT NULL,
  project_id          UUID NOT NULL REFERENCES public.projects(id) ON DELETE CASCADE,
  email               TEXT,                   -- Stitched when user fills out a form
  full_name           TEXT,
  first_seen          TIMESTAMPTZ NOT NULL DEFAULT now(),
  last_seen           TIMESTAMPTZ NOT NULL DEFAULT now(),
  identity_metadata   JSONB DEFAULT '{}'::jsonb,
  PRIMARY KEY (visitor_id, project_id)        -- Unique per visitor per project
);

-- 4. INDEXES for Performance
CREATE INDEX IF NOT EXISTS idx_pixel_events_project_id ON analytics.pixel_events(project_id);
CREATE INDEX IF NOT EXISTS idx_pixel_events_visitor_id ON analytics.pixel_events(visitor_id);
CREATE INDEX IF NOT EXISTS idx_pixel_events_created_at ON analytics.pixel_events(created_at);
CREATE INDEX IF NOT EXISTS idx_visitors_project_id ON analytics.visitors(project_id);
CREATE INDEX IF NOT EXISTS idx_visitors_email ON analytics.visitors(email);

-- 5. TRIGGER for updated_at behavior on visitors (manual last_seen update)
-- We'll handle last_seen via the Edge Function for now.

-- 6. RLS (Row Level Security)
-- Granting anonymized access to ingest data
ALTER TABLE analytics.pixel_events ENABLE ROW LEVEL SECURITY;
ALTER TABLE analytics.visitors ENABLE ROW LEVEL SECURITY;

-- Allow anonymous inserts (via service_role or specific public role)
-- For a tracking pixel, we typically use the service_role for edge function ingestion,
-- but if we want direct-to-db (not recommended), we'd need more complex RLS.
-- Since Step 2 is an Edge Function, we'll keep RLS strict and have the function use service_role.

DROP POLICY IF EXISTS "Enable insert for everyone" ON analytics.pixel_events;
CREATE POLICY "Enable insert for everyone" ON analytics.pixel_events
  FOR INSERT WITH CHECK (true);

DROP POLICY IF EXISTS "Enable read for project owners" ON analytics.pixel_events;
CREATE POLICY "Enable read for project owners" ON analytics.pixel_events
  FOR SELECT USING (
    EXISTS (
      SELECT 1 FROM public.project_user_access pua
      WHERE pua.project_id = analytics.pixel_events.project_id
      AND pua.user_id = auth.uid()
    ) OR (
      -- Agency super-admins (role = 'super_admin') can see everything
      EXISTS (
        SELECT 1 FROM public.users u
        WHERE u.id = auth.uid()
        AND u.role = 'super_admin'
      )
    )
  );

-- Similar SELECT policy for Visitors
DROP POLICY IF EXISTS "Enable read for project owners" ON analytics.visitors;
CREATE POLICY "Enable read for project owners" ON analytics.visitors
  FOR SELECT USING (
    EXISTS (
      SELECT 1 FROM public.project_user_access pua
      WHERE pua.project_id = analytics.visitors.project_id
      AND pua.user_id = auth.uid()
    ) OR (
      EXISTS (
        SELECT 1 FROM public.users u
        WHERE u.id = auth.uid()
        AND u.role = 'super_admin'
      )
    )
  );

COMMENT ON SCHEMA analytics IS 'Proprietary event tracking and user identity data.';
COMMENT ON TABLE analytics.pixel_events IS 'Raw behavior data from the Inner G Pixel.';
COMMENT ON TABLE analytics.visitors IS 'Single-view-of-the-customer profiles per project.';
