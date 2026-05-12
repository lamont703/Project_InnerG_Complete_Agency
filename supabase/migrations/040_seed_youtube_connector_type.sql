-- Migration 040: Seed YouTube Connector Type
-- Adds YouTube as a supported external connector for automated sync.

-- 1. Add youtube to External DB Type Enum if not exists
DO $$ 
BEGIN
    ALTER TYPE public.external_db_type ADD VALUE 'youtube';
EXCEPTION
    WHEN duplicate_object THEN NULL;
END $$;

-- 2. Seed YouTube Connector Type
INSERT INTO public.connector_types (name, provider, description, config_schema)
VALUES (
    'YouTube Analytics',
    'youtube',
    'Sync channel subscribers, views, and video performance metrics.',
    '{
        "required": ["access_token"],
        "properties": {
            "access_token": { "type": "string", "label": "Google Access Token", "placeholder": "ya29...", "sensitive": true },
            "refresh_token": { "type": "string", "label": "Google Refresh Token", "placeholder": "1//...", "sensitive": true },
            "sync_videos": { "type": "boolean", "label": "Sync Recent Videos", "default": true }
        }
    }'::jsonb
)
ON CONFLICT (provider) DO UPDATE 
SET config_schema = EXCLUDED.config_schema,
    description = EXCLUDED.description;
