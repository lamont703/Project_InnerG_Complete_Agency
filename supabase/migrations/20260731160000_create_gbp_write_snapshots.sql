-- Undo log for every write we make to a customer's Google Business Profile.
--
-- Nothing has ever been written to Google from this codebase; everything so far
-- reads. The moment that changes, the risk changes with it: an owner's live
-- profile is their livelihood, some Google edits queue for review and surface
-- days later, and "we'll just put it back" is not a plan unless the previous
-- state was recorded before the change.
--
-- So the rule the write layer enforces is: snapshot first, and abort the write
-- if the snapshot didn't save. A failed write is recoverable. A successful write
-- with no record of what preceded it is not.

CREATE TABLE IF NOT EXISTS public.gbp_write_snapshots (
    id                  uuid PRIMARY KEY DEFAULT gen_random_uuid(),
    community_member_id uuid REFERENCES public.community_members(id) ON DELETE SET NULL,

    location_name       text NOT NULL,
    -- Which API surface: attributes, location, localPosts, reviews, media,
    -- placeActionLinks. Kept as text because the set will grow.
    surface             text NOT NULL,

    -- Exactly what we read back immediately before writing. This is what a
    -- revert restores, so it is stored whole rather than as a diff.
    before_state        jsonb NOT NULL,
    -- Exactly what we sent, including the field mask.
    applied_patch       jsonb NOT NULL,
    -- What the profile looked like after, read back from Google rather than
    -- assumed — Google can accept a write and apply something different.
    after_state         jsonb,

    status              text NOT NULL DEFAULT 'applied',
    note                text,

    applied_at          timestamptz NOT NULL DEFAULT now(),
    reverted_at         timestamptz,

    CONSTRAINT gbp_write_snapshots_status_check
        CHECK (status IN ('applied', 'reverted', 'failed'))
);

CREATE INDEX IF NOT EXISTS idx_gbp_write_snapshots_location_time
    ON public.gbp_write_snapshots (location_name, applied_at DESC);

-- Member data and an audit trail of changes to third-party business profiles.
-- RLS on with no policies, matching gbp_connections: reachable only through our
-- server routes on the service-role key.
ALTER TABLE public.gbp_write_snapshots ENABLE ROW LEVEL SECURITY;

COMMENT ON TABLE public.gbp_write_snapshots IS
    'Undo log for writes to Google Business Profiles. Written by lib/gbp-write.ts before any mutation; before_state is what a revert restores.';
