-- Off switch for the weekly Google Business Profile monitoring email.
--
-- The job emails an owner when their profile changes. That's useful and it's
-- also recurring mail they didn't explicitly ask for when they connected, so it
-- needs a way to stop that doesn't involve disconnecting Google entirely.
--
-- Defaults to true: connecting a profile in order to be monitored is a
-- reasonable read of intent, and the email itself carries the opt-out.

ALTER TABLE public.gbp_connections
    ADD COLUMN IF NOT EXISTS monitoring_emails_enabled boolean NOT NULL DEFAULT true;

COMMENT ON COLUMN public.gbp_connections.monitoring_emails_enabled IS
    'When false, the weekly monitor (app/api/cron/gbp-monitor) still records a snapshot but sends no email.';
