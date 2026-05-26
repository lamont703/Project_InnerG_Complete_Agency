-- Create the agent_barber_instuctor_leads table
CREATE TABLE IF NOT EXISTS agent_barber_instuctor_leads (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    name TEXT NOT NULL,
    headline TEXT,
    about TEXT,
    profile_url TEXT UNIQUE NOT NULL,
    source TEXT DEFAULT NULL,
    status TEXT DEFAULT 'pending_outreach',
    phone TEXT DEFAULT NULL,
    email TEXT DEFAULT NULL,
    address TEXT DEFAULT NULL,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL
);

-- Enable Row Level Security (RLS)
ALTER TABLE agent_barber_instuctor_leads ENABLE ROW LEVEL SECURITY;

-- Create policies for service role to fully manage table
CREATE POLICY "Enable all actions for service role" ON agent_barber_instuctor_leads
    FOR ALL
    TO service_role
    USING (true)
    WITH CHECK (true);

-- Create policies for anon/authenticated (if necessary, though service role handles the script)
CREATE POLICY "Enable read access for all users" ON agent_barber_instuctor_leads
    FOR SELECT
    USING (true);

-- Create a trigger to update the updated_at column
CREATE OR REPLACE FUNCTION update_agent_barber_instuctor_leads_updated_at()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = timezone('utc'::text, now());
    RETURN NEW;
END;
$$ language 'plpgsql';

CREATE TRIGGER update_agent_barber_instuctor_leads_timestamp
    BEFORE UPDATE ON agent_barber_instuctor_leads
    FOR EACH ROW
    EXECUTE FUNCTION update_agent_barber_instuctor_leads_updated_at();
