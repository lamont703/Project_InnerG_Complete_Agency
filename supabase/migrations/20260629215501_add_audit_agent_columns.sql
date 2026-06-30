ALTER TABLE public.scraped_web_pages
ADD COLUMN IF NOT EXISTS audit_status TEXT DEFAULT 'Pending',
ADD COLUMN IF NOT EXISTS audit_score INTEGER,
ADD COLUMN IF NOT EXISTS audit_reasoning TEXT;
