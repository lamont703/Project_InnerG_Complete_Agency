-- Add telemetry columns for CSV batch outreach
ALTER TABLE agent_barbershop_leads 
ADD COLUMN IF NOT EXISTS outreach_status TEXT DEFAULT 'pending',
ADD COLUMN IF NOT EXISTS last_contacted_at TIMESTAMPTZ,
ADD COLUMN IF NOT EXISTS outreach_attempts INTEGER DEFAULT 0;

-- Ensure contact_id can be null since CSV leads don't have GHL contact_ids yet
ALTER TABLE agent_barbershop_leads ALTER COLUMN contact_id DROP NOT NULL;
