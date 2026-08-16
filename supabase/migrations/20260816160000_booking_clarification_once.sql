-- One clarification per request, ever.
--
-- The "we couldn't tell if that was a yes or a no" prompt fires on any inbound
-- message we can't parse. Without this column it fires on EVERY one — a
-- business that sends three messages gets three identical prompts, each naming
-- the same customer and appointment. That reads as a malfunction, and it is the
-- fastest way to get the number this whole feature depends on blocked.
ALTER TABLE public.booking_requests
  ADD COLUMN IF NOT EXISTS clarification_sent_at TIMESTAMPTZ;

COMMENT ON COLUMN public.booking_requests.clarification_sent_at IS
  'The "was that a yes or a no?" prompt is sent at most once per request. See app/api/webhooks/ghl-inbound-sms.';
