ALTER TABLE public.agent_barber_leads ADD COLUMN IF NOT EXISTS embedding vector(768);

CREATE INDEX IF NOT EXISTS agent_barber_leads_embedding_idx ON public.agent_barber_leads USING hnsw (embedding vector_cosine_ops);
