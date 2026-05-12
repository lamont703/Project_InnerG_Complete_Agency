-- Migration 126: Seed Alpaca API Key Connector Type
-- Adds an alternative connection bridge for Alpaca using direct API Key ID and Secret.
-- This serves as a reliable fallback for agentic trading when OAuth flows are blocked.

-- 1. Seed Alpaca API Keys Connector Type
INSERT INTO public.connector_types (name, provider, description, config_schema)
VALUES (
    'Alpaca (Direct API Keys)',
    'alpaca_keys',
    'Connect via API Key ID and Secret. Stable fallback for automated trading without OAuth.',
    '{
        "required": ["api_key_id", "api_secret_key"],
        "properties": {
            "api_key_id": { "type": "string", "label": "API Key ID", "placeholder": "AK...", "sensitive": false },
            "api_secret_key": { "type": "string", "label": "API Secret Key", "placeholder": "...", "sensitive": true },
            "is_paper": { "type": "boolean", "label": "Paper Trading (Sandbox)", "default": true },
            "sync_positions": { "type": "boolean", "label": "Sync Live Portfolio", "default": true }
        }
    }'::jsonb
)
ON CONFLICT (name) DO UPDATE 
SET config_schema = EXCLUDED.config_schema,
    description = EXCLUDED.description;
