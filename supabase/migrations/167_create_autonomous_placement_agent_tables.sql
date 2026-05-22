-- supabase/migrations/167_create_autonomous_placement_agent_tables.sql
-- Create tracking tables for the autonomous placement agents

-- 1. Barbershop SMS Agent tracking table
CREATE TABLE IF NOT EXISTS public.agent_barbershop_leads (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    contact_id TEXT UNIQUE NOT NULL,
    shop_name TEXT,
    owner_name TEXT,
    phone TEXT,
    city TEXT,
    hiring_need BOOLEAN DEFAULT FALSE,
    rent_type TEXT, -- 'Commission' or 'Booth Rent'
    specialty_desired TEXT, -- e.g., 'Tapers & Fades', 'Shaving'
    booth_count_available INTEGER DEFAULT 0,
    last_conversation_history TEXT,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Enable RLS and add basic security policies
ALTER TABLE public.agent_barbershop_leads ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Allow public read access to agent_barbershop_leads" ON public.agent_barbershop_leads FOR SELECT USING (true);
CREATE POLICY "Allow public insert access to agent_barbershop_leads" ON public.agent_barbershop_leads FOR INSERT WITH CHECK (true);
CREATE POLICY "Allow public update access to agent_barbershop_leads" ON public.agent_barbershop_leads FOR UPDATE USING (true);

-- 2. Barber School Email Agent tracking table
CREATE TABLE IF NOT EXISTS public.agent_barber_school_leads (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    contact_id TEXT UNIQUE NOT NULL,
    school_name TEXT,
    director_name TEXT,
    email TEXT,
    city TEXT,
    placement_rate_deficit BOOLEAN DEFAULT FALSE,
    interested_in_placement BOOLEAN DEFAULT FALSE,
    current_student_count INTEGER DEFAULT 0,
    system_used TEXT, -- e.g., 'Klass App', 'Fame', 'Orbund'
    last_conversation_history TEXT,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Enable RLS and add basic security policies
ALTER TABLE public.agent_barber_school_leads ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Allow public read access to agent_barber_school_leads" ON public.agent_barber_school_leads FOR SELECT USING (true);
CREATE POLICY "Allow public insert access to agent_barber_school_leads" ON public.agent_barber_school_leads FOR INSERT WITH CHECK (true);
CREATE POLICY "Allow public update access to agent_barber_school_leads" ON public.agent_barber_school_leads FOR UPDATE USING (true);
