-- Who is checking which business on the free audit.
--
-- The free tool is the top of the funnel and currently forgets everyone who
-- doesn't connect Google. Two things are worth keeping, and they're different
-- in kind:
--
--   • The run itself — which business was audited and what it scored. No
--     personal data, no consent needed, and on its own it's a prospect list:
--     these are shops someone cared enough to look up, often the owner.
--   • An email, only when someone volunteers one to have their report sent.
--
-- Deliberately not a gate. The score renders whether or not anyone types
-- anything, because a wall in front of the one genuinely useful free thing on
-- the site would cost more than the addresses are worth.

CREATE TABLE IF NOT EXISTS public.gbp_public_audit_runs (
    id            uuid PRIMARY KEY DEFAULT gen_random_uuid(),

    entity_type   text NOT NULL,
    entity_slug   text NOT NULL,
    business_name text,
    city          text,
    score         integer,

    -- Null unless the visitor asked for their report by email.
    email         text,
    -- Rough source, for telling organic search from a shared link.
    referrer      text,

    created_at    timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_public_audit_runs_created
    ON public.gbp_public_audit_runs (created_at DESC);
CREATE INDEX IF NOT EXISTS idx_public_audit_runs_entity
    ON public.gbp_public_audit_runs (entity_type, entity_slug);
CREATE INDEX IF NOT EXISTS idx_public_audit_runs_email
    ON public.gbp_public_audit_runs (email) WHERE email IS NOT NULL;

-- Contains volunteered email addresses. RLS on with no policies, so it's
-- reachable only through our server routes on the service-role key — the
-- endpoint that writes it is public and unauthenticated, which makes the read
-- side mattering more, not less.
ALTER TABLE public.gbp_public_audit_runs ENABLE ROW LEVEL SECURITY;

COMMENT ON TABLE public.gbp_public_audit_runs IS
    'Free audit usage: which business was scored, and an email only where the visitor volunteered one.';
