-- The resolution sweep now also covers 'booked': an SMS reply of "Y" moves the
-- row and nothing else, so without this the customer who started the whole
-- thing is the only person who never learns it worked. The partial index has to
-- cover that status or the query falls back to a scan.
DROP INDEX IF EXISTS booking_requests_resolution_due_idx;
CREATE INDEX booking_requests_resolution_due_idx
  ON public.booking_requests (requested_date)
  WHERE resolution_notified_at IS NULL AND status IN ('notified', 'declined', 'booked');
