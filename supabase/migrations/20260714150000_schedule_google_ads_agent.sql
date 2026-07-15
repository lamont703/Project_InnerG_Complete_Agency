-- Runs Google Ads Agent once daily at 12:00 UTC — 1 hour after Website
-- Traffic Optimization Agent's 11:00 UTC run, per request. Pure API calls
-- (Google Ads, Search Console, Gemini) — no browser needed, so unlike the
-- local-only Business Discovery / Entity Auditor agents, this one is safe
-- to run from the hosted route on a schedule.
CREATE EXTENSION IF NOT EXISTS pg_cron;
CREATE EXTENSION IF NOT EXISTS pg_net;

DO $$
BEGIN
    PERFORM cron.unschedule('google-ads-agent-daily-scan');
EXCEPTION
    WHEN OTHERS THEN
        NULL;
END $$;

SELECT cron.schedule(
    'google-ads-agent-daily-scan',
    '0 12 * * *',
    $$
    SELECT
      net.http_post(
        url := 'https://agency.innergcomplete.com/api/agents/google-ads/run',
        headers := '{"Content-Type": "application/json"}'::jsonb,
        body := '{}'::jsonb,
        timeout_milliseconds := 180000
      )
    $$
);
