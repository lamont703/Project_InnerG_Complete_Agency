-- Migration 125: Seed Alpaca Broker Connector Type
-- Adds Alpaca as a supported financial bridge for automated trading and intelligence.

-- 1. Add alpaca to External DB Type Enum if not exists
DO $$ 
BEGIN
    ALTER TYPE public.external_db_type ADD VALUE 'alpaca';
EXCEPTION
    WHEN duplicate_object THEN NULL;
END $$;

-- 2. Seed Alpaca Connector Type
INSERT INTO public.connector_types (name, provider, description, config_schema)
VALUES (
    'Alpaca Brokerage',
    'alpaca',
    'Connect your Alpaca trading account for automated execution and market intelligence.',
    '{
        "required": ["access_token"],
        "properties": {
            "access_token": { "type": "string", "label": "Alpaca Access Token", "placeholder": "oauth_...", "sensitive": true },
            "is_paper": { "type": "boolean", "label": "Paper Trading (Sandbox)", "default": true },
            "sync_positions": { "type": "boolean", "label": "Sync Live Portfolio", "default": true }
        }
    }'::jsonb
)
ON CONFLICT (provider) DO UPDATE 
SET config_schema = EXCLUDED.config_schema,
    description = EXCLUDED.description,
    is_active = true;
