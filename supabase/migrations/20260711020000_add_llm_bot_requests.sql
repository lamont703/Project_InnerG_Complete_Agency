-- Logs every request that hits the .md AI-crawler endpoints
-- (app/api/llm/[entityType]/[slug]/route.ts), so we can see how often real
-- AI crawlers (vs. generic/unknown traffic) are actually pulling data —
-- separate from pixel_events, which only captures client-side (JS-executed)
-- browser activity and never fires for a bot fetching raw text directly.
CREATE TABLE IF NOT EXISTS llm_bot_requests (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  entity_type text NOT NULL,
  slug text NOT NULL,
  user_agent text,
  bot_name text,
  is_known_bot boolean NOT NULL DEFAULT false,
  requested_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_llm_bot_requests_requested_at ON llm_bot_requests (requested_at);
CREATE INDEX IF NOT EXISTS idx_llm_bot_requests_bot_name ON llm_bot_requests (bot_name);
