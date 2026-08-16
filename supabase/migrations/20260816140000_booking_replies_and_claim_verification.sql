-- Three things that arrive together, because they are one feature: letting a
-- business answer a booking request, and knowing it is really the business.

-- ---------------------------------------------------------------------------
-- 1. How a status changed, and what the business actually said.
-- ---------------------------------------------------------------------------
-- Until now a status moved and left no trace of who moved it. That was
-- tolerable when only the API wrote them; with an SMS reply handler, an owner
-- dashboard and a cron all writing the same column, "declined" with no
-- provenance cannot be audited — and the SMS path is the one parsing free text
-- written by a stranger, so it is exactly the one that needs to be reviewable.
ALTER TABLE public.booking_requests
  ADD COLUMN IF NOT EXISTS status_source TEXT
  CHECK (status_source IS NULL OR status_source IN (
    'api',        -- the original request write
    'sms_reply',  -- the business texted back
    'dashboard',  -- an owner clicked it
    'cron',       -- the escalation job gave up
    'admin'       -- a human, by hand
  ));

-- The raw inbound message. Kept verbatim, NOT just the parsed intent: the
-- parser will be wrong sometimes, and without the original text there is no way
-- to find out how or to improve it. This is the training data for every future
-- change to lib/booking-reply.ts.
ALTER TABLE public.booking_requests
  ADD COLUMN IF NOT EXISTS business_reply TEXT;

ALTER TABLE public.booking_requests
  ADD COLUMN IF NOT EXISTS business_replied_at TIMESTAMPTZ;

COMMENT ON COLUMN public.booking_requests.business_reply IS
  'Verbatim inbound SMS from the business. Kept so a mis-parse can be found; see lib/booking-reply.ts.';

-- ---------------------------------------------------------------------------
-- 2. Verified ownership on the claim link.
-- ---------------------------------------------------------------------------
-- THE HOLE THIS CLOSES. app/api/community/register/route.ts writes a link row
-- for anyone who arrives from a "Claim your shop" CTA and signs up. Nobody
-- checks they own the business. Today that grants a badge and listing edits.
-- Hang booking requests off the same link and it grants a stranger the name,
-- phone number and email address of real customers.
--
-- The SMS to the business already carries that data — but it goes to the phone
-- number ON THE LISTING, which is verification by possession. A dashboard goes
-- to whoever filled in a form. Same data, completely different trust model.
--
-- NULL means unverified, which is the existing state of every current row. The
-- dashboard shows those owners that requests exist and withholds who is asking.
ALTER TABLE public.community_member_entity_links
  ADD COLUMN IF NOT EXISTS verified_at TIMESTAMPTZ;

ALTER TABLE public.community_member_entity_links
  ADD COLUMN IF NOT EXISTS verification_method TEXT
  CHECK (verification_method IS NULL OR verification_method IN (
    'gbp',    -- Google Business Profile OAuth on a location they manage
    'sms',    -- a code texted to the number already on the listing
    'admin'   -- a human checked
  ));

COMMENT ON COLUMN public.community_member_entity_links.verified_at IS
  'Ownership proven. NULL = self-claimed and unproven; customer PII must stay hidden. See 20260816140000.';

-- ---------------------------------------------------------------------------
-- 3. The SMS verification codes.
-- ---------------------------------------------------------------------------
-- Codes are HASHED. A verification code is a bearer credential for the duration
-- of its life, and this table sits beside customer contact data; storing them
-- in clear would mean anyone with read access could claim any listing whose
-- code was in flight.
--
-- The destination phone is NEVER supplied by the claimant — it is read from the
-- listing row server-side. That is the entire security property. A code sent to
-- a number the claimant typed in proves only that they can receive their own
-- text messages. (app/api/send-otp/route.ts takes `phone` from the request
-- body and is NOT a model to copy.)
CREATE TABLE IF NOT EXISTS public.entity_claim_verifications (
  id                  UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  community_member_id UUID NOT NULL REFERENCES public.community_members(id) ON DELETE CASCADE,
  entity_type         TEXT NOT NULL,
  entity_id           UUID NOT NULL,
  code_hash           TEXT NOT NULL,
  -- Shown back to the claimant ("we texted a code ending 4821") so they know
  -- which phone to check without us disclosing the whole number.
  phone_last4         TEXT,
  attempts            INT NOT NULL DEFAULT 0,
  expires_at          TIMESTAMPTZ NOT NULL,
  consumed_at         TIMESTAMPTZ,
  created_at          TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- The verify path's exact predicate: this member's live code for this entity.
CREATE INDEX IF NOT EXISTS entity_claim_verifications_open_idx
  ON public.entity_claim_verifications (community_member_id, entity_type, entity_id)
  WHERE consumed_at IS NULL;

ALTER TABLE public.entity_claim_verifications ENABLE ROW LEVEL SECURITY;

-- Service role only, like every other table holding a credential or PII here.
-- There is no safe public read: a row reveals that a claim is in flight and
-- which listing it targets.
CREATE POLICY "Service role full access to claim verifications"
  ON public.entity_claim_verifications
  FOR ALL TO service_role USING (true) WITH CHECK (true);
