-- Migration 042: LinkedIn Integration Foundation
-- Adds LinkedIn as a supported platform and connector.

-- 1. Add 'linkedin' to relevant enums
DO $$ 
BEGIN
    ALTER TYPE public.social_platform ADD VALUE 'linkedin';
EXCEPTION
    WHEN duplicate_object THEN NULL;
END $$;

DO $$ 
BEGIN
    ALTER TYPE public.integration_source ADD VALUE 'linkedin';
EXCEPTION
    WHEN duplicate_object THEN NULL;
END $$;

DO $$ 
BEGIN
    ALTER TYPE public.external_db_type ADD VALUE 'linkedin';
EXCEPTION
    WHEN duplicate_object THEN NULL;
END $$;

-- 2. Seed LinkedIn Connector Type
INSERT INTO public.connector_types (name, provider, description, config_schema)
VALUES (
    'LinkedIn Business',
    'linkedin',
    'Sync LinkedIn Page metrics, post engagement, and follower growth.',
    '{
        "required": ["access_token"],
        "properties": {
            "access_token": { "type": "string", "label": "LinkedIn Access Token", "placeholder": "AQ...", "sensitive": true },
            "refresh_token": { "type": "string", "label": "LinkedIn Refresh Token", "sensitive": true },
            "page_id": { "type": "string", "label": "LinkedIn Page ID", "placeholder": "urn:li:organization:123456" }
        }
    }'::jsonb
)
ON CONFLICT (name) DO UPDATE 
SET config_schema = EXCLUDED.config_schema,
    description = EXCLUDED.description,
    provider = EXCLUDED.provider;

-- 3. Update project agent config to support LinkedIn
ALTER TABLE public.project_agent_config 
ADD COLUMN IF NOT EXISTS linkedin_data_enabled BOOLEAN NOT NULL DEFAULT TRUE;

COMMENT ON COLUMN public.project_agent_config.linkedin_data_enabled IS 
'Whether the AI agent should include LinkedIn page and post data in its RAG context.';

UPDATE public.project_agent_config SET linkedin_data_enabled = TRUE WHERE linkedin_data_enabled IS NULL;
