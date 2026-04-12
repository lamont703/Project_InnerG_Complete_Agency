ALTER TABLE public.growth_audit_leads
ADD COLUMN IF NOT EXISTS project_type text,
ADD COLUMN IF NOT EXISTS budget_range text,
ADD COLUMN IF NOT EXISTS project_stage text,
ADD COLUMN IF NOT EXISTS industry text,
ADD COLUMN IF NOT EXISTS project_url text;
