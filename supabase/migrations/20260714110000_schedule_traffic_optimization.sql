-- Runs Website Traffic Optimization Agent once daily at 11:00 UTC (6 AM EST
-- — will drift to 7 AM Eastern during EDT, same pg_cron timezone caveat as
-- the other scheduled agents). Staggered from the Behavior Agent's overnight
-- run (04:59 UTC) on purpose so the two daily digests don't land at once.
-- Search Analytics has no per-day quota like URL Inspection does, so one
-- run covers the whole site's query/page data in a handful of calls.
CREATE EXTENSION IF NOT EXISTS pg_cron;
CREATE EXTENSION IF NOT EXISTS pg_net;

DO $$
BEGIN
    PERFORM cron.unschedule('traffic-optimization-daily-scan');
EXCEPTION
    WHEN OTHERS THEN
        NULL;
END $$;

SELECT cron.schedule(
    'traffic-optimization-daily-scan',
    '0 11 * * *',
    $$
    SELECT
      net.http_post(
        url := 'https://agency.innergcomplete.com/api/agents/traffic-optimization/run',
        headers := '{"Content-Type": "application/json"}'::jsonb,
        body := '{}'::jsonb,
        timeout_milliseconds := 120000
      )
    $$
);
