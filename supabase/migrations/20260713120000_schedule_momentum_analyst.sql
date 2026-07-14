-- Runs Momentum Analyst once daily. Fixed at 04:59 UTC (11:59 PM EST) — note
-- pg_cron has no timezone awareness, so during EDT (roughly Mar-Nov) this
-- actually fires at 12:59 AM Eastern instead, a known ~1hr drift twice a year.
-- Hits the already-deployed Next.js route directly (same pattern as
-- 132_schedule_crypto_scans.sql, just targeting the app instead of an Edge
-- Function) so the detection logic isn't duplicated anywhere else.
CREATE EXTENSION IF NOT EXISTS pg_cron;
CREATE EXTENSION IF NOT EXISTS pg_net;

DO $$
BEGIN
    PERFORM cron.unschedule('momentum-analyst-daily-scan');
EXCEPTION
    WHEN OTHERS THEN
        NULL;
END $$;

SELECT cron.schedule(
    'momentum-analyst-daily-scan',
    '59 4 * * *',
    $$
    SELECT
      net.http_post(
        url := 'https://agency.innergcomplete.com/api/agents/momentum-analyst/run',
        headers := '{"Content-Type": "application/json"}'::jsonb,
        body := '{}'::jsonb,
        timeout_milliseconds := 60000
      )
    $$
);
