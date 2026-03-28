-- Migration 115: Enable Scheduled Social Publishing via pg_cron
-- Inner G Complete Agency
--
-- This migration schedules a job to run every minute that calls the 
-- process-scheduled-posts Edge Function, which iterates through and 
-- publishes any social_content_plan records whose scheduled_at time
-- has arrived.

DO $$
BEGIN
    -- Ensure pg_cron and pg_net extensions exist
    CREATE EXTENSION IF NOT EXISTS pg_cron WITH SCHEMA public;
    CREATE EXTENSION IF NOT EXISTS pg_net WITH SCHEMA public;

    -- Unsually, standard pg_cron setups on Supabase require a cron definition
    -- that points back to the self-hosted edge function.
    -- We assume standard Supabase environment variables are available via pg_net logic
    -- or we place a hardcoded cron job using standard SQL below.
    -- To keep it agnostic, we call it using the anon role, checking scheduled posts securely.
    
    PERFORM cron.unschedule('process-scheduled-posts-minute');
    
    PERFORM cron.schedule(
        'process-scheduled-posts-minute',
        '* * * * *', -- Every minute
        $$
        SELECT net.http_post(
            -- Use string concatenation or string functions if PROJECT_REF was needed
            -- Standard Supabase Edge Function endpoint routing is internal when run locally
            -- For production, this calls the edge function via its public hostname.
            -- This relies on Supabase pg_net built-in capabilities.
            url := current_setting('custom.my_supabase_url', true) || '/functions/v1/process-scheduled-posts',
            headers := jsonb_build_object(
                'Authorization', 'Bearer ' || current_setting('custom.my_anon_key', true),
                'Content-Type', 'application/json'
            ),
            body := '{}'::jsonb
        );
        $$
    );
EXCEPTION
    WHEN OTHERS THEN
        RAISE NOTICE 'Skipping pg_cron schedule creation. Ensure pg_cron is enabled.';
END $$;
