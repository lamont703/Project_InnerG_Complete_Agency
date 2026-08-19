-- ONE ROW PER MACHINE REQUEST, ACROSS EVERY SURFACE A MACHINE CAN REACH.
--
-- WHY THIS EXISTS. The MCP endpoint has been live and published in the MCP
-- registry since it was built, and it recorded NOTHING. Not a count, not a
-- caller, not a tool name. The question "has anyone used our MCP server?" had
-- no answer available anywhere: pixel_events is client-side JavaScript and a
-- machine never runs it, and Vercel's runtime logs are a short debugging
-- window, not a record. The honest answer was "we cannot know", which is the
-- worst possible position for a surface we are considering charging for.
--
-- WHAT IT REPLACES. llm_bot_requests logged the ENTITY .md route only. That
-- left two blind spots that mattered more than the one it covered:
--   1. the MCP endpoint entirely, and
--   2. the CONTENT .md pages (app/api/llm-page/), which include the kit lists
--      — the best-performing content on the site.
-- Its bot list was also a hardcoded ten, hand-copied and already stale against
-- lib/robots-rules.ts. That table is left in place with its history intact;
-- nothing writes to it any more.
--
-- THE UNDERCOUNT, STATED UP FRONT. Both .md routes send Cache-Control with a
-- shared-cache lifetime, so a repeat request inside that window is answered by
-- the CDN and never reaches the function that writes this row. These counts are
-- therefore a FLOOR for .md, not a total. MCP is force-dynamic and uncached, so
-- its counts are exact. Do not compare the two as like for like. Making .md
-- exact means logging in middleware (which runs before the cache) via waitUntil
-- — deliberately not done here, because it would put a database write in front
-- of every request on the site to sharpen a number that is already directionally
-- sufficient.
--
-- Private, like every other operational table: RLS on with no policies, so only
-- the service role reaches it and the admin page reads through server code.

CREATE TABLE IF NOT EXISTS public.agent_requests (
    id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    requested_at    TIMESTAMPTZ NOT NULL DEFAULT now(),

    -- Which machine-readable surface was hit. Kept as one table with a
    -- discriminator rather than three tables, because every question worth
    -- asking here ("is demand growing", "who is calling us", "what do they
    -- want") is asked ACROSS surfaces, and three tables would mean a UNION on
    -- every read.
    surface         TEXT NOT NULL CHECK (surface IN ('mcp', 'md_entity', 'md_page')),
    path            TEXT NOT NULL,

    -- MCP only. tool_arguments is the actual question asked — the single most
    -- valuable column here, because it is direct evidence of what an AI client
    -- wants from this data and therefore what could be priced.
    mcp_method      TEXT,
    tool_name       TEXT,
    tool_arguments  JSONB,

    -- .md only.
    entity_type     TEXT,
    slug            TEXT,

    -- WHO CALLED. agent_name is the matched token; agent_kind is the bucket.
    -- The bucket is the part that makes this readable: the old table filed 45
    -- of its 57 rows as "unknown" when they were plainly curl, which made real
    -- crawler traffic (2 rows) impossible to see without reading raw strings.
    user_agent      TEXT,
    agent_name      TEXT,
    agent_kind      TEXT NOT NULL DEFAULT 'unknown'
                    CHECK (agent_kind IN ('ai', 'search', 'internal', 'tool', 'browser', 'unknown')),

    -- Kept raw, not hashed, for one specific reason: confirming a self-declared
    -- crawler is genuine is done by reverse DNS on the calling IP, and a hash
    -- forecloses that. Standard web-server access-log data, service-role only.
    client_ip       TEXT,

    status_code     SMALLINT,
    is_error        BOOLEAN NOT NULL DEFAULT false,
    duration_ms     INTEGER
);

-- The dashboard's access patterns: newest first, windowed; and grouped by who
-- or by surface within a window.
CREATE INDEX IF NOT EXISTS agent_requests_requested_idx
    ON public.agent_requests (requested_at DESC);
CREATE INDEX IF NOT EXISTS agent_requests_kind_requested_idx
    ON public.agent_requests (agent_kind, requested_at DESC);
CREATE INDEX IF NOT EXISTS agent_requests_surface_requested_idx
    ON public.agent_requests (surface, requested_at DESC);

ALTER TABLE public.agent_requests ENABLE ROW LEVEL SECURITY;
-- No policies → service-role only.

COMMENT ON TABLE public.agent_requests IS
    'One row per machine request to /mcp or a .md twin. Read by /admin/agent-traffic. .md counts are a floor because CDN-cached responses never reach the function; MCP counts are exact.';
COMMENT ON COLUMN public.agent_requests.tool_arguments IS
    'The arguments an MCP client actually sent. Direct evidence of what AI clients want from this data — the input to any decision about pricing access.';
COMMENT ON COLUMN public.agent_requests.agent_kind IS
    'Bucket, not identity. ai/search from lib/robots-rules.ts tokens; tool = curl/wget/scripted; internal = our own jobs. Prevents real crawler traffic being buried under generic clients.';
