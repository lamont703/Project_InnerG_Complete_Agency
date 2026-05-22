-- Since the table already exists, we just need to ADD the missing columns
ALTER TABLE agent_barber_school_leads
ADD COLUMN IF NOT EXISTS accreditation_status TEXT,
ADD COLUMN IF NOT EXISTS phone TEXT,

-- Add Telemetry Tracking (like we did for the shops)
ADD COLUMN IF NOT EXISTS outreach_status TEXT DEFAULT 'pending',
ADD COLUMN IF NOT EXISTS last_contacted_at TIMESTAMPTZ,
ADD COLUMN IF NOT EXISTS outreach_attempts INTEGER DEFAULT 0;
