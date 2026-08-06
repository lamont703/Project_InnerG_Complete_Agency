-- ============================================================
-- Send tracking for school_pass_rate_alerts
-- ============================================================
-- The table captured signups but recorded nothing about whether the promised
-- email had gone out. That is fine right up until the first real send, which
-- will fail partway through — a bad address, a GHL timeout, a school whose
-- figures did not land — and the natural response is to run it again. Without
-- this column, running it again emails everyone who already received it.
--
-- Keyed by PERIOD rather than a boolean because the promise repeats. Someone
-- who got the 2026–27 results is still owed 2027–28, so "already sent" is
-- only ever a question about a particular release.
-- ============================================================

ALTER TABLE public.school_pass_rate_alerts
  ADD COLUMN IF NOT EXISTS last_sent_period TEXT,
  ADD COLUMN IF NOT EXISTS last_sent_at     TIMESTAMPTZ;

-- The send groups by school and skips anyone already done for the period, so
-- that is the shape it reads by.
CREATE INDEX IF NOT EXISTS school_pass_rate_alerts_pending_idx
  ON public.school_pass_rate_alerts (school_id, last_sent_period);

COMMENT ON COLUMN public.school_pass_rate_alerts.last_sent_period IS
  'Label of the most recent results release emailed to this row (e.g. "2026-27"). NULL means never sent. Makes a re-run of /api/internal/pass-rate-send resumable rather than duplicative.';
