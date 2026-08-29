-- A booking request where we could not tell the business at all.
--
-- WHAT WENT WRONG WITHOUT IT. The shop notification is an SMS. When GHL
-- refuses the send — "Cannot send message as DND is active for SMS", which in
-- practice means the number is a LANDLINE that cannot receive texts — the row
-- kept status 'new'. Three consequences, and the third is the serious one:
--
--   1. 'new' means "received, business not yet told", which reads as a race we
--      are about to win. It was actually a permanent failure.
--   2. booking-followup selects status in ('notified','declined','booked'), so
--      the row was invisible to the only job that chases anything.
--   3. THE CUSTOMER WAS EMAILED ANYWAY, saying we had passed their request on
--      and the shop would call them. Neither was true. They wait for a call
--      that was never going to come, and the shop looks like it ignored them.
--
-- 'unreachable' is a terminal state that says which of those happened, so a
-- human can pick up the phone and the customer can be told the truth.
ALTER TABLE public.booking_requests
  DROP CONSTRAINT IF EXISTS booking_requests_status_check;

ALTER TABLE public.booking_requests
  ADD CONSTRAINT booking_requests_status_check
  CHECK (status IN (
    'new',          -- received, business not yet told
    'notified',     -- SMS delivered to the business
    'unreachable',  -- no channel reached the business; needs a human
    'contacted',    -- business reached the customer
    'booked',       -- appointment agreed
    'declined',     -- business cannot take the requested time
    'no_response',  -- business never engaged
    'cancelled'     -- customer withdrew
  ));

-- Backfill the rows this describes: business never notified, still sitting in
-- 'new'. Anything genuinely new is only seconds old and will not match by the
-- time this runs.
UPDATE public.booking_requests
   SET status = 'unreachable'
 WHERE status = 'new'
   AND notified_business_at IS NULL
   AND notify_error IS NOT NULL;
