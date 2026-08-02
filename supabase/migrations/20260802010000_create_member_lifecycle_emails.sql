-- What we've said to a member, and when.
--
-- The unique constraint is the feature. A member receives each lifecycle stage
-- at most once for the life of the account — no re-sends, no reminders, no
-- second attempts. A message that didn't work doesn't work better the second
-- time, and the cost of getting this wrong is the address itself.
--
-- Failed sends are recorded too, with the error. A row with no sent_at is a
-- member the job tried to reach and couldn't — the same discipline as
-- gbp_public_audit_runs.emailed_at and community_members.welcome_email_sent_at,
-- and for the same reason: a promise that silently didn't happen is worse than
-- one that visibly failed.

CREATE TABLE IF NOT EXISTS public.member_lifecycle_emails (
    id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
    community_member_id uuid NOT NULL,
    stage text NOT NULL,

    sent_at timestamptz,
    error text,

    -- What the email actually said, so a reply can be read in context months
    -- later without reconstructing which version of the copy went out.
    subject text,

    created_at timestamptz NOT NULL DEFAULT now(),

    CONSTRAINT member_lifecycle_emails_stage_check
        CHECK (stage IN ('no_claim', 'claimed_not_connected', 'connected_no_audit', 'audit_no_action', 'dormant'))
);

-- One attempt per stage per member, enforced by the database rather than by
-- the job remembering to check.
CREATE UNIQUE INDEX IF NOT EXISTS member_lifecycle_emails_once_idx
    ON public.member_lifecycle_emails (community_member_id, stage);

CREATE INDEX IF NOT EXISTS member_lifecycle_emails_member_idx
    ON public.member_lifecycle_emails (community_member_id, sent_at DESC);

-- Service-role only, like every other table holding member data.
ALTER TABLE public.member_lifecycle_emails ENABLE ROW LEVEL SECURITY;

COMMENT ON TABLE public.member_lifecycle_emails IS
    'One row per lifecycle stage per member. Written by /api/cron/member-lifecycle.';
COMMENT ON COLUMN public.member_lifecycle_emails.sent_at IS
    'Null with a row present means the send was attempted and failed — see error.';
