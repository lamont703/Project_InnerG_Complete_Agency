-- ============================================================
-- Migration 009: Create AI Assistant Domain
-- Inner G Complete Agency — Client Intelligence Portal
-- ============================================================
-- Tables: chat_sessions, chat_messages
-- ============================================================

-- CHAT SESSIONS (one per conversation — user + project + model)
CREATE TABLE public.chat_sessions (
  id                    UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  project_id            UUID NOT NULL REFERENCES public.projects(id) ON DELETE CASCADE,
  user_id               UUID NOT NULL REFERENCES public.users(id) ON DELETE CASCADE,
  model_used            TEXT NOT NULL DEFAULT 'gemini-1.5-flash', -- Tracks which Gemini model
  title                 TEXT,         -- Auto-generated from first message (TODO)
  total_input_tokens    INTEGER NOT NULL DEFAULT 0,
  total_output_tokens   INTEGER NOT NULL DEFAULT 0,
  created_at            TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at            TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE TRIGGER chat_sessions_updated_at
  BEFORE UPDATE ON public.chat_sessions
  FOR EACH ROW EXECUTE FUNCTION update_updated_at();

CREATE INDEX idx_chat_sessions_project ON public.chat_sessions(project_id, created_at DESC);
CREATE INDEX idx_chat_sessions_user ON public.chat_sessions(user_id);

-- CHAT MESSAGES (every turn in the conversation)
CREATE TABLE public.chat_messages (
  id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  session_id      UUID NOT NULL REFERENCES public.chat_sessions(id) ON DELETE CASCADE,
  role            chat_role NOT NULL,
  content         TEXT NOT NULL,
  input_tokens    INTEGER,        -- Only set for user messages
  output_tokens   INTEGER,        -- Only set for assistant messages
  created_at      TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX idx_chat_messages_session ON public.chat_messages(session_id, created_at ASC);

COMMENT ON TABLE public.chat_sessions IS
  'One row per Growth Assistant conversation. Tracks model used and cumulative token usage for cost attribution.';
COMMENT ON COLUMN public.chat_sessions.model_used IS
  'Gemini model identifier: "gemini-1.5-flash" (default), "gemini-1.5-pro", etc. Stored per-session so history shows which model answered.';
COMMENT ON COLUMN public.chat_sessions.total_input_tokens IS
  'Running sum of all input tokens in this session. Used for per-project AI cost reporting.';
COMMENT ON TABLE public.chat_messages IS
  'Individual turns in a chat session. Token counts stored for cost auditing and RAG quality analysis.';
