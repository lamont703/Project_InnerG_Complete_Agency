CREATE TABLE IF NOT EXISTS public.platform_tools (
  id uuid DEFAULT gen_random_uuid() PRIMARY KEY,
  name text NOT NULL,
  url text NOT NULL,
  description text NOT NULL,
  embedding vector(768),
  created_at timestamp with time zone DEFAULT timezone('utc'::text, now()) NOT NULL
);

-- Enable RLS
ALTER TABLE public.platform_tools ENABLE ROW LEVEL SECURITY;

-- Allow read access to all users (for search)
CREATE POLICY "Allow public read access to platform_tools"
  ON public.platform_tools
  FOR SELECT
  USING (true);

-- Create HNSW index for fast semantic search
CREATE INDEX IF NOT EXISTS platform_tools_embedding_idx ON public.platform_tools USING hnsw (embedding vector_cosine_ops);
