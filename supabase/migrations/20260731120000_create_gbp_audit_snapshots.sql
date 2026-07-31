-- Point-in-time records of a member's Google Business Profile audit.
--
-- The audit itself is computed live from Google on every visit. That's fine for
-- answering "how am I doing now", but it makes the more valuable question
-- unanswerable: "what changed since last time". An owner who spends a week
-- filling attributes comes back to a new number with nothing to compare it
-- against, and the monitoring tier we sell — "we watch for drift and tell you
-- what moved" — has nothing to diff against.
--
-- One row per meaningful audit run. Writes are gated in lib/gbp-audit-history.ts
-- so a page refresh doesn't create a row: a snapshot is only recorded when
-- there's no recent one or when the score actually changed.

CREATE TABLE IF NOT EXISTS public.gbp_audit_snapshots (
    id                  uuid PRIMARY KEY DEFAULT gen_random_uuid(),
    community_member_id uuid NOT NULL REFERENCES public.community_members(id) ON DELETE CASCADE,

    -- Google's location resource name ("locations/1234…"). Kept alongside the
    -- member because one member can connect several locations over time, and a
    -- history that merged them would be meaningless.
    location_name       text NOT NULL,
    business_name       text,

    score               integer NOT NULL,
    grade               text,

    -- {"Foundation": {"earned": 31, "possible": 35}, …}
    areas               jsonb NOT NULL DEFAULT '{}'::jsonb,
    -- The full AuditCheck[] — stored whole so a diff can name exactly which
    -- check moved and quote both values, without us having to guess up front
    -- which fields would matter later.
    checks              jsonb NOT NULL DEFAULT '[]'::jsonb,
    -- 30-day totals at the time of the run.
    performance         jsonb,
    keyword_count       integer,

    created_at          timestamptz NOT NULL DEFAULT now()
);

-- The only access pattern: the latest N snapshots for one member's location.
CREATE INDEX IF NOT EXISTS idx_gbp_audit_snapshots_member_location_time
    ON public.gbp_audit_snapshots (community_member_id, location_name, created_at DESC);

-- Member-owned data. Enabled with no policies, matching gbp_connections: every
-- read and write goes through our server routes on the service-role key, which
-- bypasses RLS. No anon or authenticated role can reach this table directly.
ALTER TABLE public.gbp_audit_snapshots ENABLE ROW LEVEL SECURITY;

COMMENT ON TABLE public.gbp_audit_snapshots IS
    'Historical Google Business Profile audit results per member/location. Written by lib/gbp-audit-history.ts; read by /account/gbp-audit to show score history and what changed.';
