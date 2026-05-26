CREATE TABLE IF NOT EXISTS agent_barber_leads (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    name TEXT NOT NULL,
    phone TEXT NOT NULL,
    address TEXT,
    profile_url TEXT,
    source TEXT,
    status TEXT DEFAULT 'pending_outreach',
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    CONSTRAINT unique_phone UNIQUE (phone)
);

-- Enable RLS and add basic policies
ALTER TABLE agent_barber_leads ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Allow service role full access" 
ON agent_barber_leads 
USING (true) 
WITH CHECK (true);
