-- Add conversation_turns column to agent_barber_leads for structured conversation history

ALTER TABLE public.agent_barber_leads
ADD COLUMN IF NOT EXISTS conversation_turns JSONB DEFAULT '[]'::jsonb;
