-- School tour requests — the Request A School Tour CTA on /schools/[slug].
--
-- IT REUSES booking_requests RATHER THAN ADDING A TABLE. A tour request has
-- the same shape as an appointment request (who asked, for what, when, and the
-- notification trail that follows) and needs the same things downstream: the
-- account dashboard, the claim hook's pending count, the escalation cron and
-- Listing Insights all read this table. A parallel table would have to be
-- taught to every one of them, and would drift.
--
-- WHAT IS GENUINELY DIFFERENT IS THE NOTIFICATION CHANNEL, and it is not a
-- preference — it is forced by the data. Across 1,185 schools we hold FOUR
-- email addresses: 4 of 244 barber schools (1.6%), and the cosmetology school
-- table has no email column at all. Phone, by contrast, is on 98.1% of them
-- (237/244 and 925/941). So there is no email path to build, and SMS to a
-- school's main line is the wrong instrument for a campus tour.
--
-- The channel is therefore A HUMAN PHONE CALL, recorded here as a queue rather
-- than an automated send. That is a deliberate trade: it costs staff time per
-- request, and it buys a conversation with a school we otherwise have no
-- relationship with — which is the point, since the call is also the moment to
-- ask about claiming the listing and about advertising.
--
-- `notify_channel` EXISTS SO THE ESCALATION CRON CANNOT MISFIRE. That cron
-- looks for notified-but-unanswered rows and re-sends. A tour request that is
-- waiting on a person to pick up a phone must not be swept into an automated
-- retry, so the channel is explicit on the row instead of inferred from
-- entity_type.

-- 1. Schools become a fifth entity type.
ALTER TABLE public.booking_requests
  DROP CONSTRAINT IF EXISTS booking_requests_entity_type_check;

ALTER TABLE public.booking_requests
  ADD CONSTRAINT booking_requests_entity_type_check
  CHECK (entity_type IN ('shop', 'salon', 'barber', 'cosmetologist', 'school'));

-- 2. What kind of ask this is. Defaulted so every existing row is correct
--    without a backfill.
ALTER TABLE public.booking_requests
  ADD COLUMN IF NOT EXISTS request_type TEXT NOT NULL DEFAULT 'appointment'
  CHECK (request_type IN ('appointment', 'tour'));

-- 3. How the business gets told. 'sms' is the existing behaviour; 'phone_call'
--    means a human owes this row a call and no automation will send anything.
ALTER TABLE public.booking_requests
  ADD COLUMN IF NOT EXISTS notify_channel TEXT NOT NULL DEFAULT 'sms'
  CHECK (notify_channel IN ('sms', 'phone_call'));

-- 4. Who made the call, and what came of it. The call is a sales touch as well
--    as a notification, so what was learned has to land somewhere or it is
--    lost with the caller's memory.
ALTER TABLE public.booking_requests
  ADD COLUMN IF NOT EXISTS called_by TEXT,
  ADD COLUMN IF NOT EXISTS call_notes TEXT;

-- 5. The call queue's exact predicate: tour requests nobody has phoned yet,
--    oldest first, because a tour date is approaching.
CREATE INDEX IF NOT EXISTS booking_requests_call_queue_idx
  ON public.booking_requests (requested_date, created_at)
  WHERE notify_channel = 'phone_call' AND notified_business_at IS NULL;

-- 6. Keep the escalation cron off phone-call rows. Replaces the index from
--    20260812190000 with one that excludes them, so an unanswered tour request
--    can never be auto-escalated to a channel we do not have.
DROP INDEX IF EXISTS booking_requests_escalation_due_idx;
CREATE INDEX IF NOT EXISTS booking_requests_escalation_due_idx
  ON public.booking_requests (notified_business_at)
  WHERE status = 'notified' AND escalated_at IS NULL AND notify_channel = 'sms';

COMMENT ON COLUMN public.booking_requests.request_type IS
  'appointment = a service booking on an entity page; tour = a campus visit request on /schools/[slug].';
COMMENT ON COLUMN public.booking_requests.notify_channel IS
  'sms = automated GHL text to entity_phone; phone_call = a human must call. Schools are always phone_call — we hold 4 email addresses across 1,185 schools.';
