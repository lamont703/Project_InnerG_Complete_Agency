-- Tracks whether a verification request has been sent to GHL for a
-- given match — separate from confirmation_status, which reflects the
-- OUTCOME of confirmation (still always 'unconfirmed' until the manual
-- GHL-side confirmation flow exists). This just answers "has someone
-- already been asked."
ALTER TABLE public.professional_employment_matches
  ADD COLUMN IF NOT EXISTS verification_requested_at timestamptz;
