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

    BEGIN
        PERFORM cron.unschedule('process-scheduled-posts-minute');
    EXCEPTION
        WHEN OTHERS THEN NULL;
    END;
    
    PERFORM cron.schedule(
        'process-scheduled-posts-minute',
        '* * * * *', -- Every minute
        $cron$
        SELECT net.http_post(
            url => 'https://senkwhdxgtypcrtoggyf.supabase.co/functions/v1/process-scheduled-posts',
            headers => jsonb_build_object(
                'Authorization', 'Bearer eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InNlbmt3aGR4Z3R5cGNydG9nZ3lmIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NzI0MDE1MjQsImV4cCI6MjA4Nzk3NzUyNH0._ZQTmLzfR2sWdREeZk1hyGgdREMDUv345F0t2q3p16g',
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
