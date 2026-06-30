ALTER TABLE public.crawler_discovered_links
ADD COLUMN IF NOT EXISTS ai_score INTEGER,
ADD COLUMN IF NOT EXISTS ai_reasoning TEXT;
