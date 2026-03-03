-- ============================================================
-- Migration 010: Create AI Knowledge / RAG Domain
-- Inner G Complete Agency — Client Intelligence Portal
-- ============================================================
-- Tables: document_embeddings, embedding_jobs
-- Requires: pgvector extension
-- ============================================================

-- Enable pgvector extension (must be done before creating vector columns)
CREATE EXTENSION IF NOT EXISTS vector;

-- DOCUMENT EMBEDDINGS (the RAG vector store)
-- Each row is a chunk of project data that has been embedded.
-- The embedding vector is used for semantic similarity search
-- before sending a message to Gemini.
CREATE TABLE public.document_embeddings (
  id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  project_id      UUID NOT NULL REFERENCES public.projects(id) ON DELETE CASCADE,
  source_table    TEXT NOT NULL,      -- e.g. "campaign_metrics", "ai_signals"
  source_id       UUID NOT NULL,      -- Row ID in the source table
  content_chunk   TEXT NOT NULL,      -- The text that was embedded
  embedding       vector(1536),       -- Gemini text-embedding-004 dimensions
  created_at      TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- IVFFlat index for approximate nearest-neighbor search
-- Build after loading enough rows (>1000 recommended for real clustering)
CREATE INDEX idx_document_embeddings_vector
  ON public.document_embeddings
  USING ivfflat (embedding vector_cosine_ops)
  WITH (lists = 100);

CREATE INDEX idx_document_embeddings_project ON public.document_embeddings(project_id);
CREATE INDEX idx_document_embeddings_source ON public.document_embeddings(source_table, source_id);

-- EMBEDDING JOBS (queue for async RAG pipeline)
-- When new data is inserted (campaign_metrics row, ai_signal, etc.),
-- a trigger queues an embedding job. The process-embedding-jobs cron
-- Edge Function processes the queue and calls Gemini Embeddings API.
CREATE TABLE public.embedding_jobs (
  id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  project_id      UUID NOT NULL REFERENCES public.projects(id) ON DELETE CASCADE,
  source_table    TEXT NOT NULL,
  source_id       UUID NOT NULL,
  status          embed_job_status NOT NULL DEFAULT 'pending',
  error_message   TEXT,
  created_at      TIMESTAMPTZ NOT NULL DEFAULT now(),
  processed_at    TIMESTAMPTZ
);

CREATE INDEX idx_embedding_jobs_pending ON public.embedding_jobs(status, created_at ASC)
  WHERE status = 'pending';
CREATE INDEX idx_embedding_jobs_source ON public.embedding_jobs(source_table, source_id);

-- AUTO-QUEUE: Trigger embedding job when a new campaign_metrics row is inserted
CREATE OR REPLACE FUNCTION queue_embedding_job()
RETURNS TRIGGER AS $$
BEGIN
  INSERT INTO public.embedding_jobs (project_id, source_table, source_id)
  VALUES (
    (SELECT project_id FROM public.campaigns WHERE id = NEW.campaign_id),
    TG_TABLE_NAME,
    NEW.id
  );
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

CREATE TRIGGER campaign_metrics_queue_embedding
  AFTER INSERT ON public.campaign_metrics
  FOR EACH ROW EXECUTE FUNCTION queue_embedding_job();

CREATE TRIGGER ai_signals_queue_embedding
  AFTER INSERT ON public.ai_signals
  FOR EACH ROW EXECUTE FUNCTION queue_embedding_job();

COMMENT ON TABLE public.document_embeddings IS
  'RAG vector store: chunks of project data embedded by Gemini text-embedding-004. Used for semantic search before each AI chat message.';
COMMENT ON COLUMN public.document_embeddings.embedding IS
  'vector(1536) — Gemini text-embedding-004 output. Searched via cosine similarity to find relevant context for each user question.';
COMMENT ON TABLE public.embedding_jobs IS
  'Async queue for the RAG embedding pipeline. Populated by database triggers, processed by process-embedding-jobs cron Edge Function.';
