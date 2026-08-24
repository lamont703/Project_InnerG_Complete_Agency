-- Agent memory becomes cross-channel.
--
-- member_agent_messages already stores the chat, one row per turn, keyed to a
-- member. That is the right shape for SMS and email too — what it lacked was
-- any way to say WHERE a turn happened, and any way to import one twice safely.
--
-- WHY NOT THE EXISTING conversation_turns COLUMN. The SMS agents append turns to
-- a JSONB array on agent_barbershop_leads. That column stays where it is and
-- keeps doing its job, but it is the wrong home for agent memory on three
-- counts: it hangs off a SHOP rather than a member, so a member with no claimed
-- listing has nowhere to put anything; it holds conversations with PROSPECTS
-- being pitched a claim, which is not a member talking to their agent; and it is
-- rewritten whole on every message, which is fine at ten turns and a full-row
-- write per text at five hundred.
ALTER TABLE public.member_agent_messages
    -- Where the turn happened. Defaulted to 'chat' so every existing row is
    -- correct without a backfill — that is what they all are.
    ADD COLUMN IF NOT EXISTS channel TEXT NOT NULL DEFAULT 'chat'
        CHECK (channel IN ('chat', 'sms', 'email', 'instagram')),

    -- The sending system's own id, where there is one: a GHL message id, a
    -- booking_emails id. Backfills re-run and webhooks retry, and without this
    -- the second run silently doubles the history the agent reasons from.
    ADD COLUMN IF NOT EXISTS external_id TEXT,

    -- Which conversation this was imported from, for turns that predate agent
    -- memory. 'claim_sms' is a sales pitch the member happened to be on the
    -- other end of; it is genuinely theirs, but the agent should know it was
    -- not a conversation with the agent.
    ADD COLUMN IF NOT EXISTS source TEXT;

-- Idempotent import. Partial, because a chat turn has no external id and must
-- still be insertable.
CREATE UNIQUE INDEX IF NOT EXISTS member_agent_messages_external_idx
    ON public.member_agent_messages (channel, external_id)
    WHERE external_id IS NOT NULL;

-- "The last N turns across every channel" is the query the chat context runs on
-- every request, so it gets its own index rather than relying on the thread one.
CREATE INDEX IF NOT EXISTS member_agent_messages_channel_idx
    ON public.member_agent_messages (thread_id, created_at DESC, channel);

-- 'human' is not decoration. The role check was ('user','model') because chat
-- only ever has those two. An SMS answered by a person on our side — a founder
-- replying from the GHL inbox — is neither, and storing it as 'model' would
-- teach the agent it said things it never said. That is a correctness problem
-- for memory, not a labelling nicety.
ALTER TABLE public.member_agent_messages
    DROP CONSTRAINT IF EXISTS member_agent_messages_role_check;
ALTER TABLE public.member_agent_messages
    ADD CONSTRAINT member_agent_messages_role_check
    CHECK (role IN ('user', 'model', 'human'));

COMMENT ON COLUMN public.member_agent_messages.channel IS
    'Where the turn happened. The agent can then say "you texted me this" rather than treating every memory as chat.';
COMMENT ON COLUMN public.member_agent_messages.external_id IS
    'Sending system''s id, for idempotent backfill. Null for turns that originate here.';
