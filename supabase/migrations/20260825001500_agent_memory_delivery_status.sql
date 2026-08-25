-- Whether an outbound message was actually read.
--
-- recent_outreach could say "offered twice" and no more, which conflates two
-- very different people: one who never opened the email, and one who clicked
-- the link and stopped. The second is the strongest prompt the agent has; the
-- first mostly means the message did not land.
--
-- GHL carries this, but only on the SECOND hop — /conversations/messages/{id}
-- has no status, /conversations/messages/email/{id} does. Observed values on
-- real sends: delivered, opened, clicked.
--
-- NOT CONSTRAINED TO A KNOWN LIST. 'bounced' and 'failed' are plausible and
-- were not seen in sampling, and a CHECK that rejects an unseen value would
-- make the backfill drop the very messages worth knowing about — a bounce is a
-- broken channel, which the agent must never describe as "we emailed you".
ALTER TABLE public.member_agent_messages
    ADD COLUMN IF NOT EXISTS delivery_status TEXT,
    -- When the provider last moved it. A message delivered at noon can read
    -- 'opened' by evening, so a status is only as good as its timestamp — and
    -- this is what tells a refresh pass which rows have settled.
    ADD COLUMN IF NOT EXISTS status_checked_at TIMESTAMPTZ;

CREATE INDEX IF NOT EXISTS member_agent_messages_status_idx
    ON public.member_agent_messages (thread_id, delivery_status)
    WHERE delivery_status IS NOT NULL;

COMMENT ON COLUMN public.member_agent_messages.delivery_status IS
    'Provider delivery state for outbound: delivered / opened / clicked, and possibly bounced. Null for inbound and for anything never checked.';
