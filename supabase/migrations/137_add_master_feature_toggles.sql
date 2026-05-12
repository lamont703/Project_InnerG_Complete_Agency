-- ============================================================
-- Migration 137: Add Master Feature Toggles to Projects
-- Inner G Complete Agency — Institutional Governance Layer
-- ============================================================

-- MASTER SWITCHES: Programmatically enable/disable core architecture modules
ALTER TABLE public.projects 
ADD COLUMN knowledge_enabled BOOLEAN NOT NULL DEFAULT true,
ADD COLUMN pixel_enabled BOOLEAN NOT NULL DEFAULT true,
ADD COLUMN connectors_enabled BOOLEAN NOT NULL DEFAULT true;

-- COMMENTS: Governance metadata for feature masking
COMMENT ON COLUMN public.projects.knowledge_enabled IS 'Master visibility toggle for the Knowledge Base in the client portal.';
COMMENT ON COLUMN public.projects.pixel_enabled IS 'Master visibility toggle for the Website Connection (Pixel) in the client portal.';
COMMENT ON COLUMN public.projects.connectors_enabled IS 'Master visibility toggle for Data Connectors in the client portal.';
