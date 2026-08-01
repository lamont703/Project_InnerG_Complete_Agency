-- Whether the report we promised was actually sent.
--
-- The first version of this captured an address and told the visitor "we'll
-- send it over shortly" while nothing sent. Recording the send makes that
-- failure visible instead of silent: a row with an email and no emailed_at is
-- someone still waiting.

ALTER TABLE public.gbp_public_audit_runs
    ADD COLUMN IF NOT EXISTS emailed_at timestamptz,
    ADD COLUMN IF NOT EXISTS email_error text;

COMMENT ON COLUMN public.gbp_public_audit_runs.emailed_at IS
    'Set when the report email was actually delivered to the address. Null with an email present means it was not sent.';
