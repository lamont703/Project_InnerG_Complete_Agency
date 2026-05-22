-- supabase/migrations/168_add_conversation_turns_to_placement_agents.sql
--
-- Upgrades agent_barbershop_leads and agent_barber_school_leads to store
-- conversation history as a structured JSONB array of turns instead of a 
-- flat TEXT blob. Each turn is: { role: "agent"|"user", content: string, timestamp: string }
-- This enables the AI to read a properly formatted thread with full context.

ALTER TABLE public.agent_barbershop_leads
  ADD COLUMN IF NOT EXISTS conversation_turns JSONB NOT NULL DEFAULT '[]'::jsonb;

ALTER TABLE public.agent_barber_school_leads
  ADD COLUMN IF NOT EXISTS conversation_turns JSONB NOT NULL DEFAULT '[]'::jsonb;

-- Backfill: convert any existing last_conversation_history text into the
-- first turn of the structured array so no data is lost.
UPDATE public.agent_barbershop_leads
SET conversation_turns = jsonb_build_array(
  jsonb_build_object(
    'role', 'system',
    'content', last_conversation_history,
    'timestamp', created_at::text
  )
)
WHERE conversation_turns = '[]'::jsonb
  AND last_conversation_history IS NOT NULL
  AND last_conversation_history != '';

UPDATE public.agent_barber_school_leads
SET conversation_turns = jsonb_build_array(
  jsonb_build_object(
    'role', 'system',
    'content', last_conversation_history,
    'timestamp', created_at::text
  )
)
WHERE conversation_turns = '[]'::jsonb
  AND last_conversation_history IS NOT NULL
  AND last_conversation_history != '';
