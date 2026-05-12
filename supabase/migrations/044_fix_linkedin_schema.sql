-- Migration 044: Fix LinkedIn Connector Schema
-- Ensuring the frontend can render the necessary fields for LinkedIn.

UPDATE public.connector_types
SET config_schema = '{
    "type": "object",
    "properties": {
        "access_token": {
            "type": "string",
            "label": "Access Token",
            "placeholder": "Linkedin OAuth Access Token",
            "sensitive": true
        },
        "page_id": {
            "type": "string",
            "label": "LinkedIn Page ID (Optional)",
            "placeholder": "urn:li:organization:123"
        }
    },
    "required": ["access_token"]
}'::jsonb
WHERE provider = 'linkedin';
