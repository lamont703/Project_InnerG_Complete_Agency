-- Owner-approved changes to a Google Business Profile.
--
-- Nothing customer-visible should be published to someone's listing without
-- them agreeing to that specific change. This table is the record of that
-- agreement: what was proposed, who approved it, when, and which write it
-- produced.
--
-- For attributes the "proposal" is the owner's own answers — Google supplies a
-- fixed catalogue of factual claims (wheelchair accessible, Black-owned, takes
-- walk-ins) and only the owner knows which are true, so there is nothing for us
-- to propose. Later surfaces (review replies, posts) will have a generated
-- draft sitting here awaiting approval, which is why the shape is generic now
-- rather than attribute-specific.

CREATE TABLE IF NOT EXISTS public.gbp_change_requests (
    id                  uuid PRIMARY KEY DEFAULT gen_random_uuid(),
    community_member_id uuid REFERENCES public.community_members(id) ON DELETE SET NULL,
    location_name       text NOT NULL,
    surface             text NOT NULL,

    -- What is being changed, in the shape the write layer expects.
    proposed            jsonb NOT NULL,
    -- Free-text record of where it came from: "owner questionnaire",
    -- "generated reply draft", etc.
    origin              text,

    status              text NOT NULL DEFAULT 'pending',
    -- The undo point produced when this was applied (gbp_write_snapshots.id),
    -- so a change can be traced to exactly what it overwrote.
    snapshot_id         uuid REFERENCES public.gbp_write_snapshots(id) ON DELETE SET NULL,
    error               text,

    created_at          timestamptz NOT NULL DEFAULT now(),
    approved_at         timestamptz,
    applied_at          timestamptz,

    CONSTRAINT gbp_change_requests_status_check
        CHECK (status IN ('pending', 'approved', 'applied', 'failed', 'rejected'))
);

CREATE INDEX IF NOT EXISTS idx_gbp_change_requests_member_status
    ON public.gbp_change_requests (community_member_id, status, created_at DESC);

ALTER TABLE public.gbp_change_requests ENABLE ROW LEVEL SECURITY;

COMMENT ON TABLE public.gbp_change_requests IS
    'Owner-approved changes to Google Business Profiles. Links an approval to the write snapshot it produced.';
