-- 'service_customer' — someone who books a haircut or a salon service.
--
-- The first audience that arrives without ever visiting /membership. It is
-- inferred server-side from a completed booking request and stamped when the
-- magic link is used, so the constraint has to accept it before the callback
-- can write it. See lib/audiences.ts and lib/account-invite.ts.
--
-- Without this, the callback's stamp fails the CHECK and the member is created
-- with a NULL audience — the exact problem the inference exists to fix, failing
-- silently because that write is deliberately non-fatal.
ALTER TABLE public.community_members
  DROP CONSTRAINT IF EXISTS community_members_audience_check;

ALTER TABLE public.community_members
  ADD CONSTRAINT community_members_audience_check
  CHECK (audience IS NULL OR audience IN (
    'student',
    'professional',
    'owner',
    'school',
    'service_customer'
  ));
