-- ============================================================
-- Migration 101: Seed X (Twitter) Connector Type
-- Inner G Complete Agency — Proprietary Tracking System
-- ============================================================

INSERT INTO public.connector_types (name, provider, description, config_schema)
VALUES (
    'X (Twitter) Analytics',
    'twitter',
    'Sync X (Twitter) profile metrics, tweet performance, and audience reach.',
    '{
        "required": ["access_token"],
        "properties": {
            "access_token": { "type": "string", "label": "X Access Token", "sensitive": true },
            "refresh_token": { "type": "string", "label": "X Refresh Token", "sensitive": true },
            "twitter_user_id": { "type": "string", "label": "X User ID" }
        }
    }'::jsonb
)
ON CONFLICT (name) DO UPDATE 
SET config_schema = EXCLUDED.config_schema,
    description = EXCLUDED.description,
    provider = EXCLUDED.provider;

ALTER TABLE public.project_agent_config 
ADD COLUMN IF NOT EXISTS twitter_data_enabled BOOLEAN NOT NULL DEFAULT FALSE;

COMMENT ON COLUMN public.project_agent_config.twitter_data_enabled IS 'Whether the AI agent should include X (Twitter) account and tweet data in its context.';
