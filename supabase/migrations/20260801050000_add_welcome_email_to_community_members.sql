-- Whether the welcome email actually went out.
--
-- Same discipline as gbp_public_audit_runs.emailed_at, and for the same reason:
-- this project has already shipped a screen that told someone an email was
-- coming while nothing sent. Recording the send makes that failure visible —
-- a member row with no welcome_email_sent_at is someone who signed up and
-- heard nothing back.

ALTER TABLE public.community_members
    ADD COLUMN IF NOT EXISTS welcome_email_sent_at timestamptz,
    ADD COLUMN IF NOT EXISTS welcome_email_error text;

COMMENT ON COLUMN public.community_members.welcome_email_sent_at IS
    'Set when the welcome email was accepted for delivery. Null means the member never received one.';
COMMENT ON COLUMN public.community_members.welcome_email_error IS
    'Why the welcome email failed, when it did. Read alongside a null welcome_email_sent_at.';
