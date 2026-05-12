-- Migration 098: Add metadata to chat_sessions
-- Inner G Complete Agency — Multi-Channel Assistant Support
-- ─────────────────────────────────────────────────────────
-- Adds a metadata column to chat_sessions to track the source 
-- (SMS, Email, WhatsApp) and provider-specific IDs (e.g. GHL contactId).

ALTER TABLE public.chat_sessions 
ADD COLUMN IF NOT EXISTS metadata JSONB DEFAULT '{}'::jsonb;

-- GIN index for efficient JSONB querying (e.g. finding sessions by contactId)
CREATE INDEX IF NOT EXISTS idx_chat_sessions_metadata ON public.chat_sessions USING gin (metadata);

COMMENT ON COLUMN public.chat_sessions.metadata IS 
  'Stores omnichannel routing data (e.g. { "source": "sms", "contactId": "ghl_123" }).';
