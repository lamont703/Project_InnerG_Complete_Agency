-- 'declined' — the business saw the request and cannot take that time.
--
-- WHY IT NEEDS ITS OWN VALUE. The existing set had nowhere honest to put this.
-- 'cancelled' reads as the customer changing their mind; 'no_response' says the
-- business never engaged, which is the opposite of what happened and would
-- count against a business that answered promptly. The first real decline was
-- recorded by hand as 'contacted', which is true but loses the outcome.
--
-- This is not a failed booking. A business that declines fast is doing the
-- right thing, and the customer needs a different next step from one still
-- waiting to hear back — that distinction is only actionable if it is stored.

ALTER TABLE public.booking_requests
  DROP CONSTRAINT IF EXISTS booking_requests_status_check;

ALTER TABLE public.booking_requests
  ADD CONSTRAINT booking_requests_status_check
  CHECK (status IN (
    'new',          -- received, business not yet told
    'notified',     -- SMS delivered to the business
    'contacted',    -- business reached the customer
    'booked',       -- appointment agreed
    'declined',     -- business cannot take the requested time
    'no_response',  -- business never engaged
    'cancelled'     -- customer withdrew
  ));

-- Why the time was refused, when the business says. Free text on purpose: the
-- reasons are "I'm booked", "I'm closed Mondays", "not enough notice", and
-- guessing at an enum before seeing a dozen of them would encode the guess.
ALTER TABLE public.booking_requests
  ADD COLUMN IF NOT EXISTS declined_reason TEXT;

ALTER TABLE public.booking_requests
  ADD COLUMN IF NOT EXISTS declined_at TIMESTAMPTZ;

-- No new index. booking_requests_pending_idx and
-- booking_requests_escalation_due_idx are both partial on status IN ('new',
-- 'notified'), so a declined request drops out of each one the moment its
-- status changes — which is the behaviour wanted, and it comes free. Adding an
-- "open requests" index alongside them would have been a third copy of the
-- same predicate.

COMMENT ON COLUMN public.booking_requests.declined_reason IS
  'Free text from the business. See 20260815160000 for why this is not an enum.';
