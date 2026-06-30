CREATE TABLE IF NOT EXISTS public.search_engine_queries (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    raw_query TEXT NOT NULL,
    clean_query TEXT NOT NULL,
    total_results INTEGER NOT NULL DEFAULT 0,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL
);

-- RLS Policies
ALTER TABLE public.search_engine_queries ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Allow insert access for all users" ON public.search_engine_queries
    FOR INSERT WITH CHECK (true);

CREATE POLICY "Allow read access for authenticated users" ON public.search_engine_queries
    FOR SELECT USING (auth.role() = 'authenticated');
