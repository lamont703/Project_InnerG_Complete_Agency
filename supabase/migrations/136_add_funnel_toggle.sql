-- ============================================================
-- Migration 136: Add Master Funnel Toggle to Projects
-- Inner G Complete Agency — Multi-Tenant Policy Governance
-- ============================================================

-- MASTER SWITCH: Disables/Enables the Funnel View globally for a portal
ALTER TABLE public.projects 
ADD COLUMN funnel_enabled BOOLEAN NOT NULL DEFAULT true;

-- COMMENT: Master feature flag for the Omni-Channel Funnel Blueprint.
COMMENT ON COLUMN public.projects.funnel_enabled IS 'Master visibility toggle for the Funnel Blueprint in the client portal.';
