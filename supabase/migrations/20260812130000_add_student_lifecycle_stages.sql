-- The student lifecycle sequence, alongside the owner one.
--
-- member_lifecycle_emails.stage carries a CHECK constraint listing every valid
-- stage, which is what makes the one-email-per-stage-per-member guarantee real
-- rather than a convention. Adding a second sequence means extending that list
-- — without this, the job would compute a student stage correctly, try to
-- record it, and be rejected by the database AFTER the email had already gone
-- out. That failure mode is worse than not sending: the row is what stops it
-- being sent again, so the same member would receive it on every subsequent
-- run, forever.
--
-- The unique index on (community_member_id, stage) needs no change: student
-- stages are distinct values, so a member cannot receive one twice, and the
-- two sequences cannot collide with each other.

ALTER TABLE public.member_lifecycle_emails
    DROP CONSTRAINT IF EXISTS member_lifecycle_emails_stage_check;

ALTER TABLE public.member_lifecycle_emails
    ADD CONSTRAINT member_lifecycle_emails_stage_check
    CHECK (stage IN (
        -- Owner / professional sequence — unchanged.
        'no_claim',
        'claimed_not_connected',
        'connected_no_audit',
        'audit_no_action',
        'dormant',
        -- Student sequence. Driven by the exam date rather than by time since
        -- signup — see the header of lib/member-lifecycle.ts.
        'student_setup',
        'student_kit',
        'student_written',
        'student_pack',
        'student_market',
        'student_dormant'
    ));

COMMENT ON COLUMN public.member_lifecycle_emails.stage IS
    'Which lifecycle stage this email was for. Two independent sequences: the owner track (no_claim…dormant) and the student track (student_*), chosen by community_members.audience.';
