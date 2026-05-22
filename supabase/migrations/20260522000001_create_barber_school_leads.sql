CREATE TABLE IF NOT EXISTS agent_barber_school_leads (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    school_name TEXT NOT NULL,
    contact_name TEXT,
    city TEXT,
    accreditation_status TEXT,
    phone TEXT,
    email TEXT,
    
    -- AI Context
    last_conversation_history TEXT DEFAULT '',
    conversation_turns JSONB DEFAULT '[]'::jsonb,
    
    -- Telemetry Tracking
    outreach_status TEXT DEFAULT 'pending',
    last_contacted_at TIMESTAMPTZ,
    outreach_attempts INTEGER DEFAULT 0,
    
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Ensure we don't accidentally import duplicates of the same school in the same city
ALTER TABLE agent_barber_school_leads ADD CONSTRAINT unique_school_city UNIQUE (school_name, city);
