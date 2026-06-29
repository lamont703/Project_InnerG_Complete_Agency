CREATE TABLE IF NOT EXISTS public.crawler_discovered_links (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    source_domain_id UUID REFERENCES public.crawler_seed_domains(id) ON DELETE CASCADE,
    discovered_url TEXT NOT NULL UNIQUE,
    status TEXT NOT NULL DEFAULT 'Pending', -- 'Pending', 'Approved', 'Ignored'
    created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL
);

-- RLS Policies
ALTER TABLE public.crawler_discovered_links ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Allow read access for all users" ON public.crawler_discovered_links
    FOR SELECT USING (true);

CREATE POLICY "Allow insert access for all users" ON public.crawler_discovered_links
    FOR INSERT WITH CHECK (true);

CREATE POLICY "Allow update access for all users" ON public.crawler_discovered_links
    FOR UPDATE USING (true);
