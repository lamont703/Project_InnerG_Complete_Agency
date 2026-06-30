-- 1. Enable pgvector extension
CREATE EXTENSION IF NOT EXISTS vector;

-- 2. Add embedding column to Barbershops
ALTER TABLE public.agent_barbershop_leads
ADD COLUMN IF NOT EXISTS embedding vector(768);

-- 3. Add embedding column to Scraped Web Pages
ALTER TABLE public.scraped_web_pages
ADD COLUMN IF NOT EXISTS embedding vector(768);

-- 4. Create an HNSW index for fast semantic searching on Barbershops
CREATE INDEX IF NOT EXISTS agent_barbershop_leads_embedding_idx 
ON public.agent_barbershop_leads USING hnsw (embedding vector_cosine_ops);

-- 5. Create an HNSW index for fast semantic searching on Scraped Web Pages
CREATE INDEX IF NOT EXISTS scraped_web_pages_embedding_idx 
ON public.scraped_web_pages USING hnsw (embedding vector_cosine_ops);
