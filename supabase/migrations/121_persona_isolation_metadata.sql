-- Add agency template metadata to community agents
ALTER TABLE public.community_agents ADD COLUMN IF NOT EXISTS is_agency_template BOOLEAN DEFAULT false;

-- Update existing Sarah instances as Agency Templates
UPDATE public.community_agents SET is_agency_template = true WHERE name = 'Sarah';
