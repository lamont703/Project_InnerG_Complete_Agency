-- Update Supabase Connector Schema to include tables_to_sync
-- This allows the admin UI to dynamically render the table discovery component

UPDATE public.connector_types
SET config_schema = jsonb_set(
    config_schema,
    '{properties,tables_to_sync}',
    '{
        "type": "array",
        "label": "Tables to Intelligence Sync",
        "description": "Select the tables you want to sync from the external database.",
        "items": { "type": "string" }
    }'::jsonb
)
WHERE provider = 'supabase';
