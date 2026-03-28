-- Migration 116: Enable Hourly Global Connector Sync via pg_cron
-- Inner G Complete Agency

DO $$
BEGIN
    -- Ensure pg_cron and pg_net extensions exist
    CREATE EXTENSION IF NOT EXISTS pg_cron WITH SCHEMA public;
    CREATE EXTENSION IF NOT EXISTS pg_net WITH SCHEMA public;

    BEGIN
        PERFORM cron.unschedule('global-connector-sync-hourly');
    EXCEPTION
        WHEN OTHERS THEN NULL;
    END;
    
    PERFORM cron.schedule(
        'global-connector-sync-hourly',
        '0 * * * *', -- At minute 0 past every hour
        $cron$
        SELECT net.http_post(
            url => 'https://senkwhdxgtypcrtoggyf.supabase.co/functions/v1/connector-sync',
            headers => jsonb_build_object(
                'Authorization', 'Bearer eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InNlbmt3aGR4Z3R5cGNydG9nZ3lmIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc3MjQwMTUyNCwiZXhwIjoyMDg3OTc3NTI0fQ.wSaW_T3CjCfhQlAGXMJlcW1CblFyVs3pJWb-zUezSBo',
                'Content-Type', 'application/json'
            ),
            body => '{}'::jsonb
        );
        $cron$
    );
EXCEPTION
    WHEN OTHERS THEN
        RAISE NOTICE 'Skipping pg_cron schedule creation. Ensure pg_cron is enabled.';
END $$;
