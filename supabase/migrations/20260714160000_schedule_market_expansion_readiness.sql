-- Runs Market Expansion Readiness Agent once daily at 13:00 UTC — 1 hour
-- after Google Ads Agent's 12:00 UTC run, continuing the same daily
-- stagger as the other 3 scheduled agents. Pure Supabase queries + Gemini
-- (no browser), so — unlike the local-only Business Discovery / Entity
-- Auditor agents — this one is safe to run from the hosted route on a
-- schedule. Closes Gap B from the autonomous pipeline: this step was
-- previously "Run Now"-only.
CREATE EXTENSION IF NOT EXISTS pg_cron;
CREATE EXTENSION IF NOT EXISTS pg_net;

DO $$
BEGIN
    PERFORM cron.unschedule('market-expansion-readiness-daily-scan');
EXCEPTION
    WHEN OTHERS THEN
        NULL;
END $$;

SELECT cron.schedule(
    'market-expansion-readiness-daily-scan',
    '0 13 * * *',
    $$
    SELECT
      net.http_post(
        url := 'https://agency.innergcomplete.com/api/agents/market-expansion-readiness/run',
        headers := '{"Content-Type": "application/json"}'::jsonb,
        body := '{}'::jsonb,
        timeout_milliseconds := 120000
      )
    $$
);
