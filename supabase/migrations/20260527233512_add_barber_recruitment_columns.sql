-- Add outreach tracking columns to agent_barber_leads for the barber recruitment agent

ALTER TABLE public.agent_barber_leads
ADD COLUMN IF NOT EXISTS last_contacted_at TIMESTAMPTZ,
ADD COLUMN IF NOT EXISTS outreach_attempts INTEGER DEFAULT 0,
ADD COLUMN IF NOT EXISTS contact_id TEXT,
ADD COLUMN IF NOT EXISTS last_conversation_history TEXT,
ADD COLUMN IF NOT EXISTS is_interested BOOLEAN,
ADD COLUMN IF NOT EXISTS desired_pay_structure TEXT;
