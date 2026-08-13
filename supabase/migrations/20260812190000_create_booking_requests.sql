-- Booking requests — the appointment ask a visitor makes on an entity page,
-- and the notification trail that follows it.
--
-- WHY THIS EXISTS. Every entity page used to end in a Call button and a
-- Website button. Both work, and both hand the lead away: the visit converts
-- somewhere we cannot see, so the directory can prove nothing and charge for
-- nothing. This table is the capture point that makes a lead an artifact —
-- a name, a phone, a service and a date — which is what the rank-and-rent
-- pitch and Listing Insights both need and currently lack.
--
-- THIS IS A REQUEST, NOT A BOOKING. Nothing here reserves a slot. 6 of 5,457
-- listings are claimed, so nobody is maintaining availability and a confirmed
-- appointment is not ours to promise. The row records what the customer
-- ASKED for; the business confirms out of band. Every column name says
-- "requested" for that reason, and status starts at 'new' rather than
-- 'booked'.
--
-- DENORMALISED ON PURPOSE. entity_name and entity_phone are copied in at
-- submit time rather than joined at read time. A booking request is a record
-- of a moment, and it must still be legible if the listing is later renamed,
-- re-slugged or removed — the same reasoning as shortlists.items. It also
-- means the notification retry path never needs to re-read the entity table.

CREATE TABLE IF NOT EXISTS public.booking_requests (
  id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),

  -- Which of the four entity page types this came from. No FK: the four
  -- entities live in four separate tables, so the type carries the join.
  entity_type     TEXT NOT NULL CHECK (entity_type IN ('shop', 'salon', 'barber', 'cosmetologist')),
  entity_id       TEXT NOT NULL,
  entity_slug     TEXT,
  entity_name     TEXT,
  -- The business's own number, as held when the request was made. This is the
  -- SMS destination, and keeping it here means a failed send can be retried
  -- without re-reading the source row.
  entity_phone    TEXT,

  -- What was asked for. service_price is nullable because it is only real for
  -- barbers and cosmetologists, whose booksy_services carry actual prices;
  -- shops and salons draw from a curated per-category list with no pricing,
  -- and inventing a number there would be worse than showing none.
  service_name    TEXT NOT NULL,
  service_price   NUMERIC,
  service_duration TEXT,

  requested_date  DATE NOT NULL,
  requested_time  TEXT NOT NULL,

  -- Both required, per the form. Phone is how the shop closes; email is how we
  -- confirm and follow up, and the only address we will ever hold for this
  -- person — the businesses themselves have almost none (31 across 5,457).
  customer_name   TEXT,
  customer_phone  TEXT NOT NULL,
  customer_email  TEXT NOT NULL,
  customer_notes  TEXT,

  -- new -> notified -> contacted -> booked | no_response | cancelled.
  -- 'notified' means we reached the business, NOT that they replied.
  status          TEXT NOT NULL DEFAULT 'new'
                  CHECK (status IN ('new', 'notified', 'contacted', 'booked', 'no_response', 'cancelled')),

  -- Notification trail. Separate stamps because the two sends fail
  -- independently and for different reasons: the business SMS can fail on a
  -- landline (silently, at the carrier), the customer email cannot.
  notified_business_at  TIMESTAMPTZ,
  notified_customer_at  TIMESTAMPTZ,
  notify_error          TEXT,

  -- Set when the no-response escalation has gone out, so the cron is
  -- idempotent. See the 4-hour rule in app/api/bookings/route.ts.
  escalated_at    TIMESTAMPTZ,

  ghl_contact_id  TEXT,
  source          TEXT,

  created_at      TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at      TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- The dashboard's predicate: everything for one listing, newest first.
CREATE INDEX IF NOT EXISTS booking_requests_entity_idx
  ON public.booking_requests (entity_type, entity_id, created_at DESC);

-- The claim hook's predicate: how many unseen requests is this listing sitting
-- on. Partial, because a claimed-and-worked listing is not what it counts.
CREATE INDEX IF NOT EXISTS booking_requests_pending_idx
  ON public.booking_requests (entity_type, entity_id)
  WHERE status IN ('new', 'notified');

-- The escalation cron's exact predicate: notified, nobody replied, not yet
-- escalated.
CREATE INDEX IF NOT EXISTS booking_requests_escalation_due_idx
  ON public.booking_requests (notified_business_at)
  WHERE status = 'notified' AND escalated_at IS NULL;

ALTER TABLE public.booking_requests ENABLE ROW LEVEL SECURITY;

-- Service role only. This table holds a customer's phone AND email against a
-- named business and a date — there is no public read that is safe, and the
-- API route is the single writer.
CREATE POLICY "Allow service role full access" ON public.booking_requests
  FOR ALL TO service_role USING (true) WITH CHECK (true);
