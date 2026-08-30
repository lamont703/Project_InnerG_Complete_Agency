-- A business that answers the phone and presses a key.
--
-- status_source records HOW a request moved, and the existing values assume
-- every business answer arrives as a text. The voice agent is the channel
-- built precisely for the businesses that cannot receive one — a landline —
-- so 'sms_reply' would be a lie about the only shops this path exists for.
--
-- It matters beyond bookkeeping: "did the voice agent actually get answers, or
-- only leave voicemails" is the question that decides whether the calling is
-- worth its cost, and it is unanswerable if a keypad press is recorded as a
-- text reply.
ALTER TABLE public.booking_requests
  DROP CONSTRAINT IF EXISTS booking_requests_status_source_check;

ALTER TABLE public.booking_requests
  ADD CONSTRAINT booking_requests_status_source_check
  CHECK (status_source IS NULL OR status_source IN (
    'api',          -- the original request write
    'sms_reply',    -- the business texted back
    'voice_reply',  -- the business pressed a key on the call
    'dashboard',    -- an owner clicked it
    'cron',         -- the escalation job gave up
    'admin'         -- a human, by hand
  ));
