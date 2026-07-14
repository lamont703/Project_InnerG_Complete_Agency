-- Runs Sentinel every 25 minutes. Real GSC URL Inspection calls take ~6.5s
-- each (confirmed by testing), so each run only covers a small batch
-- (BATCH_SIZE=15 in app/api/agents/sentinel/run/route.ts) using a persisted
-- cursor (sentinel_sweep_state) — at this cadence the full ~6,030-URL
-- sitemap gets swept roughly once a week (~58 runs/day x 15 URLs ≈ 870/day).
CREATE EXTENSION IF NOT EXISTS pg_cron;
CREATE EXTENSION IF NOT EXISTS pg_net;

DO $$
BEGIN
    PERFORM cron.unschedule('sentinel-sweep-tick');
EXCEPTION
    WHEN OTHERS THEN
        NULL;
END $$;

SELECT cron.schedule(
    'sentinel-sweep-tick',
    '*/25 * * * *',
    $$
    SELECT
      net.http_post(
        url := 'https://agency.innergcomplete.com/api/agents/sentinel/run',
        headers := '{"Content-Type": "application/json"}'::jsonb,
        body := '{}'::jsonb,
        timeout_milliseconds := 180000
      )
    $$
);
