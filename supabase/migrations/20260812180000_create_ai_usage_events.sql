-- ONE ROW PER AI CALL, WITH WHAT IT COST.
--
-- The chat feature ran for months with no record of what it consumed. The only
-- signal that anything was being spent was the day the free-tier quota blocked
-- it — at which point the response said "Failed to process AI request" and
-- three competing theories had to be argued before anyone saw the real error.
-- This table is the instrument that makes that unnecessary: what was sent,
-- what came back, what it cost, and whether it worked.
--
-- WHY FAILURES ARE RECORDED TOO. A quota block is the most expensive kind of
-- event in business terms and consumes no tokens at all, so a table that only
-- logged successes would go quiet at exactly the moment something was wrong,
-- and quiet reads as "nothing happening". Every attempt gets a row; `status`
-- and `error_kind` say how it ended.
--
-- Private, like every other operational table: RLS on, no policies, so only
-- the service role reaches it and the admin page reads through server code.

CREATE TABLE IF NOT EXISTS public.ai_usage_events (
    id                  UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    created_at          TIMESTAMPTZ NOT NULL DEFAULT now(),

    -- Which surface spent this. There will be more than one caller soon
    -- (the .md layer, the agents, the audit tools), and a dashboard that
    -- cannot separate them cannot tell you which feature is expensive.
    route               TEXT NOT NULL,
    model               TEXT NOT NULL,

    -- Token counts as REPORTED BY THE PROVIDER, never estimated from
    -- characters. thinking_tokens is billed at the output rate and appears in
    -- no visible answer — counting only output would under-report the bill.
    input_tokens        INTEGER NOT NULL DEFAULT 0,
    output_tokens       INTEGER NOT NULL DEFAULT 0,
    thinking_tokens     INTEGER NOT NULL DEFAULT 0,

    -- Computed at write time from the rate table in lib/ai-usage.ts. Stored
    -- rather than derived on read, so a later price change doesn't silently
    -- rewrite history: what this row cost is what it cost on the day.
    -- NULL means no published rate for that model — distinct from zero.
    cost_usd            NUMERIC(12, 8),

    -- How big the grounding payload was before it went out. The lever this
    -- whole exercise is about, and the number that should visibly fall.
    context_chars       INTEGER,
    -- How many generations this request took. A tool call means two, each
    -- re-sending the entire context — which is why a turn can cost double.
    generations         SMALLINT NOT NULL DEFAULT 1,
    tool_calls          SMALLINT NOT NULL DEFAULT 0,

    latency_ms          INTEGER,
    status              TEXT NOT NULL DEFAULT 'ok'
                        CHECK (status IN ('ok', 'error')),
    -- Matches the classification the chat route returns to the client, so a
    -- spike on the dashboard and a user's error message name the same thing.
    error_kind          TEXT,

    -- Nullable: most chat traffic is anonymous, and that is the normal case
    -- rather than missing data. Lets us answer "what does a member cost us
    -- over their whole journey", which is the number the business model turns
    -- on. ON DELETE SET NULL so removing a member keeps the accounting whole.
    community_member_id UUID REFERENCES public.community_members(id) ON DELETE SET NULL
);

-- The dashboard's only access pattern: newest first, usually within a window.
CREATE INDEX IF NOT EXISTS ai_usage_events_created_idx
    ON public.ai_usage_events (created_at DESC);

CREATE INDEX IF NOT EXISTS ai_usage_events_route_created_idx
    ON public.ai_usage_events (route, created_at DESC);

ALTER TABLE public.ai_usage_events ENABLE ROW LEVEL SECURITY;
-- No policies → service-role only.

COMMENT ON TABLE public.ai_usage_events IS
    'One row per AI generation request, successful or not. Read by /admin/ai-usage. Token counts come from the provider''s usageMetadata, never estimated.';
COMMENT ON COLUMN public.ai_usage_events.thinking_tokens IS
    'Reasoning tokens. Billed at the OUTPUT rate and absent from the visible answer — excluded from cost only by mistake.';
COMMENT ON COLUMN public.ai_usage_events.cost_usd IS
    'Priced at write time from lib/ai-usage.ts MODEL_PRICING. NULL = no published rate for that model, which is not the same as free.';
