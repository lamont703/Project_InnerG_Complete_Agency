-- Migration 054: Normalize LinkedIn IDs and Deduplicate Pages (Fixed version 2)
-- This migration ensures all LinkedIn organizations follow the URN format and merges duplicates safely.

BEGIN;

-- 1. Repoint posts and delete numeric duplicates IF a URN record already exists
DO $$
DECLARE
    rec RECORD;
    found_urn_id UUID;
BEGIN
    FOR rec IN (
        SELECT id, project_id, linkedin_page_id 
        FROM public.linkedin_pages 
        WHERE linkedin_page_id NOT LIKE 'urn:li:%'
    ) LOOP
        -- Check if a normalized version exists for the same project
        SELECT id INTO found_urn_id 
        FROM public.linkedin_pages 
        WHERE project_id = rec.project_id 
        AND linkedin_page_id = 'urn:li:organization:' || rec.linkedin_page_id;

        IF found_urn_id IS NOT NULL THEN
            -- DUPLICATE FOUND: Move posts to the URN version and kill the numeric one
            UPDATE public.linkedin_posts SET page_id = found_urn_id WHERE page_id = rec.id;
            DELETE FROM public.linkedin_pages WHERE id = rec.id;
        ELSE
            -- NO URN VERSION: Just normalize the existing record
            -- This might still fail if another project already has this URN, but we want unique per project anyway
            BEGIN
                UPDATE public.linkedin_pages 
                SET linkedin_page_id = 'urn:li:organization:' || rec.linkedin_page_id 
                WHERE id = rec.id;
            EXCEPTION WHEN unique_violation THEN
                -- If somehow another record with the same project and the now-normalized ID exists, merge it
                SELECT id INTO found_urn_id 
                FROM public.linkedin_pages 
                WHERE project_id = rec.project_id 
                AND linkedin_page_id = 'urn:li:organization:' || rec.linkedin_page_id;
                
                IF found_urn_id IS NOT NULL THEN
                    UPDATE public.linkedin_posts SET page_id = found_urn_id WHERE page_id = rec.id;
                    DELETE FROM public.linkedin_pages WHERE id = rec.id;
                END IF;
            END;
        END IF;
    END LOOP;
END $$;

-- 2. Normalize page_id in client_db_connections sync_config
-- Note: Using connector_type_id (singular) correctly.
UPDATE public.client_db_connections
SET sync_config = jsonb_set(
    sync_config, 
    '{page_id}', 
    to_jsonb('urn:li:organization:' || (sync_config->>'page_id'))
)
WHERE (connector_type_id IN (SELECT id FROM connector_types WHERE provider = 'linkedin') OR db_type = 'linkedin')
AND sync_config->>'page_id' IS NOT NULL
AND sync_config->>'page_id' NOT LIKE 'urn:li:%';

COMMIT;
