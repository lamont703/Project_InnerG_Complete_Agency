-- ============================================================
-- Migration 003: Create Agency Domain Tables
-- Inner G Complete Agency — Client Intelligence Portal
-- ============================================================
-- Tables: clients, projects, developer_client_access, project_user_access
-- ============================================================

-- CLIENTS
CREATE TABLE public.clients (
  id                      UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name                    TEXT NOT NULL,
  industry                client_industry NOT NULL DEFAULT 'other',
  status                  client_status NOT NULL DEFAULT 'onboarding',
  primary_contact_name    TEXT,
  primary_contact_email   TEXT,
  ghl_location_id         TEXT,           -- NULL if client doesn't use GHL
  notes                   TEXT,
  created_at              TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at              TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE TRIGGER clients_updated_at
  BEFORE UPDATE ON public.clients
  FOR EACH ROW EXECUTE FUNCTION update_updated_at();

-- PROJECTS
CREATE TABLE public.projects (
  id                      UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  client_id               UUID NOT NULL REFERENCES public.clients(id) ON DELETE CASCADE,
  name                    TEXT NOT NULL,
  slug                    TEXT NOT NULL UNIQUE, -- URL-safe, e.g. "kanes-bookstore"
  type                    TEXT NOT NULL DEFAULT 'general',
  status                  project_status NOT NULL DEFAULT 'building',
  active_campaign_name    TEXT,
  created_at              TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at              TIMESTAMPTZ NOT NULL DEFAULT now(),
  CONSTRAINT projects_slug_format CHECK (slug ~ '^[a-z0-9][a-z0-9-]*[a-z0-9]$')
);

CREATE TRIGGER projects_updated_at
  BEFORE UPDATE ON public.projects
  FOR EACH ROW EXECUTE FUNCTION update_updated_at();

CREATE INDEX idx_projects_client_id ON public.projects(client_id);
CREATE INDEX idx_projects_slug ON public.projects(slug);

-- DEVELOPER → CLIENT ACCESS (many-to-many portfolio)
-- Developers can manage multiple clients. Only super_admin assigns this.
CREATE TABLE public.developer_client_access (
  id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  developer_id    UUID NOT NULL REFERENCES public.users(id) ON DELETE CASCADE,
  client_id       UUID NOT NULL REFERENCES public.clients(id) ON DELETE CASCADE,
  assigned_at     TIMESTAMPTZ NOT NULL DEFAULT now(),
  assigned_by     UUID NOT NULL REFERENCES public.users(id),
  UNIQUE (developer_id, client_id)
);

CREATE INDEX idx_dev_client_access_developer ON public.developer_client_access(developer_id);
CREATE INDEX idx_dev_client_access_client ON public.developer_client_access(client_id);

-- PROJECT → USER ACCESS (client users assigned to specific projects)
CREATE TABLE public.project_user_access (
  id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  project_id      UUID NOT NULL REFERENCES public.projects(id) ON DELETE CASCADE,
  user_id         UUID NOT NULL REFERENCES public.users(id) ON DELETE CASCADE,
  granted_at      TIMESTAMPTZ NOT NULL DEFAULT now(),
  granted_by      UUID NOT NULL REFERENCES public.users(id),
  UNIQUE (project_id, user_id)
);

CREATE INDEX idx_project_user_access_project ON public.project_user_access(project_id);
CREATE INDEX idx_project_user_access_user ON public.project_user_access(user_id);

COMMENT ON TABLE public.clients IS 'Master client roster for Inner G Complete Agency.';
COMMENT ON TABLE public.projects IS 'Active engagement portals — each has a unique slug used in URLs.';
COMMENT ON COLUMN public.projects.slug IS 'URL-safe identifier, e.g. "kanes-bookstore". Used in /dashboard/[slug] routes.';
COMMENT ON TABLE public.developer_client_access IS 'Developer portfolio: which clients each Inner G developer manages.';
COMMENT ON TABLE public.project_user_access IS 'Guest list: which client users can access which project portals.';
