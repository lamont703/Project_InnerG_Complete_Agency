-- Migration: 140_add_barber_registrations.sql
-- Description: Table for tracking barber student and instructor registrations and their mapped architecture deployments.

CREATE TABLE IF NOT EXISTS barber_registrations (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    first_name TEXT NOT NULL,
    last_name TEXT NOT NULL,
    email TEXT NOT NULL,
    phone TEXT,
    school_name TEXT NOT NULL,
    school_city TEXT,
    school_state TEXT,
    role TEXT NOT NULL, -- 'student', 'instructor', 'owner'
    status TEXT DEFAULT 'pending', -- 'pending', 'deploying', 'deployed', 'failed'
    project_id UUID REFERENCES projects(id),
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Enable RLS
ALTER TABLE barber_registrations ENABLE ROW LEVEL SECURITY;

-- Policies
CREATE POLICY "Public can insert registrations" 
ON barber_registrations FOR INSERT 
TO public 
WITH CHECK (true);

CREATE POLICY "Super Admins can view all registrations" 
ON barber_registrations FOR SELECT 
TO authenticated 
USING (
    EXISTS (
        SELECT 1 FROM users 
        WHERE users.id = auth.uid() 
        AND users.role = 'super_admin'
    )
);

-- Trigger for updated_at
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ language 'plpgsql';

CREATE TRIGGER update_barber_registrations_updated_at
    BEFORE UPDATE ON barber_registrations
    FOR EACH ROW
    EXECUTE FUNCTION update_updated_at_column();
