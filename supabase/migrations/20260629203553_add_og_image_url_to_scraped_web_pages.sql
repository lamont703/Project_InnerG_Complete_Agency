ALTER TABLE public.scraped_web_pages
ADD COLUMN IF NOT EXISTS og_image_url TEXT;
