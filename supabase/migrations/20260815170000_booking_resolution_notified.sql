-- The customer has been told how their request ended.
--
-- WHY A SEPARATE COLUMN FROM notified_customer_at. That one records the "we've
-- passed this on" email, sent within seconds of the request. This one records
-- the second, much harder email: nobody is coming, or the business said no.
-- They are different messages with different failure modes, and collapsing them
-- into one timestamp means the escalation job cannot tell a customer who was
-- thanked from one who was actually answered.
--
-- IDEMPOTENCE LIVES HERE. The job stamps this after every attempt, successful
-- or not, so a send that failed is never retried into a duplicate. Same rule as
-- shortlist-followup's followup_sent_at, for the same reason.

ALTER TABLE public.booking_requests
  ADD COLUMN IF NOT EXISTS resolution_notified_at TIMESTAMPTZ;

-- The escalation job's second and third predicates: requests whose customer is
-- still waiting to hear something final. Partial, so it holds only the open
-- work — a table of settled bookings never enters this index.
CREATE INDEX IF NOT EXISTS booking_requests_resolution_due_idx
  ON public.booking_requests (requested_date)
  WHERE resolution_notified_at IS NULL AND status IN ('notified', 'declined');

COMMENT ON COLUMN public.booking_requests.resolution_notified_at IS
  'Customer told the final outcome (declined / no_response). Distinct from notified_customer_at, which is the initial receipt. Stamped on attempt, not on success.';
