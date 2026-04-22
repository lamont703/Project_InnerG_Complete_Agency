-- ============================================================
-- Migration 139: Set Default Feature States to OFF
-- Inner G Complete Agency — Multi-Tenant Privacy & Sovereignty
-- ============================================================

-- RECALIBRATE MASTER SWITCHES: Finalize secure-by-default architecture
ALTER TABLE public.projects 
ALTER COLUMN funnel_enabled SET DEFAULT false,
ALTER COLUMN knowledge_enabled SET DEFAULT false,
ALTER COLUMN pixel_enabled SET DEFAULT false,
ALTER COLUMN connectors_enabled SET DEFAULT false,
ALTER COLUMN agent_enabled SET DEFAULT false,
ALTER COLUMN community_enabled SET DEFAULT false,
ALTER COLUMN social_enabled SET DEFAULT false,
ALTER COLUMN crypto_enabled SET DEFAULT false,
ALTER COLUMN cognitive_enabled SET DEFAULT false,
ALTER COLUMN metrics_enabled SET DEFAULT false;

-- COMMENT: Governance memo for architectural sovereignty
COMMENT ON TABLE public.projects IS 'Master project registry with high-fidelity feature masking. All new project architectures are initialized in a redacted state (FALSE) by default to ensure administrative sovereignty.';
