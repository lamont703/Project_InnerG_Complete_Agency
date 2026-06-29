CREATE TABLE public.crawler_seed_domains (
    id UUID DEFAULT extensions.uuid_generate_v4() PRIMARY KEY,
    domain_url TEXT NOT NULL UNIQUE,
    status TEXT NOT NULL DEFAULT 'Active' CHECK (status IN ('Active', 'Paused', 'Error')),
    crawl_frequency TEXT NOT NULL DEFAULT 'Weekly' CHECK (crawl_frequency IN ('Daily', 'Weekly', 'Monthly')),
    last_crawled_at TIMESTAMPTZ,
    allowed_paths TEXT,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE public.crawler_logs (
    id UUID DEFAULT extensions.uuid_generate_v4() PRIMARY KEY,
    domain_id UUID REFERENCES public.crawler_seed_domains(id) ON DELETE CASCADE,
    status TEXT NOT NULL CHECK (status IN ('Success', 'Error')),
    details TEXT,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE public.scraped_web_pages (
    id UUID DEFAULT extensions.uuid_generate_v4() PRIMARY KEY,
    domain_id UUID REFERENCES public.crawler_seed_domains(id) ON DELETE CASCADE,
    url TEXT NOT NULL UNIQUE,
    raw_text TEXT NOT NULL,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Triggers for updated_at
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ language 'plpgsql';

CREATE TRIGGER update_crawler_seed_domains_modtime
    BEFORE UPDATE ON public.crawler_seed_domains
    FOR EACH ROW
    EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_scraped_web_pages_modtime
    BEFORE UPDATE ON public.scraped_web_pages
    FOR EACH ROW
    EXECUTE FUNCTION update_updated_at_column();

-- Enable RLS
ALTER TABLE public.crawler_seed_domains ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.crawler_logs ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.scraped_web_pages ENABLE ROW LEVEL SECURITY;

-- Allow public read access for the MVP (or restrict if necessary, but we'll allow anon read for UI)
CREATE POLICY "Enable read access for all users" ON public.crawler_seed_domains FOR SELECT USING (true);
CREATE POLICY "Enable read access for all users" ON public.crawler_logs FOR SELECT USING (true);
CREATE POLICY "Enable read access for all users" ON public.scraped_web_pages FOR SELECT USING (true);

-- Allow service role full access
CREATE POLICY "Enable all access for service role" ON public.crawler_seed_domains USING (true) WITH CHECK (true);
CREATE POLICY "Enable all access for service role" ON public.crawler_logs USING (true) WITH CHECK (true);
CREATE POLICY "Enable all access for service role" ON public.scraped_web_pages USING (true) WITH CHECK (true);
