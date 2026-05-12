-- Migration 132: Schedule Autonomous Crypto Intelligence Scans
-- Sets up a recurring heartbeat using pg_cron and pg_net to trigger the SMC scanner every 15 minutes.

-- 1. Ensure Cron and Net extensions are available
CREATE EXTENSION IF NOT EXISTS pg_cron;
CREATE EXTENSION IF NOT EXISTS pg_net;

-- 2. Clear any existing scheduled job safely
DO $$
BEGIN
    PERFORM cron.unschedule('autonomous-crypto-scan');
EXCEPTION
    WHEN OTHERS THEN
        -- Job doesn't exist or other error, proceed quietly
        NULL;
END $$;

-- 3. Schedule the 15-minute "Neural Heartbeat"
SELECT cron.schedule(
    'autonomous-crypto-scan',
    '*/15 * * * *',
    $$
    SELECT
      net.http_post(
        url := 'https://senkwhdxgtypcrtoggyf.supabase.co/functions/v1/crypto-intelligence-engine',
        headers := '{"Content-Type": "application/json"}'::jsonb,
        body := '{}'::jsonb,
        timeout_milliseconds := 60000
      )
    $$
);

COMMENT ON COLUMN public.crypto_signals.status IS 'STAGED = AI found it, waiting for human. ACTIVE = Human approved and broadcasted.';
