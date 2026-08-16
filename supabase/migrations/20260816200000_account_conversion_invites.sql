-- The bridge between "someone converted" and "someone has an account".
--
-- WHY THIS EXISTS. Twelve people have typed an email into this site — a booking
-- request, a shortlist, a review, a pass-rate alert — against seven accounts.
-- Every one of those was a person handing over an identity and getting nothing
-- back. The account offer now rides on the conversion they already completed.
--
-- WHAT THIS ROW IS FOR, and it is not the email. The email is read from the
-- conversion record server-side; this table exists to carry TWO things across
-- the magic-link round trip, which is otherwise stateless:
--
--   source   -- which conversion earned the account, so `audience` can be
--               stamped automatically. Six of the seven existing members have
--               audience NULL, which makes every future segmentation
--               impossible. Asking people to self-identify is how that
--               happened; inferring it from what they actually did is the fix.
--
--   entity   -- optional, for conversions that point at a listing. Lets the
--               account open on something concrete rather than a blank page.
--
-- NOT A QUEUE AND NOT A MAILING LIST. A row here means "an offer was made", not
-- "send this person something". Nothing scans this table to send anything, and
-- nothing may start.
CREATE TABLE IF NOT EXISTS public.account_conversion_invites (
  id           UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  email        TEXT NOT NULL,
  source       TEXT NOT NULL CHECK (source IN (
    'booking',        -- an appointment request on an entity page
    'school_tour',    -- a campus visit request on /schools/[slug]
    'pass_rate_alert',-- asked to be told when a school's numbers move
    'shortlist',
    'review',
    'gbp_audit'
  )),
  -- Stamped onto community_members on claim. See lib/audiences.ts.
  audience     TEXT,
  entity_type  TEXT,
  entity_id    UUID,
  created_at   TIMESTAMPTZ NOT NULL DEFAULT now(),
  -- Set when the magic link is actually used. Until then the offer is unproven
  -- and NOTHING may be joined on this email — see the route for why.
  claimed_at   TIMESTAMPTZ,
  claimed_by   UUID REFERENCES public.community_members(id) ON DELETE SET NULL
);

-- The claim path's predicate: the newest unclaimed offer for this address.
CREATE INDEX IF NOT EXISTS account_conversion_invites_open_idx
  ON public.account_conversion_invites (lower(email), created_at DESC)
  WHERE claimed_at IS NULL;

ALTER TABLE public.account_conversion_invites ENABLE ROW LEVEL SECURITY;

-- Service role only. A row pairs an email address with a specific booking or
-- school, so there is no public read that is safe.
CREATE POLICY "Service role full access to conversion invites"
  ON public.account_conversion_invites
  FOR ALL TO service_role USING (true) WITH CHECK (true);

COMMENT ON TABLE public.account_conversion_invites IS
  'Carries source + audience across the magic-link round trip so an account can be stamped with what the person actually did. Never used to send anything.';
